import { Check, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { PLANS, EXTRA_PACK } from "../lib/utils";
import { useClerkConfigured } from "../App";
import PricingWithClerk from "../components/PricingWithClerk";

function PlanCard({
  plan,
  onPay,
  isSignedIn,
}: {
  plan: (typeof PLANS)[number];
  onPay: (amount: number, planId: string, credits: number) => void;
  isSignedIn: boolean;
}) {
  return (
    <div
      className={`relative card-dark p-6 flex flex-col transition-transform hover:-translate-y-1 ${
        plan.popular ? "border-[#FFD700]/50 ring-1 ring-[#FFD700]/30" : ""
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-[#FFD700] text-[#0A0A0A] text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
            Most Popular
          </span>
        </div>
      )}
      <div className="mb-6">
        <h3 className="font-display text-xl font-bold text-white mb-1">{plan.name}</h3>
        <p className="text-gray-500 text-sm">{plan.tagline}</p>
      </div>
      <div className="mb-6">
        <div className="flex items-end gap-1">
          <span className="text-3xl font-display font-extrabold text-white">
            ₦{plan.price.toLocaleString()}
          </span>
          <span className="text-gray-500 text-sm pb-1">/month</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <Zap size={14} className="text-[#FFD700]" />
          <span className="text-[#FFD700] font-bold text-sm">{plan.credits} Credits</span>
        </div>
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {[
          `${plan.credits} AI designs per month`,
          "Logos, Flyers, Social Posts, Business Cards",
          "4K quality downloads",
          "Credits valid for 30 days",
          "Nigerian payment (Paystack)",
        ].map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <div className="w-4 h-4 bg-[#FFD700]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check size={10} className="text-[#FFD700]" />
            </div>
            <span className="text-gray-300 text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => onPay(plan.paystackAmount, plan.id, plan.credits)}
        className={`w-full py-3 rounded-xl font-semibold transition-all active:scale-95 ${
          plan.popular ? "btn-gold" : "btn-outline-gold"
        }`}
      >
        {isSignedIn ? "Pay with Paystack" : "Get Started"}
      </button>
    </div>
  );
}

export { PlanCard };

export default function PricingPage() {
  const clerkConfigured = useClerkConfigured();
  const navigate = useNavigate();

  const handlePayNoAuth = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <div className="px-4 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Simple, Nigerian-Friendly Pricing
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Pay once, design for the whole month. No monthly subscription wahala.
          </p>
        </div>

        {clerkConfigured ? (
          <PricingWithClerk />
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onPay={handlePayNoAuth}
                  isSignedIn={false}
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
                  <p className="text-gray-400 text-sm">Credits dey low? Grab a quick top-up.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-2xl font-display font-bold text-[#FFD700]">
                    ₦{EXTRA_PACK.price.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm">{EXTRA_PACK.credits} Credits</p>
                </div>
                <button onClick={handlePayNoAuth} className="btn-gold whitespace-nowrap">
                  Buy Extra
                </button>
              </div>
            </div>
          </>
        )}

        {/* FAQ */}
        <div className="mt-4">
          <h2 className="font-display text-2xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { q: "How do credits work?", a: "1 credit = 1 AI-generated design. No hidden charges." },
              { q: "What payment methods work?", a: "Paystack — debit card, bank transfer, USSD, or mobile money." },
              { q: "Do credits expire?", a: "Plan credits last 30 days. Extra Pack credits don't expire." },
              { q: "Can I use the designs commercially?", a: "Yes! All designs you generate belong to you. Use them everywhere." },
            ].map((item) => (
              <div key={item.q} className="card-dark p-5">
                <h4 className="font-semibold text-white mb-2">{item.q}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-gray-500 text-sm">
            Not sure which plan?{" "}
            <Link to="/auth" className="text-[#FFD700] hover:underline">
              Sign up free and decide later
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
