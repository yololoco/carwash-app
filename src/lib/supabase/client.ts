import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client-side Supabase client that uses Clerk's session token
// This must be called from a component that has access to Clerk's useSession hook
// For simple queries, use this directly. For authenticated queries, pass the session.
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Create a Clerk-authenticated Supabase client for client components
// Usage: const client = createClerkSupabaseClient(session)
export function createClerkSupabaseClient(session: { getToken: () => Promise<string | null> } | null | undefined) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return session?.getToken() ?? null;
      },
    }
  );
}
