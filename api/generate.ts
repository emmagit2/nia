import type { VercelRequest, VercelResponse } from "@vercel/node";
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { businessName, type, description, clerkId } = req.body as {
    businessName: string;
    type: string;
    description: string;
    clerkId: string;
  };

  if (!clerkId || !businessName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Get user from Supabase
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (userError || !user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (user.credits_left < 1) {
    return res.status(402).json({ error: "No credits left" });
  }

  // Deduct credit immediately
  const { error: deductError } = await supabase
    .from("users")
    .update({ credits_left: user.credits_left - 1 })
    .eq("clerk_id", clerkId);

  if (deductError) {
    return res.status(500).json({ error: "Failed to deduct credit" });
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

    const ideogramData = await ideogramRes.json() as {
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

    return res.status(200).json({
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

    return res.status(500).json({ error: "AI generation failed. Credit refunded." });
  }
}
