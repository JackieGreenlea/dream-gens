import { NextResponse } from "next/server";
import { deleteSessionForUser, updateSessionInactiveStoryCardIds } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to update this session." }, { status: 401 });
  }

  const payload = (await request.json()) as {
    inactiveStoryCardIds?: unknown;
  };

  if (!Array.isArray(payload.inactiveStoryCardIds)) {
    return NextResponse.json(
      { error: "inactiveStoryCardIds must be an array." },
      { status: 400 },
    );
  }

  const inactiveStoryCardIds = payload.inactiveStoryCardIds
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  const session = await updateSessionInactiveStoryCardIds({
    sessionId: id,
    userId: user.id,
    inactiveStoryCardIds,
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to delete this session." }, { status: 401 });
  }

  const deleted = await deleteSessionForUser(id, user.id);

  if (!deleted) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
