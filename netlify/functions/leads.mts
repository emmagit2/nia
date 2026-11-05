import { supabase, json, getUserId, myCampaignIds, lastSegment } from "./lib/leads";

// GET /api/leads            -> your leads (optional ?campaignId=...)
// DELETE /api/leads/:id     -> delete one of your leads
export default async (req: Request) => {
  const clerkId = await getUserId(req);
  if (!clerkId) return json({ error: "Sign in first." }, 401);

  let ids = await myCampaignIds(clerkId);

  if (req.method === "GET") {
    const wanted = new URL(req.url).searchParams.get("campaignId");
    if (wanted) ids = ids.filter((id) => id === wanted); // only your own campaigns
    if (!ids.length) return json({ leads: [] });

    const { data, error } = await supabase
      .from("leads")
      .select("id, campaign_id, name, phone, location_text, lat, lng, interest, message, created_at")
      .in("campaign_id", ids)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) return json({ error: "Could not load leads." }, 500);
    return json({ leads: data });
  }

  if (req.method === "DELETE") {
    const id = lastSegment(req);
    if (!id || id === "leads") return json({ error: "Missing lead id." }, 400);
    if (!ids.length) return json({ ok: true });
    const { error } = await supabase.from("leads").delete().eq("id", id).in("campaign_id", ids);
    if (error) return json({ error: "Could not delete." }, 500);
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
};
