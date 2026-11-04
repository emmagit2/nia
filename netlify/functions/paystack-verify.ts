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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: { reference?: string; clerk_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { reference, clerk_id } = body;

  if (!reference || !clerk_id) {
    return json({ error: "Missing reference or clerk_id" }, 400);
  }

  try {
    // Verify with Paystack
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    if (!paystackRes.ok) {
      return json({ error: "Payment verification failed" }, 400);
    }

    const paystackData = (await paystackRes.json()) as {
      status: boolean;
      data: {
        status: string;
        amount: number;
        customer: { customer_code: string };
      };
    };

    if (!paystackData.status || paystackData.data.status !== "success") {
      return json({ error: "Payment not successful" }, 400);
    }

    const amount = paystackData.data.amount;
    const mapping = AMOUNT_TO_CREDITS[amount];

    if (!mapping) {
      return json({ error: "Unknown payment amount" }, 400);
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
      return json({ error: "User not found" }, 404);
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

    const { error: updateError } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("clerk_id", clerk_id);

    if (updateError) {
      console.error("Update failed:", updateError.message);
      return json({ error: "Failed to update credits" }, 500);
    }

    return json({
      success: true,
      credits_added: credits,
      plan: plan ?? "extra",
    });
  } catch (err) {
    console.error("Verify error:", err);
    return json({ error: "Internal server error" }, 500);
  }
};