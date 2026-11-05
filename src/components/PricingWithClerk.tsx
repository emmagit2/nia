import { useAuth, useUser as useClerkUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import axios from "axios";
import { PLANS, EXTRA_PACK } from "../lib/utils";
import { useUser } from "../hooks/useUser";
import { PlanCard } from "../pages/PricingPage";

export default function PricingWithClerk() {
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useClerkUser();
  const { refreshUser } = useUser();
  const navigate = useNavigate();
  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string;
const handlePay = (amount: number, planId: string, credits: number) => {
  if (!isSignedIn) {
    navigate("/auth");
    return;
  }
  if (!clerkUser) return;

  const email =
    clerkUser.emailAddresses?.[0]?.emailAddress ??
    `${clerkUser.id}@ogadesigner.com`;

  const verifyPayment = async (reference: string) => {
    try {
      await axios.post("/api/paystack/verify", {
        reference,
        clerk_id: clerkUser.id,
      });
      await refreshUser();
      navigate("/dashboard");
    } catch (err) {
      console.error("Payment verify error:", err);
    }
  };

  const handler = (window as any).PaystackPop.setup({
    key: paystackKey,
    email,
    amount,
    currency: "NGN",
    ref: `${planId}_${clerkUser.id}_${Date.now()}`,
    metadata: { clerk_id: clerkUser.id, plan_id: planId, credits },
    callback: function (response: { reference: string }) {
      verifyPayment(response.reference); // async work happens inside, callback itself is not async
    },
    onClose: function () {},
  });
  handler.openIframe();
};

  return (
    <>
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onPay={handlePay}
            isSignedIn={!!isSignedIn}
          />
        ))}
      </div>

      <div className="card-dark p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#FFD700]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap size={22} className="text-[#FFD700]" />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-lg">Extra Credit Pack</h3>
            <p className="text-gray-400 text-sm">
              Credits dey low? Grab a quick top-up. Stacks with your plan.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-2xl font-display font-bold text-[#FFD700]">
              ₦{EXTRA_PACK.price.toLocaleString()}
            </p>
            <p className="text-gray-400 text-sm">{EXTRA_PACK.credits} Credits</p>
          </div>
          <button
            onClick={() =>
              handlePay(EXTRA_PACK.paystackAmount, "extra", EXTRA_PACK.credits)
            }
            className="btn-gold whitespace-nowrap"
          >
            Buy Extra
          </button>
        </div>
      </div>
    </>
  );
}
