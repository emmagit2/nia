import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

const AMOUNT_TO_CREDITS: Record<number, { credits: number; plan: string | null }> = {
  600000: { credits: 30, plan: "starter" },
  1200000: { credits: 70, plan: "hustler" },
  1600000: { credits: 95, plan: "boss" },
  200000: { credits: 10, plan: null },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { reference, clerk_id } = req.body as {
    reference: string;
    clerk_id: string;
  };

  if (!reference || !clerk_id) {
    return res.status(400).json({ error: "Missing reference or clerk_id" });
  }

  try {
    // Verify with Paystack
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    if (!paystackRes.ok) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const paystackData = await paystackRes.json() as {
      status: boolean;
      data: {
        status: string;
        amount: number;
        customer: { customer_code: string };
      };
    };

    if (!paystackData.status || paystackData.data.status !== "success") {
      return res.status(400).json({ error: "Payment not successful" });
    }

    const amount = paystackData.data.amount;
    const mapping = AMOUNT_TO_CREDITS[amount];

    if (!mapping) {
      return res.status(400).json({ error: "Unknown payment amount" });
    }

    const { credits, plan } = mapping;
    const customerCode = paystackData.data.customer?.customer_code;

    // Get current user
    const { data: user } = await supabase
      .from("users")
      .select("credits_left, total_credits")
      .eq("clerk_id", clerk_id)
      .maybeSingle();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatePayload: Record<string, unknown> = {
      credits_left: user.credits_left + credits,
    };

    if (plan) {
      updatePayload.plan = plan;
      updatePayload.total_credits = credits;
      updatePayload.month_reset_date = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    if (customerCode) {
      updatePayload.paystack_customer_code = customerCode;
    }

    await supabase
      .from("users")
      .update(updatePayload)
      .eq("clerk_id", clerk_id);

    return res.status(200).json({
      success: true,
      credits_added: credits,
      plan: plan ?? "extra",
    });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
