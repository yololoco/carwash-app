"use client";

import { useEffect, useState } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  preferred_language: string;
  referral_code: string | null;
  clerk_id: string | null;
}

export function useAuth() {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerkAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!clerkUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;

      // Try to find existing profile by clerk_id first, then email
      const email = clerkUser!.primaryEmailAddress?.emailAddress;
      const clerkId = clerkUser!.id;

      // First try clerk_id
      let { data } = await db
        .from("profiles")
        .select("id, email, full_name, phone, avatar_url, role, preferred_language, referral_code, clerk_id")
        .eq("clerk_id", clerkId)
        .single();

      // If not found by clerk_id, try email (for profiles created before Clerk migration)
      if (!data && email) {
        const emailResult = await db
          .from("profiles")
          .select("id, email, full_name, phone, avatar_url, role, preferred_language, referral_code, clerk_id")
          .eq("email", email)
          .single();
        data = emailResult.data;

        // Link the clerk_id to this profile
        if (data && !data.clerk_id) {
          await db.from("profiles").update({ clerk_id: clerkId }).eq("id", data.id);
        }
      }

      if (data) {
        setProfile(data as Profile);
      } else {
        // Profile doesn't exist yet — create one
        // This handles the case where Clerk user signed up but no Supabase profile exists
        const { data: newRow } = await db.from("profiles").insert({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
          email: email || "",
          full_name: clerkUser!.fullName || clerkUser!.firstName || email || "",
          phone: clerkUser!.primaryPhoneNumber?.phoneNumber || null,
          avatar_url: clerkUser!.imageUrl || null,
          role: "customer" as UserRole,
          preferred_language: "es",
          clerk_id: clerkUser!.id,
          referral_code: clerkUser!.id.slice(0, 8).toUpperCase(),
        }).select().single();
        if (newRow) setProfile(newRow as Profile);
      }

      setLoading(false);
    }

    fetchProfile();
  }, [clerkUser, isLoaded]);

  const user = clerkUser
    ? { id: profile?.id || clerkUser.id, email: clerkUser.primaryEmailAddress?.emailAddress }
    : null;

  const signOut = async () => {
    await clerkSignOut();
    setProfile(null);
  };

  return { user, profile, loading, signOut };
}
