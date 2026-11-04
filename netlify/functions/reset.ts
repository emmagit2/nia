 import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async () => {
  const now = new Date().toISOString();

  // Find users whose plan has expired
  const { data: expiredUsers, error } = await supabase
    .from("users")
    .select("id, plan")
    .lte("month_reset_date", now)
    .not("plan", "eq", "none");

  if (error) {
    console.error("Select failed:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!expiredUsers || expiredUsers.length === 0) {
    return new Response(JSON.stringify({ message: "No users to reset", count: 0 }));
  }

  const ids = expiredUsers.map((u) => u.id);

  // Reset credits for expired plans
  const { error: updateError } = await supabase
    .from("users")
    .update({
      credits_left: 0,
      plan: "none",
      total_credits: 0,
      month_reset_date: null,
    })
    .in("id", ids);

  if (updateError) {
    console.error("Update failed:", updateError.message);
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ message: "Reset complete", count: ids.length }));
};

// Runs every day at midnight UTC
export const config = {
  schedule: "0 0 * * *",
};