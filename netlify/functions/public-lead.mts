import type { Config, Context } from "@netlify/functions";
import { supabase, json, clean, readBody, hashIp } from "../lib/leads";

// Public: a customer sends their details. No login.
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const b = await readBody(req);
  if (!b) return json({ error: "Invalid request." }, 400);
  if (b.website) return json({ ok: true }); // honeypot: bots fill it, people never see it

  const name = clean(b.name, 80);
  const phone = clean(b.phone, 20);
  const digits = phone.replace(/\D/g, "");
  if (!name) return json({ error: "Please enter your name." }, 400);
  if (digits.length < 7 || digits.length > 15) return json({ error: "Enter a valid phone number." }, 400);

  const { data: camp } = await supabase
    .from("lead_campaigns")
    .select("id")
    .eq("slug", clean(context.params?.slug, 20))
    .maybeSingle();
  if (!camp) return json({ error: "This link is not active." }, 404);

  // Rate limits stored in the database (serverless has no shared memory)
  const ip_hash = hashIp(context.ip || "unknown");
  const tenMin = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const oneMin = new Date(Date.now() - 60 * 1000).toISOString();

  const { count: ipCount } = await supabase
    .from("leads").select("id", { count: "exact", head: true })
    .eq("ip_hash", ip_hash).gte("created_at", tenMin);
  if ((ipCount || 0) >= 5) return json({ error: "Too many tries. Wait a few minutes." }, 429);

  const { count: campCount } = await supabase
    .from("leads").select("id", { count: "exact", head: true })
    .eq("campaign_id", camp.id).gte("created_at", oneMin);
  if ((campCount || 0) >= 30) return json({ error: "Busy right now. Try again in a minute." }, 429);

  // same phone, same campaign, within an hour: treat as a double tap
  const hour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: dupe } = await supabase
    .from("leads").select("id")
    .eq("campaign_id", camp.id).eq("phone", phone).gte("created_at", hour).limit(1);
  if (dupe?.length) return json({ ok: true });

  const lat = Number(b.lat);
  const lng = Number(b.lng);
  const hasGeo =
    b.lat != null && b.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const { error } = await supabase.from("leads").insert({
    campaign_id: camp.id,
    name,
    phone,
    location_text: clean(b.locationText, 120) || null,
    lat: hasGeo ? lat : null,
    lng: hasGeo ? lng : null,
    interest: clean(b.interest, 40) || null,
    message: clean(b.message, 300) || null,
    ip_hash,
  });
  if (error) return json({ error: "Could not send. Try again." }, 500);
  return json({ ok: true });
};

export const config: Config = { path: "/api/public/lead/:slug" };
