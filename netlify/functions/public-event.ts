import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

/* ---- helpers (kept in this file so no shared folder is needed) ---- */
const NET_TIMEOUT_MS = 8000;
const TZ = "Africa/Lagos"; // used to decide when a registration deadline has passed

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(NET_TIMEOUT_MS) }),
  },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F<>]/g, " ").trim().slice(0, max) : "";

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
/* ---- end helpers ---- */

export const config = { path: "/api/public/event/*" };

// GET  /api/public/event/:slug            -> event details + spots left (no login)
// POST /api/public/event/:slug/register   -> register a guest (no login)
export default async (req: Request) => {
  try {
    const seg = new URL(req.url).pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const slug = seg[3];
    const action = seg[4];
    if (!slug) return json({ error: "Event not found" }, 404);

    const { data: e } = await supabase
      .from("events")
      .select("id, slug, title, description, host_name, event_date, start_time, end_time, venue_name, venue_address, map_link, capacity, max_guests, deadline, registration_open")
      .eq("slug", slug)
      .maybeSingle();
    if (!e) return json({ error: "Event not found" }, 404);

    const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
    const closed = !e.registration_open || (!!e.deadline && today > e.deadline);

    const { data: rows } = await supabase
      .from("event_registrations").select("guests").eq("event_id", e.id).eq("status", "confirmed");
    const taken = (rows || []).reduce((s, r) => s + r.guests, 0);

    if (req.method === "GET" && !action) {
      return json({
        event: {
          title: e.title, description: e.description, host_name: e.host_name,
          date: e.event_date, start_time: e.start_time?.slice(0, 5) ?? "", end_time: e.end_time?.slice(0, 5) ?? "",
          venue_name: e.venue_name, venue_address: e.venue_address, map_link: e.map_link,
          max_guests_per_registration: e.max_guests, closed,
          spots_left: e.capacity === null ? null : Math.max(0, e.capacity - taken),
        },
      });
    }

    if (req.method === "POST" && action === "register") {
      const body = await readBody(req);
      if (!body) return json({ error: "Invalid request." }, 400);
      if (clean(body.website, 50)) return json({ ok: true }); // honeypot: pretend it worked

      if (closed) return json({ error: "Registration is closed for this event." }, 400);

      const name = clean(body.name, 80);
      const phone = clean(body.phone, 20);
      const digits = phone.replace(/\D/g, "");
      const email = clean(body.email, 120);
      const message = clean(body.message, 300);
      const guests = Math.min(Math.max(parseInt(body.guests, 10) || 1, 1), e.max_guests);
      if (!name) return json({ error: "Please enter your name." }, 400);
      if (digits.length < 7) return json({ error: "Enter a valid phone number." }, 400);

      // rate limit: 8 registrations per 10 minutes per visitor (stored as a hash, never the raw IP)
      const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "unknown";
      const ip_hash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("event_registrations").select("id", { count: "exact", head: true })
        .eq("ip_hash", ip_hash).gte("created_at", since);
      if ((count || 0) >= 8) return json({ error: "Too many attempts. Try again in a few minutes." }, 429);

      for (let i = 0; i < 3; i++) {
        const code = crypto.randomBytes(3).toString("hex").toUpperCase();
        const { data, error } = await supabase.rpc("register_for_event", {
          p_event_id: e.id, p_name: name, p_phone: phone, p_digits: digits, p_email: email,
          p_guests: guests, p_message: message, p_code: code, p_ip_hash: ip_hash,
        });
        if (!error) {
          const row = Array.isArray(data) ? data[0] : data;
          return json({ ok: true, status: row.out_status, code: row.out_code });
        }
        if (error.code !== "23505") {
          console.log("REGISTER ERROR:", error.code, error.message);
          break;
        }
        // unique clash: either this phone is already registered, or the random code collided
        const { data: dup } = await supabase
          .from("event_registrations").select("code")
          .eq("event_id", e.id).eq("phone_digits", digits).neq("status", "cancelled").maybeSingle();
        if (dup) return json({ error: `This number is already registered. Your code: ${dup.code}` }, 409);
      }
      return json({ error: "Could not register. Please try again." }, 500);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e: any) {
    console.log("PUBLIC-EVENT FAILED:", e?.message || e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
};