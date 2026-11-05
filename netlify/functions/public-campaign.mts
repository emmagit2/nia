import type { Config, Context } from "@netlify/functions";
import { supabase, json, clean } from "../lib/leads";

// Public: the page a customer sees after scanning the QR.
export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const { data } = await supabase
    .from("lead_campaigns")
    .select("business_name, headline, services")
    .eq("slug", clean(context.params?.slug, 20))
    .maybeSingle();
  if (!data) return json({ error: "This link is not active." }, 404);
  return json({ campaign: data });
};

export const config: Config = { path: "/api/public/campaign/:slug" };
