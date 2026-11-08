import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import crypto from "node:crypto";

/* ---- helpers (kept in this file so no shared folder is needed) ---- */
const NET_TIMEOUT_MS = 8000;
const TZ = "Africa/Lagos";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(NET_TIMEOUT_MS) }),
  },
});

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F<>]/g, " ").trim().slice(0, max) : "";

const makeSlug = () =>
  crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8).toLowerCase();

async function readBody(req: Request, max = 20000): Promise<Record<string, any> | null> {
  try {
    const text = await req.text();
    if (text.length > max) return null;
    const data = JSON.parse(text || "{}");
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

async function getUserId(req: Request): Promise<string | null> {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return null;
    const jwtKey = process.env.CLERK_JWT_KEY?.replace(/\\n/g, "\n");
    const r: any = await withTimeout(
      verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY!, ...(jwtKey ? { jwtKey } : {}) }),
      NET_TIMEOUT_MS,
      "Clerk verifyToken",
    );
    if (r?.errors?.length) return null;
    const payload = r?.data ?? r;
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch (e: any) {
    console.log("CLERK VERIFY THREW:", e?.message || e);
    return null;
  }
}

const FIELD_TYPES = ["text", "phone", "number", "email", "textarea", "select"];
function cleanFields(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: any[] = [];
  for (const f of raw.slice(0, 8)) {
    const label = clean(f?.label, 60);
    if (!label) continue;
    const type = FIELD_TYPES.includes(f?.type) ? f.type : "text";
    let id = String(f?.id ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    if (!id || seen.has(id)) id = "f" + crypto.randomBytes(3).toString("hex");
    seen.add(id);
    const options = type === "select" && Array.isArray(f?.options) ? f.options.map((o: unknown) => clean(o, 40)).filter(Boolean).slice(0, 12) : [];
    if (type === "select" && options.length < 2) continue;
    out.push({ id, label, type, required: !!f?.required, options });
  }
  return out;
}
/* ---- end helpers ---- */

export const config = { path: ["/api/bookings", "/api/bookings/*"] };

const MAX_PAGES = 10;
const UUID = /^[0-9a-f-]{36}$/i;
const TIME = /^\d{2}:\d{2}$/;
const SLOT_OPTIONS = [15, 20, 30, 45, 60, 90, 120, 180];
const COLS = "id, slug, business_name, headline, services, days, open_time, close_time, slot_minutes, max_per_slot, advance_days, custom_fields, is_active, created_at";
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

const toApi = (p: any) => ({
  id: p.id, slug: p.slug, business_name: p.business_name, headline: p.headline, services: p.services ?? [],
  days: p.days ?? [], open_time: String(p.open_time).slice(0, 5), close_time: String(p.close_time).slice(0, 5),
  slot_minutes: p.slot_minutes, max_per_slot: p.max_per_slot, advance_days: p.advance_days,
  custom_fields: p.custom_fields ?? [], is_active: p.is_active, created_at: p.created_at,
});

// GET   /api/bookings                                  -> your booking pages
// POST  /api/bookings                                  -> create a booking page
// PATCH /api/bookings/:id                              -> { is_active } pause or resume bookings
// GET   /api/bookings/:id/appointments                 -> appointments
// PATCH /api/bookings/:id/appointments/:aid            -> { status } confirmed, done or cancelled
// GET   /api/bookings/:id/export.csv                   -> CSV download
export default async (req: Request) => {
  try {
    const clerkId = await getUserId(req);
    if (!clerkId) return json({ error: "Sign in first." }, 401);

    const [, , id, sub, aid] = new URL(req.url).pathname.split("/").filter(Boolean).map(decodeURIComponent);

    if (!id) {
      if (req.method === "GET") {
        const { data, error } = await supabase
          .from("booking_pages").select(COLS).eq("owner_clerk_id", clerkId).order("created_at", { ascending: false });
        if (error || !data) return json({ error: "Could not load booking pages." }, 500);

        const ids = data.map((p) => p.id);
        const upcoming: Record<string, number> = {};
        if (ids.length) {
          const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
          const { data: rows } = await supabase
            .from("bookings").select("page_id").in("page_id", ids).eq("status", "confirmed").gte("booking_date", today);
          (rows || []).forEach((r) => (upcoming[r.page_id] = (upcoming[r.page_id] || 0) + 1));
        }
        return json({ pages: data.map((p) => ({ ...toApi(p), upcoming: upcoming[p.id] || 0 })) });
      }

      if (req.method === "POST") {
        const b = await readBody(req);
        if (!b) return json({ error: "Invalid request." }, 400);

        const business_name = clean(b.business_name, 80);
        if (!business_name) return json({ error: "Business name is required." }, 400);

        const days = Array.from(new Set((Array.isArray(b.days) ? b.days : []).map(Number).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6))).sort();
        if (!days.length) return json({ error: "Pick at least one open day." }, 400);

        const open = clean(b.open_time, 5), close = clean(b.close_time, 5);
        if (!TIME.test(open) || !TIME.test(close) || toMin(open) >= toMin(close)) return json({ error: "Closing time must be after opening time." }, 400);

        const slot = Number(b.slot_minutes);
        if (!SLOT_OPTIONS.includes(slot)) return json({ error: "Pick an appointment length." }, 400);
        if (toMin(close) - toMin(open) < slot) return json({ error: "Your opening hours are shorter than one appointment." }, 400);

        const { count } = await supabase
          .from("booking_pages").select("id", { count: "exact", head: true }).eq("owner_clerk_id", clerkId);
        if ((count || 0) >= MAX_PAGES) return json({ error: "Booking page limit reached." }, 400);

        const row = {
          owner_clerk_id: clerkId, business_name, headline: clean(b.headline, 140),
          services: (Array.isArray(b.services) ? b.services : []).map((s: unknown) => clean(s, 40)).filter(Boolean).slice(0, 8),
          days, open_time: open, close_time: close, slot_minutes: slot,
          max_per_slot: Math.min(Math.max(parseInt(b.max_per_slot, 10) || 1, 1), 20),
          advance_days: Math.min(Math.max(parseInt(b.advance_days, 10) || 30, 1), 90),
          custom_fields: cleanFields(b.custom_fields),
        };

        for (let i = 0; i < 4; i++) {
          const { data, error } = await supabase.from("booking_pages").insert({ ...row, slug: makeSlug() }).select(COLS).single();
          if (!error) return json({ page: { ...toApi(data), upcoming: 0 } });
          console.log("BOOKING PAGE INSERT ERROR:", error.code, error.message);
          if (error.code !== "23505") break;
        }
        return json({ error: "Could not create the booking page." }, 500);
      }
      return json({ error: "Method not allowed" }, 405);
    }

    if (!UUID.test(id)) return json({ error: "Not found" }, 404);
    const { data: pg } = await supabase
      .from("booking_pages").select("id, slug, business_name, custom_fields").eq("id", id).eq("owner_clerk_id", clerkId).maybeSingle();
    if (!pg) return json({ error: "Not found" }, 404);

    if (!sub && req.method === "PATCH") {
      const b = await readBody(req);
      if (!b || typeof b.is_active !== "boolean") return json({ error: "Invalid request." }, 400);
      const { error } = await supabase.from("booking_pages").update({ is_active: b.is_active }).eq("id", id);
      if (error) return json({ error: "Could not update." }, 500);
      return json({ ok: true });
    }

    if (sub === "appointments" && !aid && req.method === "GET") {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, name, phone, service, booking_date, start_time, message, answers, status, code, created_at")
        .eq("page_id", id).order("booking_date", { ascending: false }).order("start_time", { ascending: false }).limit(2000);
      if (error) return json({ error: "Could not load appointments." }, 500);
      return json({
        appointments: (data || []).map((a) => ({ ...a, date: a.booking_date, time: String(a.start_time).slice(0, 5) })),
      });
    }

    if (sub === "appointments" && aid && req.method === "PATCH") {
      const b = await readBody(req);
      const status = b?.status;
      if (!UUID.test(aid) || !["confirmed", "done", "cancelled"].includes(status)) return json({ error: "Invalid request." }, 400);
      const { error } = await supabase.from("bookings").update({ status }).eq("id", aid).eq("page_id", id);
      if (error) {
        console.log("BOOKING UPDATE ERROR:", error.code, error.message);
        return json({ error: error.code === "23505" ? "That time already has a confirmed booking for this person." : "Could not update." }, error.code === "23505" ? 409 : 500);
      }
      return json({ ok: true });
    }

    if (sub === "export.csv" && req.method === "GET") {
      const { data, error } = await supabase
        .from("bookings")
        .select("name, phone, service, booking_date, start_time, status, code, message, created_at, answers")
        .eq("page_id", id).order("booking_date", { ascending: true }).order("start_time", { ascending: true }).limit(5000);
      if (error || !data) return json({ error: "Could not export." }, 500);
      const cell = (v: unknown) => `"${String(v ?? "").replace(/^[=+\-@]/, "'$&").replace(/"/g, '""')}"`;
      const fields: any[] = Array.isArray(pg.custom_fields) ? pg.custom_fields : [];
      const head = ["Name", "Phone", "Service", "Date", "Time", "Status", "Code", "Note", "Booked at", ...fields.map((f) => f.label)].map(cell).join(",");
      const lines = data.map((r: any) =>
        [r.name, r.phone, r.service, r.booking_date, String(r.start_time).slice(0, 5), r.status, r.code, r.message, r.created_at, ...fields.map((f) => r.answers?.[f.id] ?? "")].map(cell).join(","));
      return new Response([head, ...lines].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8" } });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e: any) {
    console.log("BOOKINGS FAILED:", e?.message || e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
};