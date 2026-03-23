import "server-only";

import { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

function readUserName(user: SupabaseUser) {
  const name = user.user_metadata?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export async function ensureDatabaseUser(user: SupabaseUser) {
  return prisma.user.upsert({
    where: {
      id: user.id,
    },
    create: {
      id: user.id,
      email: user.email ?? null,
      name: readUserName(user),
    },
    update: {
      email: user.email ?? null,
      name: readUserName(user),
    },
  });
}
