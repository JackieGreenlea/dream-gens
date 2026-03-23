import { NextResponse } from "next/server";
import { deleteSessionForUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
