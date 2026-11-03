import { X, Zap } from "lucide-react";
import { useUser as useClerkUser } from "@clerk/clerk-react";
import { EXTRA_PACK } from "../lib/utils";
import axios from "axios";

interface BuyExtraModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BuyExtraModal({ onClose, onSuccess }: BuyExtraModalProps) {
  const { user } = useClerkUser();
  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string;

  const handlePay = () => {
    if (!user) return;
    const email = user.emailAddresses?.[0]?.emailAddress ?? `${user.id}@ogadesigner.com`;

    const handler = PaystackPop.setup({
      key: paystackKey,
      email,
      amount: EXTRA_PACK.paystackAmount,
      currency: "NGN",
      ref: `extra_${user.id}_${Date.now()}`,
      metadata: {
        clerk_id: user.id,
        pack_type: "extra",
        credits: EXTRA_PACK.credits,
      },
      callback: async (response) => {
        try {
          await axios.post("/api/paystack/verify", {
            reference: response.reference,
            clerk_id: user.id,
          });
          onSuccess();
          onClose();
        } catch (err) {
          console.error("Verify failed:", err);
        }
      },
      onClose: () => {},
    });
    handler.openIframe();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="card-dark w-full max-w-sm p-6 relative animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="w-12 h-12 bg-[#FFD700]/10 rounded-xl flex items-center justify-center mb-4">
          <Zap size={24} className="text-[#FFD700]" />
        </div>

        <h3 className="font-display text-xl font-bold text-white mb-1">
          Credits Don Finish!
        </h3>
        <p className="text-gray-400 text-sm mb-6">
          No worry, grab an extra pack and continue your hustle.
        </p>

        <div className="bg-[#1A1A1A] border border-[#2E2E2E] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Extra Pack</p>
              <p className="text-sm text-gray-400">{EXTRA_PACK.credits} Credits</p>
            </div>
            <div className="text-right">
              <p className="text-[#FFD700] font-bold text-lg">
                ₦{EXTRA_PACK.price.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <button onClick={handlePay} className="btn-gold w-full">
          Pay ₦{EXTRA_PACK.price.toLocaleString()} — Get {EXTRA_PACK.credits} Credits
        </button>
      </div>
    </div>
  );
}
