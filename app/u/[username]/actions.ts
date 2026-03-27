"use server";

import { getCurrentUser } from "@/lib/supabase/server";
import { ensureDatabaseUser, updateDatabaseUserBio } from "@/lib/user-sync";
import { encodedRedirect } from "@/lib/utils-auth";

export async function updatePublicProfileBio(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return encodedRedirect("/auth/sign-in", "error", "Sign in to edit your profile.");
  }

  const identity = await ensureDatabaseUser(currentUser);
  const username = String(formData.get("username") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (identity.username !== username) {
    return encodedRedirect(`/u/${username}`, "error", "You can only edit your own bio.");
  }

  try {
    await updateDatabaseUserBio(currentUser.id, bio || null);
  } catch {
    return encodedRedirect(`/u/${username}`, "error", "Your bio could not be updated.");
  }

  return encodedRedirect(`/u/${username}`, "message", "Bio updated.");
}
