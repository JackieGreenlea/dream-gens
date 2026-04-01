import "server-only";

import { ZodError } from "zod";
import { getSessionBundle, saveTurn } from "@/lib/db";
import { createStructuredOutputWithMetadata, RUNTIME_MODEL } from "@/lib/openai";
import { appendSessionSummary, buildRuntimeInputMessages, createSessionTurn } from "@/lib/runtime";
import { runtimeTurnJsonSchema, runtimeTurnOutputSchema } from "@/lib/schemas";

export async function runSessionTurn(params: {
  sessionId: string;
  playerAction: string;
  userId: string;
}) {
  const bundle = await getSessionBundle(params.sessionId, params.userId);

  if (!bundle || !bundle.character) {
    throw new Error("Session context could not be loaded.");
  }

  const inputMessages = buildRuntimeInputMessages({
    world: bundle.world,
    character: bundle.character,
    session: bundle.session,
    playerAction: params.playerAction,
  });

  const runtimeResponse = await createStructuredOutputWithMetadata<unknown>({
    schemaName: "session_turn",
    schema: runtimeTurnJsonSchema,
    input: inputMessages,
    model: RUNTIME_MODEL,
    previousResponseId: bundle.session.previousResponseId || undefined,
  });

  let output;

  try {
    output = runtimeTurnOutputSchema.parse(runtimeResponse.output);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("The runtime returned data that did not match the expected turn schema.");
    }

    throw error;
  }

  const turn = createSessionTurn({
    playerAction: params.playerAction,
    turnNumber: bundle.session.turnCount + 1,
    output,
  });
  const nextSessionSummary = appendSessionSummary(bundle.session.summary, turn.summaryAfterTurn);

  const nextPreviousResponseId = runtimeResponse.responseId || bundle.session.previousResponseId || "";
  await saveTurn({
    sessionId: bundle.session.id,
    turn,
    summary: nextSessionSummary,
    previousResponseId: nextPreviousResponseId,
  });

  return {
    turn,
    summary: nextSessionSummary,
    previousResponseId: nextPreviousResponseId,
    debug: {
      inputMessages,
      sentPreviousResponseId: bundle.session.previousResponseId || "",
      responseId: nextPreviousResponseId,
      rawResponse: runtimeResponse.rawResponse,
    },
  };
}
