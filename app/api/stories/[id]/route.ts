import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  deleteStoryForUser,
  getStoryPlayableById,
  saveStoryPlayableForUser,
} from "@/lib/db";
import { persistedWorldSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureDatabaseUser } from "@/lib/user-sync";

export const runtime = "nodejs";

// Real user-facing Story setup API.
export async function GET(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to open this story." }, { status: 401 });
  }

  const world = await getStoryPlayableById(id, user.id);

  if (!world) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json({ world });
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to save this story." }, { status: 401 });
    }

    await ensureDatabaseUser(user);

    const body = await request.json();
    const input = persistedWorldSchema.parse(body);

    if (input.id !== id) {
      return NextResponse.json({ error: "Story id mismatch." }, { status: 400 });
    }

    const world = await saveStoryPlayableForUser(input, user.id);

    if (!world) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    return NextResponse.json({ world });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "The story payload did not match the expected schema.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to save story.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
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
    return NextResponse.json({ error: "Sign in to delete this story." }, { status: 401 });
  }

  const deleted = await deleteStoryForUser(id, user.id);

  if (!deleted) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
