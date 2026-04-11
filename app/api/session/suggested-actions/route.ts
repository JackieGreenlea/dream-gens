import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RuntimeEnginePayloadError } from "@/lib/runtime-engines/types";
import { sessionSuggestedActionsRequestSchema } from "@/lib/schemas";
import { generateSessionSuggestedActions } from "@/lib/session-runtime";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to continue this session." }, { status: 401 });
    }

    const body = await request.json();
    const input = sessionSuggestedActionsRequestSchema.parse(body);
    const result = await generateSessionSuggestedActions({
      sessionId: input.sessionId,
      userId: user.id,
    });

    return NextResponse.json({
      turnNumber: result.turnNumber,
      suggestedActions: result.suggestedActions,
      payload: result.payload,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "The suggested-actions request did not match the expected schema.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unable to generate suggested actions.";

    return NextResponse.json(
      {
        error: message,
        ...(error instanceof RuntimeEnginePayloadError
          ? {
              payload: error.payload,
            }
          : {}),
      },
      { status: 502 },
    );
  }
}
