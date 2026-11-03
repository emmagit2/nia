import { Link, useLocation } from "react-router-dom";
import { useAuth, UserButton } from "@clerk/clerk-react";
import CreditsBadge from "./CreditsBadge";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useClerkConfigured } from "../App";

function NavbarWithClerk() {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDashboard = location.pathname === "/dashboard";

  return (
    <nav className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#2E2E2E]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FFD700] rounded-lg flex items-center justify-center">
            <span className="text-[#0A0A0A] font-bold text-sm font-display">O</span>
          </div>
          <span className="font-display font-bold text-lg text-white">
            Oga<span className="text-[#FFD700]">Designer</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm">
            Pricing
          </Link>
          {isSignedIn ? (
            <>
              <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
                Dashboard
              </Link>
              <Link to="/history" className="text-gray-400 hover:text-white transition-colors text-sm">
                History
              </Link>
              {isDashboard && <CreditsBadge compact />}
              <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
            </>
          ) : (
            <>
              <Link to="/auth" className="text-gray-400 hover:text-white transition-colors text-sm">
                Sign In
              </Link>
              <Link to="/auth" className="btn-gold text-sm px-4 py-2">
                Get Started Free
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden text-gray-400 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[#111111] border-t border-[#2E2E2E] px-4 py-4 flex flex-col gap-4 animate-fade-in">
          <Link to="/pricing" className="text-gray-300 hover:text-white text-sm" onClick={() => setMenuOpen(false)}>
            Pricing
          </Link>
          {isSignedIn ? (
            <>
              <Link to="/dashboard" className="text-gray-300 hover:text-white text-sm" onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <Link to="/history" className="text-gray-300 hover:text-white text-sm" onClick={() => setMenuOpen(false)}>
                History
              </Link>
              <CreditsBadge compact />
              <UserButton />
            </>
          ) : (
            <Link to="/auth" className="btn-gold text-sm text-center" onClick={() => setMenuOpen(false)}>
              Get Started
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

function NavbarSimple() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#2E2E2E]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FFD700] rounded-lg flex items-center justify-center">
            <span className="text-[#0A0A0A] font-bold text-sm font-display">O</span>
          </div>
          <span className="font-display font-bold text-lg text-white">
            Oga<span className="text-[#FFD700]">Designer</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link to="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</Link>
          <Link to="/auth" className="btn-gold text-sm px-4 py-2">Get Started Free</Link>
        </div>
        <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-[#111111] border-t border-[#2E2E2E] px-4 py-4 flex flex-col gap-4">
          <Link to="/pricing" className="text-gray-300 text-sm" onClick={() => setMenuOpen(false)}>Pricing</Link>
          <Link to="/auth" className="btn-gold text-sm text-center" onClick={() => setMenuOpen(false)}>Get Started</Link>
        </div>
      )}
    </nav>
  );
}

export default function Navbar() {
  const clerkConfigured = useClerkConfigured();
  return clerkConfigured ? <NavbarWithClerk /> : <NavbarSimple />;
}
