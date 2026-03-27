import "server-only";

import { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import {
  ensureUniqueUsername,
  UserIdentityRecord,
} from "@/lib/user-identity";

function readUserName(user: SupabaseUser) {
  const name = user.user_metadata?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export async function ensureDatabaseUser(user: SupabaseUser) {
  const metadataName = readUserName(user);
  const existingUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
    select: {
      username: true,
      displayName: true,
    },
  });

  const username =
    existingUser?.username ?? (await ensureUniqueUsername(null, existingUser ? user.id : undefined));
  const displayName = existingUser?.displayName ?? metadataName ?? null;

  return prisma.user.upsert({
    where: {
      id: user.id,
    },
    create: {
      id: user.id,
      email: user.email ?? null,
      name: metadataName,
      username,
      displayName,
    },
    update: {
      email: user.email ?? null,
      name: metadataName,
      username,
      displayName,
    },
  });
}

export async function getDatabaseUserIdentity(userId: string): Promise<UserIdentityRecord | null> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
    },
  });

  return user;
}

export async function updateDatabaseUserIdentity(
  userId: string,
  input: {
    username: string;
  },
) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      username: input.username,
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
    },
  });
}
