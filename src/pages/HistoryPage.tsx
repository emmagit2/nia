import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser as useClerkUser } from "@clerk/clerk-react";
import { Download, Sparkles, ArrowLeft } from "lucide-react";
import { supabase, type GenerationRow } from "../lib/supabase";
import Navbar from "../components/Navbar";

export default function HistoryPage() {
  const { user: clerkUser } = useClerkUser();
  const [generations, setGenerations] = useState<GenerationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!clerkUser) return;

      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", clerkUser.id)
        .maybeSingle();

      if (!userData) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", userData.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setGenerations(data ?? []);
      setLoading(false);
    };

    fetchHistory();
  }, [clerkUser?.id]);

  const handleDownload = async (url: string, type: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ogadesigner_${type.replace(" ", "_")}_${Date.now()}.jpg`;
      link.click();
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-white mb-1">
              Your Design History
            </h1>
            <p className="text-gray-500 text-sm">
              All your AI-generated designs in one place
            </p>
          </div>
          {!loading && (
            <span className="text-gray-500 text-sm">
              {generations.length} design{generations.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl shimmer"
              />
            ))}
          </div>
        ) : generations.length === 0 ? (
          <div className="card-dark p-16 text-center">
            <div className="w-16 h-16 bg-[#FFD700]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-[#FFD700]" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">
              No designs yet
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              You haven't generated any designs. Time to start your hustle!
            </p>
            <Link to="/dashboard" className="btn-gold inline-block">
              Create Your First Design
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {generations.map((gen) => (
              <div
                key={gen.id}
                className="group relative overflow-hidden rounded-xl border border-[#2E2E2E] hover:border-[#FFD700]/40 transition-colors"
              >
                <img
                  src={gen.image_url}
                  alt={`${gen.design_type} for ${gen.business_name}`}
                  className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
                  <p className="text-white text-xs font-semibold mb-0.5">{gen.business_name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[#FFD700] text-xs">{gen.design_type}</span>
                    <button
                      onClick={() => handleDownload(gen.image_url, gen.design_type)}
                      className="bg-[#FFD700] text-[#0A0A0A] p-1.5 rounded-lg hover:bg-[#FFE44D] transition-colors"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                </div>

                <div className="absolute top-2 left-2">
                  <span className="bg-[#0A0A0A]/80 text-[#FFD700] text-xs font-bold px-2 py-0.5 rounded-full border border-[#FFD700]/30">
                    {gen.design_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
