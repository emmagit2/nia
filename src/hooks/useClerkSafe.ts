import { useAuth, useUser as useClerkUserBase } from "@clerk/clerk-react";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const isClerkConfigured =
  clerkKey && clerkKey !== "pk_test_your_clerk_key_here";

export function useAuthSafe() {
  if (!isClerkConfigured) {
    return { isSignedIn: false, isLoaded: true };
  }
  return useAuth();
}

export function useUserSafe() {
  if (!isClerkConfigured) {
    return { user: null, isLoaded: true };
  }
  return useClerkUserBase();
}
