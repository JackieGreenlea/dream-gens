import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RuntimeEngineDebugError } from "@/lib/runtime-engines/types";
import { streamSessionTurn } from "@/lib/session-runtime";
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
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };

        try {
          const result = await streamSessionTurn({
            sessionId: input.sessionId,
            playerAction: input.playerAction,
            userId: user.id,
            onTextDelta(delta) {
              sendEvent("story_delta", { delta });
            },
          });

          console.info("[session-turn] success", {
            sessionId: input.sessionId,
            turnNumber: result.turn.turnNumber,
            responseId: result.previousResponseId,
          });

          sendEvent("complete", {
            turn: result.turn,
            previousResponseId: result.previousResponseId,
            ...(isDevelopment
              ? {
                  debug: result.debug,
                }
              : {}),
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to continue session.";
          console.error("[session-turn] stream failure", { message });
          sendEvent("error", {
            error: message,
            ...(isDevelopment && error instanceof RuntimeEngineDebugError
              ? {
                  debug: error.debug,
                }
              : {}),
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
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
