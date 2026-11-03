import { useEffect, useState } from "react";
import { useAuth, useUser as useClerkUser } from "@clerk/clerk-react";
// Uses anon key — backend API uses service role for mutations
import { createClient } from "@supabase/supabase-js";
import { type UserRow } from "../lib/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function getClient(token?: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {},
  });
}

export function useUser() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user: clerkUser } = useClerkUser();
  const [dbUser, setDbUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateUser = async () => {
    if (!isSignedIn || !clerkUser) {
      setLoading(false);
      return;
    }

    try {
      const client = getClient();

      const { data, error } = await client
        .from("users")
        .select("*")
        .eq("clerk_id", clerkUser.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        const email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null;
        const phone = clerkUser.phoneNumbers?.[0]?.phoneNumber ?? null;

        const { data: newUser, error: insertError } = await client
          .from("users")
          .insert({
            clerk_id: clerkUser.id,
            email,
            phone,
            plan: "none",
            credits_left: 0,
            total_credits: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setDbUser(newUser);
      } else {
        setDbUser(data);
      }
    } catch (err) {
      console.error("useUser error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      fetchOrCreateUser();
    }
  }, [isLoaded, isSignedIn, clerkUser?.id]);

  const refreshUser = async () => {
    if (!clerkUser) return;
    const client = getClient();
    const { data } = await client
      .from("users")
      .select("*")
      .eq("clerk_id", clerkUser.id)
      .maybeSingle();
    if (data) setDbUser(data);
  };

  return { dbUser, setDbUser, loading, refreshUser };
}
