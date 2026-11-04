import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY!;

const ASPECT_RATIOS: Record<string, string> = {
  Logo: "ASPECT_1_1",
  Flyer: "ASPECT_3_4",
  "Social Post": "ASPECT_1_1",
  "Business Card": "ASPECT_16_9",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: {
    businessName?: string;
    type?: string;
    description?: string;
    clerkId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { businessName, type, description, clerkId } = body;

  if (!clerkId || !businessName) {
    return json({ error: "Missing required fields" }, 400);
  }

  // Get user from Supabase
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (userError || !user) {
    return json({ error: "User not found" }, 404);
  }

  if (user.credits_left < 1) {
    return json({ error: "No credits left" }, 402);
  }

  // Deduct credit immediately
  const { error: deductError } = await supabase
    .from("users")
    .update({ credits_left: user.credits_left - 1 })
    .eq("clerk_id", clerkId);

  if (deductError) {
    return json({ error: "Failed to deduct credit" }, 500);
  }

  try {
    const designType = type || "Logo";
    const aspectRatio = ASPECT_RATIOS[designType] ?? "ASPECT_1_1";

    const prompt = `Professional Nigerian business ${designType} for ${businessName}. ${description ?? ""}. Clean modern layout, correct spelling, high detail, 4K quality. Nigerian business aesthetic.`.trim();

    const ideogramRes = await fetch("https://api.ideogram.ai/generate", {
      method: "POST",
      headers: {
        "Api-Key": IDEOGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_request: {
          prompt,
          model: "V_2",
          aspect_ratio: aspectRatio,
          num_images: 1,
          magic_prompt_option: "AUTO",
        },
      }),
    });

    if (!ideogramRes.ok) {
      const errText = await ideogramRes.text();
      throw new Error(`Ideogram API error: ${errText}`);
    }

    const ideogramData = (await ideogramRes.json()) as {
      data: Array<{ url: string }>;
    };

    const imageUrl = ideogramData.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image returned from Ideogram");

    // Save to generations table
    await supabase.from("generations").insert({
      user_id: user.id,
      prompt,
      image_url: imageUrl,
      design_type: designType,
      business_name: businessName,
      credits_used: 1,
    });

    return json({
      image_url: imageUrl,
      credits_left: user.credits_left - 1,
    });
  } catch (err) {
    console.error("Generate error:", err);
    // Refund the credit on failure
    await supabase
      .from("users")
      .update({ credits_left: user.credits_left })
      .eq("clerk_id", clerkId);

    return json({ error: "AI generation failed. Credit refunded." }, 500);
  }
};