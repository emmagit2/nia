import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import crypto from "node:crypto";

/* ---- helpers (kept in this file so no shared folder is needed) ---- */
const NET_TIMEOUT_MS = 8000;

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

async function readBody(req: Request, max = 900000): Promise<Record<string, any> | null> {
  try {
    const text = await req.text();
    if (text.length > max) return null;
    const data = JSON.parse(text || "{}");
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

/** Signed-in Clerk user id from the Bearer token, or null. Set CLERK_JWT_KEY to verify locally (no network call). */
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
/* ---- end helpers ---- */

const FIELD_TYPES = ["text", "phone", "number", "email", "textarea", "select"];

/** Cleans the extra questions an organizer adds (max 8). */
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

export const config = { path: ["/api/events", "/api/events/*"] };

const MAX_EVENTS = 20;
const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const LIST_COLS = "id, slug, title, description, host_name, event_date, start_time, end_time, venue_name, venue_address, map_link, capacity, max_guests, deadline, registration_open, created_at, custom_fields, visibility, access_code, brand_color, host_about, host_whatsapp, host_instagram";
// the full row includes the logo and cover pictures, so it is only fetched for one event at a time
const COLS = LIST_COLS + ", logo_url, cover_url";
const IMG = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

const toApi = (e: any) => ({
  id: e.id, slug: e.slug, title: e.title, description: e.description, host_name: e.host_name,
  date: e.event_date, start_time: e.start_time?.slice(0, 5) ?? "", end_time: e.end_time?.slice(0, 5) ?? "",
  venue_name: e.venue_name, venue_address: e.venue_address, map_link: e.map_link,
  capacity: e.capacity, max_guests_per_registration: e.max_guests,
  deadline: e.deadline, registration_open: e.registration_open, created_at: e.created_at, custom_fields: e.custom_fields ?? [],
  visibility: e.visibility ?? "public", access_code: e.access_code ?? "", brand_color: e.brand_color ?? "#F2B900",
  host_about: e.host_about ?? "", host_whatsapp: e.host_whatsapp ?? "", host_instagram: e.host_instagram ?? "",
  logo_url: e.logo_url ?? "", cover_url: e.cover_url ?? "",
});

// GET    /api/events                                  -> your events with headcount
// POST   /api/events                                  -> create an event
// PATCH  /api/events/:id                              -> { registration_open } open or close registration
// GET    /api/events/:id/registrations                -> guest list
// GET    /api/events/:id/export.csv                   -> CSV download
// PATCH  /api/events/:id/registrations/:rid           -> { status } confirm, waitlist or cancel a guest
export default async (req: Request) => {
  try {
    const clerkId = await getUserId(req);
    if (!clerkId) return json({ error: "Sign in first." }, 401);

    const [, , id, sub, rid] = new URL(req.url).pathname.split("/").filter(Boolean).map(decodeURIComponent);

    // ----- collection routes -----
    if (!id) {
      if (req.method === "GET") {
        const { data, error } = await supabase
          .from("events").select(LIST_COLS).eq("owner_clerk_id", clerkId).order("created_at", { ascending: false });
        if (error || !data) return json({ error: "Could not load events." }, 500);

        const ids = data.map((e) => e.id);
        const headcount: Record<string, number> = {};
        const regCount: Record<string, number> = {};
        if (ids.length) {
          const { data: rows } = await supabase
            .from("event_registrations").select("event_id, guests, status").in("event_id", ids).neq("status", "cancelled");
          (rows || []).forEach((r) => {
            regCount[r.event_id] = (regCount[r.event_id] || 0) + 1;
            if (r.status === "confirmed") headcount[r.event_id] = (headcount[r.event_id] || 0) + r.guests;
          });
        }
        return json({ events: data.map((e) => ({ ...toApi(e), headcount: headcount[e.id] || 0, registrations: regCount[e.id] || 0 })) });
      }

      if (req.method === "POST") {
        const b = await readBody(req);
        if (!b) return json({ error: "Invalid request." }, 400);

        const title = clean(b.title, 100);
        const date = clean(b.date, 10);
        if (!title) return json({ error: "Event title is required." }, 400);
        if (!DATE.test(date)) return json({ error: "Pick the event date." }, 400);

        const { count } = await supabase
          .from("events").select("id", { count: "exact", head: true }).eq("owner_clerk_id", clerkId);
        if ((count || 0) >= MAX_EVENTS) return json({ error: "Event limit reached." }, 400);

        const start = clean(b.start_time, 5), end = clean(b.end_time, 5), dl = clean(b.deadline, 10);
        const mapLink = clean(b.map_link, 300);
        const cap = parseInt(b.capacity, 10);
        const row = {
          owner_clerk_id: clerkId, title,
          description: clean(b.description, 1000), host_name: clean(b.host_name, 80),
          event_date: date, start_time: TIME.test(start) ? start : null, end_time: TIME.test(end) ? end : null,
          venue_name: clean(b.venue_name, 120), venue_address: clean(b.venue_address, 200),
          map_link: /^https?:\/\//i.test(mapLink) ? mapLink : "", // blocks javascript: links
          capacity: cap > 0 ? Math.min(cap, 100000) : null,
          max_guests: Math.min(Math.max(parseInt(b.max_guests_per_registration, 10) || 1, 1), 20),
          deadline: DATE.test(dl) ? dl : null,
          custom_fields: cleanFields(b.custom_fields),
        };

        for (let i = 0; i < 4; i++) {
          const { data, error } = await supabase.from("events").insert({ ...row, slug: makeSlug() }).select(COLS).single();
          if (!error) return json({ event: { ...toApi(data), headcount: 0, registrations: 0 } });
          console.log("EVENT INSERT ERROR:", error.code, error.message);
          if (error.code !== "23505") break; // only retry on a slug clash
        }
        return json({ error: "Could not create the event." }, 500);
      }
      return json({ error: "Method not allowed" }, 405);
    }

    // ----- everything below is about one event, and it must be yours -----
    if (!UUID.test(id)) return json({ error: "Not found" }, 404);
    const { data: ev } = await supabase
      .from("events").select("id, slug, custom_fields, visibility, access_code").eq("id", id).eq("owner_clerk_id", clerkId).maybeSingle();
    if (!ev) return json({ error: "Not found" }, 404);

    // one event with its logo and cover (used by the "Event page" tab)
    if (!sub && req.method === "GET") {
      const { data: full } = await supabase.from("events").select(COLS).eq("id", id).maybeSingle();
      return json({ event: full ? toApi(full) : null });
    }

    // open or close registration, and edit how the public event page looks
    if (!sub && req.method === "PATCH") {
      const b = await readBody(req);
      if (!b) return json({ error: "Invalid request." }, 400);
      const patch: Record<string, unknown> = {};

      if (typeof b.registration_open === "boolean") patch.registration_open = b.registration_open;
      if (b.visibility === "public" || b.visibility === "private") patch.visibility = b.visibility;
      if (typeof b.access_code === "string") patch.access_code = clean(b.access_code, 20).replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
      if (typeof b.host_name === "string") patch.host_name = clean(b.host_name, 80);
      if (typeof b.host_about === "string") patch.host_about = clean(b.host_about, 500);

      if (typeof b.host_whatsapp === "string") {
        let d = b.host_whatsapp.replace(/\D/g, "");
        if (d.startsWith("0") && d.length === 11) d = "234" + d.slice(1); // Nigerian local format
        if (d && (d.length < 7 || d.length > 15)) return json({ error: "Enter a valid WhatsApp number." }, 400);
        patch.host_whatsapp = d;
      }
      if (typeof b.host_instagram === "string") {
        const h = clean(b.host_instagram, 120).replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?].*$/, "").replace(/^@/, "");
        if (h && !/^[A-Za-z0-9._]{1,30}$/.test(h)) return json({ error: "Enter a valid Instagram name." }, 400);
        patch.host_instagram = h;
      }
      if (typeof b.brand_color === "string") {
        if (!/^#[0-9a-fA-F]{6}$/.test(b.brand_color)) return json({ error: "Pick a valid colour." }, 400);
        patch.brand_color = b.brand_color;
      }
      for (const [key, max] of [["logo_url", 150000], ["cover_url", 600000]] as const) {
        if (typeof b[key] === "string") {
          if (b[key] !== "" && (b[key].length > max || !IMG.test(b[key]))) return json({ error: "That picture is too big or not supported. Try a smaller one." }, 400);
          patch[key] = b[key];
        }
      }

      // a private event always needs an invite code
      const vis = (patch.visibility ?? ev.visibility) as string;
      const code = (patch.access_code ?? ev.access_code) as string;
      if (vis === "private" && !code) patch.access_code = crypto.randomBytes(3).toString("hex").toUpperCase();

      if (!Object.keys(patch).length) return json({ error: "Nothing to update." }, 400);
      const { data: updated, error } = await supabase.from("events").update(patch).eq("id", id).select(LIST_COLS).single();
      if (error || !updated) return json({ error: "Could not update." }, 500);
      return json({ ok: true, event: toApi(updated) });
    }

    if (sub === "registrations" && !rid && req.method === "GET") {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, name, phone, email, guests, message, status, code, created_at, answers")
        .eq("event_id", id).order("created_at", { ascending: false }).limit(2000);
      if (error) return json({ error: "Could not load registrations." }, 500);
      return json({ registrations: data });
    }

    if (sub === "registrations" && rid && req.method === "PATCH") {
      const b = await readBody(req);
      const status = b?.status;
      if (!UUID.test(rid) || !["confirmed", "waitlist", "cancelled"].includes(status)) return json({ error: "Invalid request." }, 400);
      const { error } = await supabase.from("event_registrations").update({ status }).eq("id", rid).eq("event_id", id);
      if (error) {
        console.log("REG UPDATE ERROR:", error.code, error.message);
        return json({ error: error.code === "23505" ? "That phone number already has an active registration." : "Could not update." }, error.code === "23505" ? 409 : 500);
      }
      return json({ ok: true });
    }

    if (sub === "export.csv" && req.method === "GET") {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("name, phone, email, guests, status, code, message, created_at, answers")
        .eq("event_id", id).order("created_at", { ascending: true }).limit(5000);
      if (error || !data) return json({ error: "Could not export." }, 500);
      // prefix risky cells so Excel never runs them as formulas
      const cell = (v: unknown) => `"${String(v ?? "").replace(/^[=+\-@]/, "'$&").replace(/"/g, '""')}"`;
      const fields: any[] = Array.isArray(ev.custom_fields) ? ev.custom_fields : [];
      const head = ["Name", "Phone", "Email", "Guests", "Status", "Code", "Note", "Registered at", ...fields.map((f) => f.label)].map(cell).join(",");
      const lines = data.map((r: any) =>
        [r.name, r.phone, r.email, r.guests, r.status, r.code, r.message, r.created_at, ...fields.map((f) => r.answers?.[f.id] ?? "")].map(cell).join(","));
      return new Response([head, ...lines].join("\n"), {
        headers: { "Content-Type": "text/csv; charset=utf-8" },
      });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e: any) {
    console.log("EVENTS FAILED:", e?.message || e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
};