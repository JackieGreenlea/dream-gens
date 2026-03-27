"use server";

import { redirect } from "next/navigation";
import { ensureDatabaseUser } from "@/lib/user-sync";
import { encodedRedirect } from "@/lib/utils-auth";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(formData: FormData) {
  const next = String(formData.get("next") ?? "").trim();

  if (!next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = getSafeNextPath(formData);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("/auth/sign-in", "error", error.message);
  }

  if (data.user) {
    await ensureDatabaseUser(data.user);
  }

  if (nextPath) {
    redirect(nextPath);
  }

  return encodedRedirect("/", "message", "Signed in.");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("/auth/sign-up", "error", error.message);
  }

  if (data.user) {
    await ensureDatabaseUser(data.user);
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
