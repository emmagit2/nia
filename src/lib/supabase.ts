import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRow = {
  id: string;
  clerk_id: string;
  email: string | null;
  phone: string | null;
  plan: string;
  credits_left: number;
  total_credits: number;
  month_reset_date: string | null;
  paystack_customer_code: string | null;
  created_at: string;
};

export type GenerationRow = {
  id: string;
  user_id: string;
  prompt: string;
  image_url: string;
  design_type: string;
  business_name: string;
  credits_used: number;
  created_at: string;
};
