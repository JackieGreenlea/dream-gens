"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getUsernameValidationError,
  isUniqueConstraintError,
  normalizeUsername,
} from "@/lib/user-identity";
import { ensureDatabaseUser, updateDatabaseUserIdentity } from "@/lib/user-sync";
import { encodedRedirect } from "@/lib/utils-auth";

export async function updateIdentity(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    return encodedRedirect("/auth/sign-in", "error", "Sign in to update your account.");
  }

  await ensureDatabaseUser(user);

  const rawUsername = String(formData.get("username") ?? "");
  const username = normalizeUsername(rawUsername);
  const validationError = getUsernameValidationError(rawUsername);

  if (validationError) {
    return encodedRedirect("/settings", "error", validationError);
  }

  const takenUser = await prisma.user.findFirst({
    where: {
      username,
      NOT: {
        id: user.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (takenUser) {
    return encodedRedirect("/settings", "error", "That username is already taken.");
  }

  try {
    await updateDatabaseUserIdentity(user.id, { username });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return encodedRedirect("/settings", "error", "That username is already taken.");
    }

    return encodedRedirect("/settings", "error", "Your account could not be updated.");
  }

  return encodedRedirect("/settings", "message", "Identity updated.");
}
