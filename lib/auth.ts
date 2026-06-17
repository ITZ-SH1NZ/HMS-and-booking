"use client";

import { createClient } from "@/lib/supabase/client";
import type { UserRole, VerificationStatus } from "@/lib/types";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== "undefined" ? window.location.origin : "");

export interface GuestSignupInput {
  email: string;
  password: string;
  fullName: string;
  dob: string;
  phone: string;
  location: string;
}

export interface ManagerSignupInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  businessName: string;
  registrationNumber: string;
  businessAddress: string;
  document: File;
}

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

// Guest sign-up. Profile creation is handled by the `handle_new_user` trigger
// reading the metadata we pass here, so it works even before email confirmation.
export async function signUpGuest(input: GuestSignupInput) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        role: "guest",
        full_name: input.fullName,
        dob: input.dob,
        phone: input.phone,
        location: input.location,
      },
    },
  });

  if (error) throw error;
  return data;
}

// Manager sign-up. We upload the verification document first (the storage
// bucket allows anonymous inserts during sign-up), then pass its path in the
// metadata so the trigger can attach it to the manager_verifications row.
export async function signUpManager(input: ManagerSignupInput) {
  const supabase = createClient();

  const ext = input.document.name.split(".").pop() ?? "bin";
  const path = `pending/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("manager-documents")
    .upload(path, input.document, { upsert: false });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        role: "manager",
        full_name: input.fullName,
        phone: input.phone,
        business_name: input.businessName,
        registration_number: input.registrationNumber,
        business_address: input.businessAddress,
        document_url: path,
      },
    },
  });

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Sign in / out
// ---------------------------------------------------------------------------

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// Google OAuth — guests only. Redirects to Google then back to /auth/callback.
export async function signInWithGoogle() {
  const supabase = createClient();
  // Always runs in the browser (click handler), so prefer the live origin.
  // This keeps localhost, Vercel previews, and production each redirecting
  // back to themselves rather than a single hard-coded site URL.
  const origin =
    typeof window !== "undefined" ? window.location.origin : siteUrl;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserRole(): Promise<UserRole | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (data?.role as UserRole) ?? null;
}

export async function isUserVerified(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user?.email_confirmed_at);
}

// Latest manager verification status for the signed-in user (or null).
export async function getManagerStatus(): Promise<VerificationStatus | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("manager_verifications")
    .select("status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.status as VerificationStatus) ?? null;
}

// Resend the verification email for an address that hasn't confirmed yet.
export async function resendVerification(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });
  if (error) throw error;
}
