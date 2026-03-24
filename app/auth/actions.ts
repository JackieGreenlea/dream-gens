"use server";

import { encodedRedirect } from "@/lib/utils-auth";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("/auth/sign-in", "error", error.message);
  }

  return encodedRedirect("/", "message", "Signed in.");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("/auth/sign-up", "error", error.message);
  }

  return encodedRedirect(
    "/auth/sign-in",
    "message",
    "Account created. Check your email to verify your account.",
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return encodedRedirect("/", "message", "Signed out.");
}
