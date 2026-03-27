import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  createSessionFromLegacyWorld,
  createSessionFromStory,
  resolvePlayableSourceForSessionStart,
} from "@/lib/db";
import { runSessionTurn } from "@/lib/session-runtime";
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
    const setup = await resolvePlayableSourceForSessionStart(input.worldId, user.id);

    if (!setup) {
      return NextResponse.json({ error: "World not found." }, { status: 404 });
    }

    if (!setup.playable.playerCharacters.some((character) => character.id === input.characterId)) {
      return NextResponse.json({ error: "Character not found for this world." }, { status: 400 });
    }

    const session =
      setup.source === "story"
        ? await createSessionFromStory({
            storyId: setup.story.id,
            characterId: input.characterId,
            userId: user.id,
          })
        : await createSessionFromLegacyWorld({
            worldId: setup.world.id,
            characterId: input.characterId,
            userId: user.id,
          });

    if (!session) {
      throw new Error("Session could not be created.");
    }

    try {
      await runSessionTurn({
        sessionId: session.id,
        playerAction: setup.playable.firstAction,
        userId: user.id,
      });
    } catch (openingTurnError) {
      const message =
        openingTurnError instanceof Error
          ? openingTurnError.message
          : "The opening turn could not be prepared.";

      console.error("[sessions/start] opening turn failed after session creation", {
        sessionId: session.id,
        storyId: setup.source === "story" ? setup.story.id : null,
        worldId: setup.source === "world" ? setup.world.id : null,
        message,
      });

      return NextResponse.json({
        sessionId: session.id,
        warning: "The session was created, but the opening turn is still unavailable.",
      });
    }

    return NextResponse.json({ sessionId: session.id });
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
