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

    await runSessionTurn({
      sessionId: session.id,
      playerAction: setup.playable.firstAction,
      userId: user.id,
    });

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
