import { NextResponse } from "next/server";
import { publishWorldCanonForUser, unpublishWorldCanonForUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

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
    return NextResponse.json({ error: "Sign in to publish this world." }, { status: 401 });
  }

  const result = await publishWorldCanonForUser(id, user.id);

  if (result.error) {
    const status = result.error === "World not found." ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ world: result.world });
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
    return NextResponse.json({ error: "Sign in to unpublish this world." }, { status: 401 });
  }

  const world = await unpublishWorldCanonForUser(id, user.id);

  if (!world) {
    return NextResponse.json({ error: "World not found." }, { status: 404 });
  }

  return NextResponse.json({ world });
}
