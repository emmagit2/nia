import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

/* ---- helpers (kept in this file so no shared folder is needed) ---- */
const NET_TIMEOUT_MS = 8000;
const TZ = "Africa/Lagos"; // "today" and "now" are judged in Lagos time

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

function cleanAnswers(fields: any[] | null, raw: unknown): Record<string, string> | string {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, string> = {};
  for (const f of fields || []) {
    const v = clean(src[f.id], f.type === "textarea" ? 300 : 120);
    if (!v) {
      if (f.required) return `${f.label} is required.`;
      continue;
    }
    if (f.type === "phone" && v.replace(/\D/g, "").length < 7) return `Enter a valid ${String(f.label).toLowerCase()}.`;
    if (f.type === "email" && !/^\S+@\S+\.\S+$/.test(v)) return `Enter a valid ${String(f.label).toLowerCase()}.`;
    if (f.type === "number" && !/^-?\d+(\.\d+)?$/.test(v)) return `${f.label} must be a number.`;
    if (f.type === "select" && !(f.options || []).includes(v)) return `Pick a valid option for ${f.label}.`;
    out[f.id] = v;
  }
  return out;
}
/* ---- end helpers ---- */

export const config = { path: "/api/public/booking/*" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const addDays = (d: string, n: number) => {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

/** Every start time in a day, e.g. 09:00, 10:00 ... the last one must finish before closing. */
const slotTimes = (p: any): string[] => {
  const out: string[] = [];
  const open = toMin(String(p.open_time).slice(0, 5)), close = toMin(String(p.close_time).slice(0, 5));
  for (let m = open; m + p.slot_minutes <= close; m += p.slot_minutes) out.push(fromMin(m));
  return out;
};

// GET  /api/public/booking/:slug[?date=YYYY-MM-DD]  -> page details (and that day's slots)
// POST /api/public/booking/:slug/book                -> book an appointment
export default async (req: Request) => {
  try {
    const url = new URL(req.url);
    const seg = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const slug = seg[3];
    const action = seg[4];
    if (!slug) return json({ error: "Booking page not found" }, 404);

    const { data: p } = await supabase
      .from("booking_pages")
      .select("id, business_name, headline, services, days, open_time, close_time, slot_minutes, max_per_slot, advance_days, custom_fields, is_active")
      .eq("slug", slug).maybeSingle();
    if (!p) return json({ error: "Booking page not found" }, 404);

    const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
    const nowHM = new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

    /** Returns an error message if the date cannot be booked, otherwise null. */
    const dateError = (date: string): string | null => {
      if (!DATE.test(date)) return "Pick a date.";
      if (date < today) return "That date has passed.";
      if (date > addDays(today, p.advance_days)) return "That date is too far ahead.";
      if (!(p.days || []).includes(new Date(date + "T00:00:00Z").getUTCDay())) return "Closed on that day.";
      return null;
    };
    const isPast = (date: string, time: string) => date === today && time <= nowHM;

    if (req.method === "GET") {
      const out: Record<string, unknown> = {
        page: {
          business_name: p.business_name, headline: p.headline, services: p.services ?? [], days: p.days ?? [],
          advance_days: p.advance_days, slot_minutes: p.slot_minutes, custom_fields: p.custom_fields ?? [], closed: !p.is_active,
        },
      };
      const date = url.searchParams.get("date");
      if (date) {
        if (dateError(date)) {
          out.slots = [];
        } else {
          const { data: rows } = await supabase
            .from("bookings").select("start_time").eq("page_id", p.id).eq("booking_date", date).eq("status", "confirmed");
          const taken: Record<string, number> = {};
          (rows || []).forEach((r) => { const t = String(r.start_time).slice(0, 5); taken[t] = (taken[t] || 0) + 1; });
          out.slots = slotTimes(p).filter((t) => !isPast(date, t)).map((t) => ({ time: t, left: Math.max(0, p.max_per_slot - (taken[t] || 0)) }));
        }
      }
      return json(out);
    }

    if (req.method === "POST" && action === "book") {
      const body = await readBody(req);
      if (!body) return json({ error: "Invalid request." }, 400);
      if (clean(body.website, 50)) return json({ ok: true }); // honeypot
      if (!p.is_active) return json({ error: "Bookings are paused right now." }, 400);

      const name = clean(body.name, 80);
      const phone = clean(body.phone, 20);
      const digits = phone.replace(/\D/g, "");
      const service = clean(body.service, 40);
      const date = clean(body.date, 10);
      const time = clean(body.time, 5);
      const message = clean(body.message, 300);

      if (!name) return json({ error: "Please enter your name." }, 400);
      if (digits.length < 7) return json({ error: "Enter a valid phone number." }, 400);
      if ((p.services || []).length && !(p.services as string[]).includes(service)) return json({ error: "Pick a service." }, 400);
      const de = dateError(date);
      if (de) return json({ error: de }, 400);
      if (!slotTimes(p).includes(time) || isPast(date, time)) return json({ error: "Pick an available time." }, 400);
      const answers = cleanAnswers(p.custom_fields, body.answers);
      if (typeof answers === "string") return json({ error: answers }, 400);

      const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "unknown";
      const ip_hash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("bookings").select("id", { count: "exact", head: true }).eq("ip_hash", ip_hash).gte("created_at", since);
      if ((count || 0) >= 8) return json({ error: "Too many attempts. Try again in a few minutes." }, 429);

      for (let i = 0; i < 3; i++) {
        const code = crypto.randomBytes(3).toString("hex").toUpperCase();
        const { data, error } = await supabase.rpc("book_slot", {
          p_page_id: p.id, p_name: name, p_phone: phone, p_digits: digits, p_service: service,
          p_date: date, p_time: time, p_message: message, p_answers: answers, p_code: code, p_ip_hash: ip_hash,
        });
        if (!error) {
          const row = Array.isArray(data) ? data[0] : data;
          return json({ ok: true, code: row.out_code, date, time });
        }
        if (error.message?.includes("slot_taken")) return json({ error: "Sorry, that time was just taken. Pick another time." }, 409);
        if (error.code !== "23505") {
          console.log("BOOK ERROR:", error.code, error.message);
          break;
        }
        const { data: dup } = await supabase
          .from("bookings").select("code").eq("page_id", p.id).eq("booking_date", date).eq("start_time", time)
          .eq("phone_digits", digits).eq("status", "confirmed").maybeSingle();
        if (dup) return json({ error: `You already booked this time. Your code: ${dup.code}` }, 409);
      }
      return json({ error: "Could not book. Please try again." }, 500);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e: any) {
    console.log("PUBLIC-BOOKING FAILED:", e?.message || e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
};