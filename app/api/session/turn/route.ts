import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { runSessionTurn } from "@/lib/session-runtime";
import { runtimeTurnRequestSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  console.info("[session-turn] start");
  const isDevelopment = process.env.NODE_ENV !== "production";

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to continue this session." }, { status: 401 });
    }

    const body = await request.json();
    const input = runtimeTurnRequestSchema.parse(body);
    const result = await runSessionTurn({
      sessionId: input.sessionId,
      playerAction: input.playerAction,
      userId: user.id,
    });

    console.info("[session-turn] success", {
      sessionId: input.sessionId,
      turnNumber: result.turn.turnNumber,
      responseId: result.previousResponseId,
    });

    return NextResponse.json({
      turn: result.turn,
      summary: result.summary,
      suggestedActions: result.turn.suggestedActions,
      previousResponseId: result.previousResponseId,
      ...(isDevelopment
        ? {
            debug: result.debug,
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("[session-turn] request schema failure", error.flatten());

      return NextResponse.json(
        {
          error: "The session turn request did not match the expected schema.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to continue session.";
    console.error("[session-turn] api failure", { message });

    if (message === "Session context could not be loaded.") {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
