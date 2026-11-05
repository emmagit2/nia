import { supabase, json, clean, makeSlug, readBody, getUserId } from "./lib/leads";

const MAX_CAMPAIGNS = 20;

export default async (req: Request) => {
  const clerkId = await getUserId(req);
  if (!clerkId) return json({ error: "Sign in first." }, 401);

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("lead_campaigns")
      .select("id, slug, business_name, headline, services, created_at")
      .eq("owner_clerk_id", clerkId)
      .order("created_at", { ascending: false });
    if (error || !data) return json({ error: "Could not load campaigns." }, 500);

    const ids = data.map((c) => c.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: rows } = await supabase.from("leads").select("campaign_id").in("campaign_id", ids);
      (rows || []).forEach((r) => (counts[r.campaign_id] = (counts[r.campaign_id] || 0) + 1));
    }
    return json({ campaigns: data.map((c) => ({ ...c, lead_count: counts[c.id] || 0 })) });
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    if (!body) return json({ error: "Invalid request." }, 400);

    const business_name = clean(body.businessName, 80);
    const headline = clean(body.headline, 140);
    const services = Array.isArray(body.services)
      ? body.services.map((s: unknown) => clean(s, 40)).filter(Boolean).slice(0, 8)
      : [];
    if (!business_name) return json({ error: "Business name is required." }, 400);

    const { count } = await supabase
      .from("lead_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("owner_clerk_id", clerkId);
    if ((count || 0) >= MAX_CAMPAIGNS) return json({ error: "Campaign limit reached." }, 400);

    for (let i = 0; i < 4; i++) {
      const { data, error } = await supabase
        .from("lead_campaigns")
        .insert({ owner_clerk_id: clerkId, slug: makeSlug(), business_name, headline, services })
        .select("id, slug, business_name, headline, services")
        .single();
      if (!error) return json({ campaign: { ...data, lead_count: 0 } });
      if (error.code !== "23505") break; // only retry on a slug clash
    }
    return json({ error: "Could not create the campaign." }, 500);
  }

  return json({ error: "Method not allowed" }, 405);
};
