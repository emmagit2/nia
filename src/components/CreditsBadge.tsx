import { Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser } from "../hooks/useUser";

interface CreditsBadgeProps {
  compact?: boolean;
}

export default function CreditsBadge({ compact }: CreditsBadgeProps) {
  const { dbUser } = useUser();

  if (!dbUser) return null;

  const pct =
    dbUser.total_credits > 0
      ? (dbUser.credits_left / dbUser.total_credits) * 100
      : 0;
  const isLow = dbUser.credits_left < 10;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${isLow ? "border-red-500/40 bg-red-500/10" : "border-[#FFD700]/30 bg-[#FFD700]/10"}`}>
        <Zap size={12} className={isLow ? "text-red-400" : "text-[#FFD700]"} />
        <span className={`text-xs font-semibold ${isLow ? "text-red-400" : "text-[#FFD700]"}`}>
          {dbUser.credits_left}
        </span>
      </div>
    );
  }

  return (
    <div className="card-dark p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[#FFD700]" />
          <span className="text-sm font-semibold text-white">Credits</span>
        </div>
        <span className="text-sm font-bold text-[#FFD700]">
          {dbUser.credits_left}
          {dbUser.total_credits > 0 && (
            <span className="text-gray-500 font-normal">/{dbUser.total_credits}</span>
          )}
        </span>
      </div>

      {dbUser.total_credits > 0 && (
        <div className="w-full bg-[#2E2E2E] rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: isLow ? "#ef4444" : "#FFD700",
            }}
          />
        </div>
      )}

      {isLow && (
        <Link
          to="/pricing"
          className="text-xs text-[#FFD700] hover:underline text-center"
        >
          Credits dey low — buy extra
        </Link>
      )}
    </div>
  );
}
