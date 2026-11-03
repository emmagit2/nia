import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Protect with a secret to prevent unauthorized calls
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date().toISOString();

  // Reset credits for expired plans
  const { data: expiredUsers, error } = await supabase
    .from("users")
    .select("id, plan")
    .lte("month_reset_date", now)
    .not("plan", "eq", "none");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!expiredUsers || expiredUsers.length === 0) {
    return res.status(200).json({ message: "No users to reset", count: 0 });
  }

  const ids = expiredUsers.map((u) => u.id);

  await supabase
    .from("users")
    .update({
      credits_left: 0,
      plan: "none",
      total_credits: 0,
      month_reset_date: null,
    })
    .in("id", ids);

  return res.status(200).json({ message: "Reset complete", count: ids.length });
}
