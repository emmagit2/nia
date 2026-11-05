import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";

/* ---- helpers (kept in this file so no shared folder is needed) ---- */
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Last piece of the URL path, e.g. /api/leads/abc123 -> abc123 */
const lastSegment = (req: Request) => {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || "");
};

/** Signed-in Clerk user id from the Bearer token, or null. Never trust an id sent in the body. */
async function getUserId(req: Request): Promise<string | null> {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return null;
    const r: any = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    if (r?.errors?.length) return null; // newer Clerk versions return { data, errors }
    const payload = r?.data ?? r;
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function myCampaignIds(clerkId: string): Promise<string[]> {
  const { data } = await supabase.from("lead_campaigns").select("id").eq("owner_clerk_id", clerkId);
  return (data || []).map((c) => c.id);
}
/* ---- end helpers ---- */

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
