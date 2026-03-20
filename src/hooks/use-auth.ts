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

      // Try to find existing profile by Clerk user ID or email
      const email = clerkUser!.primaryEmailAddress?.emailAddress;
      const { data } = await db
        .from("profiles")
        .select("id, email, full_name, phone, avatar_url, role, preferred_language, referral_code")
        .eq("email", email)
        .single();

      if (data) {
        setProfile(data as Profile);
      } else {
        // Profile doesn't exist yet — create one
        // This handles the case where Clerk user signed up but no Supabase profile exists
        const newProfile = {
          id: clerkUser!.id,
          email: email || "",
          full_name: clerkUser!.fullName || clerkUser!.firstName || email || "",
          phone: clerkUser!.primaryPhoneNumber?.phoneNumber || null,
          avatar_url: clerkUser!.imageUrl || null,
          role: "customer" as UserRole,
          preferred_language: "es",
          referral_code: clerkUser!.id.slice(0, 8).toUpperCase(),
        };

        await db.from("profiles").upsert(newProfile, { onConflict: "email" });
        setProfile(newProfile);
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
