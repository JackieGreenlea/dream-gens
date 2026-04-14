import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createSessionFromStory, getPlayableStoryById } from "@/lib/db";
import { runSessionOpeningTurn } from "@/lib/session-runtime";
import { sessionStartRequestSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureDatabaseUser } from "@/lib/user-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to start a session." }, { status: 401 });
    }

    await ensureDatabaseUser(user);

    const body = await request.json();
    const input = sessionStartRequestSchema.parse(body);
    const story = await getPlayableStoryById(input.storyId, user.id);

    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    if (
      input.characterId &&
      !story.playerCharacters.some((character) => character.id === input.characterId)
    ) {
      return NextResponse.json({ error: "Character not found for this story." }, { status: 400 });
    }

    const session = await createSessionFromStory({
      storyId: story.id,
      characterId: input.characterId ?? null,
      customCharacter: input.customCharacter ?? null,
      userId: user.id,
    });

    if (!session) {
      throw new Error("Session could not be created.");
    }

    try {
      await runSessionOpeningTurn({
        sessionId: session.id,
        userId: user.id,
      });

      return NextResponse.json({ sessionId: session.id });
    } catch (openingTurnError) {
      const message =
        openingTurnError instanceof Error
          ? openingTurnError.message
          : "The opening turn could not be prepared.";

      console.error("[sessions/start] opening turn failed after session creation", {
        sessionId: session.id,
        storyId: story.id,
        message,
      });

      return NextResponse.json({
        sessionId: session.id,
        warning: "The session was created, but the opening turn is still unavailable.",
      });
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "The session start request did not match the expected schema.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to start session.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
