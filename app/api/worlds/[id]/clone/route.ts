import { NextResponse } from "next/server";
import { cloneWorldCanonForUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureDatabaseUser } from "@/lib/user-sync";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to clone this world." }, { status: 401 });
  }

  await ensureDatabaseUser(user);

  const world = await cloneWorldCanonForUser(id, user.id);

  if (!world) {
    return NextResponse.json({ error: "World not found." }, { status: 404 });
  }

  return NextResponse.json({ world });
}
