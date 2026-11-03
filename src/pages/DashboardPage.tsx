import { useState } from "react";
import { useUser as useClerkUser, UserButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Zap, Download, RotateCcw, Sparkles, History } from "lucide-react";
import axios from "axios";
import { useUser } from "../hooks/useUser";
import CreditsBadge from "../components/CreditsBadge";
import BuyExtraModal from "../components/BuyExtraModal";

type DesignType = "Logo" | "Flyer" | "Social Post" | "Business Card";

const DESIGN_TYPES: DesignType[] = ["Logo", "Flyer", "Social Post", "Business Card"];

const PLACEHOLDERS: Record<DesignType, string> = {
  Logo: "e.g: Modern minimalist logo for my tech startup, blue and gold, clean design",
  Flyer: "e.g: Grand opening promo for my barbershop, Lagos style, gold and black colors",
  "Social Post": "e.g: Instagram promo post for my restaurant special offer, Friday night vibes",
  "Business Card": "e.g: Professional business card for civil engineer, corporate style, navy blue",
};

export default function DashboardPage() {
  const { user: clerkUser } = useClerkUser();
  const { dbUser, setDbUser, refreshUser } = useUser();

  const [businessName, setBusinessName] = useState("");
  const [designType, setDesignType] = useState<DesignType>("Logo");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);

  const creditsLeft = dbUser?.credits_left ?? 0;
  const canGenerate = creditsLeft > 0 && businessName.trim().length > 0;

  const handleGenerate = async () => {
    if (creditsLeft < 1) {
      setShowBuyModal(true);
      return;
    }
    if (!businessName.trim()) return;

    setLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const res = await axios.post("/api/generate", {
        businessName: businessName.trim(),
        type: designType,
        description: description.trim(),
        clerkId: clerkUser?.id,
      });

      setGeneratedImage(res.data.image_url);
      if (dbUser && res.data.credits_left !== undefined) {
        setDbUser({ ...dbUser, credits_left: res.data.credits_left });
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 402) {
          setShowBuyModal(true);
        } else {
          setError(err.response?.data?.error ?? "Something went wrong. Try again.");
        }
        // Attempt refund on server error
        if (err.response?.status === 500) {
          try {
            await axios.post("/api/refund-credit", { clerkId: clerkUser?.id });
            await refreshUser();
          } catch {}
        }
      } else {
        setError("Network error. Check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ogadesigner_${designType.replace(" ", "_")}_${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(generatedImage, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#2E2E2E]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FFD700] rounded-lg flex items-center justify-center">
              <span className="text-[#0A0A0A] font-bold text-sm font-display">O</span>
            </div>
            <span className="font-display font-bold text-lg text-white hidden sm:block">
              Oga<span className="text-[#FFD700]">Designer</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/history"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <History size={16} />
              <span className="hidden sm:block">History</span>
            </Link>
            <Link
              to="/pricing"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                creditsLeft < 10
                  ? "border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-[#0A0A0A]"
                  : "border-[#2E2E2E] text-gray-400 hover:border-[#FFD700] hover:text-[#FFD700]"
              }`}
            >
              <Zap size={12} />
              {creditsLeft} Credits
              {creditsLeft < 10 && <span className="hidden sm:block">— Buy More</span>}
            </Link>
            <UserButton
              appearance={{
                elements: { avatarBox: "w-8 h-8" },
              }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Generator Form */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            <div>
              <h1 className="font-display text-2xl font-bold text-white mb-1">
                Oga, what you dey design today?
              </h1>
              <p className="text-gray-500 text-sm">
                Describe your business and let AI create the perfect design for you.
              </p>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                className="input-dark"
                placeholder="e.g: Emeka's Barbershop, Lagos Fresh Kitchen"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Design Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Design Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DESIGN_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setDesignType(type)}
                    disabled={loading}
                    className={`py-3 px-2 rounded-xl text-sm font-semibold border transition-all ${
                      designType === type
                        ? "bg-[#FFD700] border-[#FFD700] text-[#0A0A0A]"
                        : "border-[#2E2E2E] text-gray-400 hover:border-[#FFD700]/50 hover:text-white bg-[#111111]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description{" "}
                <span className="text-gray-500 font-normal">(optional but recommended)</span>
              </label>
              <textarea
                className="input-dark resize-none"
                rows={4}
                placeholder={PLACEHOLDERS[designType]}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || (!canGenerate && creditsLeft > 0)}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all active:scale-95 flex items-center justify-center gap-2 ${
                creditsLeft < 1
                  ? "bg-red-500/20 border border-red-500/40 text-red-400"
                  : "btn-gold"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                  Oga, AI dey cook...
                </>
              ) : creditsLeft < 1 ? (
                <>
                  <Zap size={18} />
                  Credits Don Finish — Buy Extra
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate — 1 Credit
                </>
              )}
            </button>

            {creditsLeft === 0 && (
              <p className="text-center text-gray-500 text-xs">
                Your credits have finished.{" "}
                <Link to="/pricing" className="text-[#FFD700] hover:underline">
                  Buy a plan to continue
                </Link>
              </p>
            )}
          </div>

          {/* Result Panel */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Credits Summary */}
            <CreditsBadge />

            {/* Generated Image */}
            <div className="card-dark overflow-hidden">
              <div className="p-4 border-b border-[#2E2E2E]">
                <p className="text-sm font-semibold text-gray-300">Generated Design</p>
              </div>

              {loading ? (
                <div className="aspect-square flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 text-sm">AI dey work for you...</p>
                  <p className="text-gray-600 text-xs">This go take about 15-30 seconds</p>
                </div>
              ) : generatedImage ? (
                <div className="relative group">
                  <img
                    src={generatedImage}
                    alt="AI Generated Design"
                    className="w-full aspect-square object-cover animate-fade-in"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 bg-[#FFD700] text-[#0A0A0A] font-bold px-4 py-2 rounded-lg hover:bg-[#FFE44D] transition-colors"
                    >
                      <Download size={16} />
                      Download
                    </button>
                    <button
                      onClick={() => {
                        setGeneratedImage(null);
                        setError(null);
                      }}
                      className="flex items-center gap-2 bg-[#2E2E2E] text-white font-medium px-4 py-2 rounded-lg hover:bg-[#3E3E3E] transition-colors"
                    >
                      <RotateCcw size={16} />
                      New
                    </button>
                  </div>
                </div>
              ) : (
                <div className="aspect-square flex flex-col items-center justify-center gap-3 p-6">
                  <div className="w-16 h-16 bg-[#FFD700]/10 rounded-2xl flex items-center justify-center">
                    <Sparkles size={28} className="text-[#FFD700]" />
                  </div>
                  <p className="text-gray-400 text-sm text-center">
                    Your design will appear here after generation
                  </p>
                  <p className="text-gray-600 text-xs text-center">
                    Fill the form and click Generate
                  </p>
                </div>
              )}
            </div>

            {/* Download Button (visible below image on mobile) */}
            {generatedImage && !loading && (
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="btn-gold flex-1 flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Download Design
                </button>
                <button
                  onClick={() => {
                    setGeneratedImage(null);
                    setError(null);
                  }}
                  className="border border-[#2E2E2E] text-gray-400 hover:text-white px-4 py-3 rounded-xl transition-colors"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBuyModal && (
        <BuyExtraModal
          onClose={() => setShowBuyModal(false)}
          onSuccess={refreshUser}
        />
      )}
    </div>
  );
}
