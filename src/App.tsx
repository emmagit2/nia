import { createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
import DashboardPage from "./pages/DashboardPage";
import AuthPage from "./pages/AuthPage";
import HistoryPage from "./pages/HistoryPage";
import LeadPage from "./pages/LeadPage";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
export const isClerkConfigured =
  !!clerkKey && clerkKey !== "pk_test_your_clerk_key_here";

export const ClerkConfigContext = createContext(false);
export const useClerkConfigured = () => useContext(ClerkConfigContext);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isSignedIn) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      {/* Public page customers open after scanning a QR. No login. Must be above the "*" route. */}
      <Route path="/c/:slug" element={<LeadPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppWithClerk() {
  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ClerkConfigContext.Provider value={true}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ClerkConfigContext.Provider>
    </ClerkProvider>
  );
}

function AppWithoutClerk() {
  return (
    <ClerkConfigContext.Provider value={false}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/c/:slug" element={<LeadPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    </ClerkConfigContext.Provider>
  );
}

export default function App() {
  return isClerkConfigured ? <AppWithClerk /> : <AppWithoutClerk />;
}