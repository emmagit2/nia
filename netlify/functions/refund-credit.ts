 import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let clerkId: string | undefined;
  try {
    const body = await req.json();
    clerkId = body?.clerkId;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!clerkId) return json({ error: "Missing clerkId" }, 400);

  const { data: user } = await supabase
    .from("users")
    .select("credits_left")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (!user) return json({ error: "User not found" }, 404);

  const newCredits = user.credits_left + 1;

  const { error } = await supabase
    .from("users")
    .update({ credits_left: newCredits })
    .eq("clerk_id", clerkId);

  if (error) return json({ error: error.message }, 500);

  return json({ success: true, credits_left: newCredits });
};