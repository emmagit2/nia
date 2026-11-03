import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clerkId } = req.body as { clerkId: string };
  if (!clerkId) return res.status(400).json({ error: "Missing clerkId" });

  const { data: user } = await supabase
    .from("users")
    .select("credits_left")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (!user) return res.status(404).json({ error: "User not found" });

  await supabase
    .from("users")
    .update({ credits_left: user.credits_left + 1 })
    .eq("clerk_id", clerkId);

  return res.status(200).json({ success: true, credits_left: user.credits_left + 1 });
}
