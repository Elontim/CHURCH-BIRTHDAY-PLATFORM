import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && key && !url.includes("your-project"));

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-public-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export const friendlyError = (error: unknown) => {
  if (error instanceof Error) {
    if (error.message.includes("Invalid login credentials")) return "The email or password is not correct.";
    if (error.message.includes("Email not confirmed")) return "Please confirm your email before signing in.";
    if (error.message.includes("User already registered")) return "An account already exists for this email.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
};
