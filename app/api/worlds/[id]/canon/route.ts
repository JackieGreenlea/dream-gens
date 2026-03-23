import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { deleteWorldCanonForUser, updateWorldCanonForUser } from "@/lib/db";
import { worldCanonSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureDatabaseUser } from "@/lib/user-sync";

export const runtime = "nodejs";

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
      return NextResponse.json({ error: "Sign in to save this world." }, { status: 401 });
    }

    await ensureDatabaseUser(user);

    const body = await request.json();
    const input = worldCanonSchema.parse(body);

    if (input.id !== id) {
      return NextResponse.json({ error: "World id mismatch." }, { status: 400 });
    }

    const world = await updateWorldCanonForUser(input, user.id);

    if (!world) {
      return NextResponse.json({ error: "World not found." }, { status: 404 });
    }

    return NextResponse.json({ world });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "The world payload did not match the expected schema.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to save world.";
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
    return NextResponse.json({ error: "Sign in to delete this world." }, { status: 401 });
  }

  const deleted = await deleteWorldCanonForUser(id, user.id);

  if (!deleted) {
    return NextResponse.json({ error: "World not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
