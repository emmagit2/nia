import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <div className="p-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-[#FFD700] rounded-lg flex items-center justify-center">
            <span className="text-[#0A0A0A] font-bold text-sm font-display">O</span>
          </div>
          <span className="font-display font-bold text-lg text-white">
            Oga<span className="text-[#FFD700]">Designer</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              {mode === "signin" ? "Welcome Back, Oga" : "Join OgaDesigner"}
            </h1>
            <p className="text-gray-400">
              {mode === "signin"
                ? "Sign in to continue designing"
                : "Create your account and start designing"}
            </p>
          </div>

          {(!clerkKey || clerkKey === "pk_test_your_clerk_key_here") ? (
            <div className="card-dark p-8 text-center">
              <div className="w-16 h-16 bg-[#FFD700]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔑</span>
              </div>
              <h3 className="font-display text-xl font-bold text-white mb-2">
                Clerk Not Configured
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Add your <code className="text-[#FFD700] bg-[#FFD700]/10 px-1 rounded">VITE_CLERK_PUBLISHABLE_KEY</code> to{" "}
                <code className="text-[#FFD700] bg-[#FFD700]/10 px-1 rounded">.env</code> to enable authentication.
              </p>
              <Link to="/" className="btn-gold inline-block">
                Back to Home
              </Link>
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <div className="flex bg-[#111111] border border-[#2E2E2E] rounded-xl p-1 mb-6">
                <button
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mode === "signin"
                      ? "bg-[#FFD700] text-[#0A0A0A]"
                      : "text-gray-400 hover:text-white"
                  }`}
                  onClick={() => setMode("signin")}
                >
                  Sign In
                </button>
                <button
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mode === "signup"
                      ? "bg-[#FFD700] text-[#0A0A0A]"
                      : "text-gray-400 hover:text-white"
                  }`}
                  onClick={() => setMode("signup")}
                >
                  Sign Up
                </button>
              </div>

              <div className="flex justify-center">
                {mode === "signin" ? (
                  <SignIn
                    routing="hash"
                    redirectUrl="/dashboard"
                    appearance={{
                      variables: {
                        colorPrimary: "#FFD700",
                        colorBackground: "#111111",
                        colorText: "#ffffff",
                        colorTextSecondary: "#9ca3af",
                        colorInputBackground: "#1A1A1A",
                        colorInputText: "#ffffff",
                        borderRadius: "12px",
                      },
                    }}
                  />
                ) : (
                  <SignUp
                    routing="hash"
                    redirectUrl="/dashboard"
                    appearance={{
                      variables: {
                        colorPrimary: "#FFD700",
                        colorBackground: "#111111",
                        colorText: "#ffffff",
                        colorTextSecondary: "#9ca3af",
                        colorInputBackground: "#1A1A1A",
                        colorInputText: "#ffffff",
                        borderRadius: "12px",
                      },
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
