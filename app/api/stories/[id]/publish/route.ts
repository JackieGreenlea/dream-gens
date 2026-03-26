import { NextResponse } from "next/server";
import { publishStoryForUser, unpublishStoryForUser } from "@/lib/db";
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
    return NextResponse.json({ error: "Sign in to publish this story." }, { status: 401 });
  }

  const result = await publishStoryForUser(id, user.id);

  if (result.error) {
    const status = result.error === "Story not found." ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ story: result.story });
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
    return NextResponse.json({ error: "Sign in to unpublish this story." }, { status: 401 });
  }

  const story = await unpublishStoryForUser(id, user.id);

  if (!story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json({ story });
}
