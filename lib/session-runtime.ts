import "server-only";

import { ZodError } from "zod";
import { getSessionBundle, saveTurn } from "@/lib/db";
import {
  createStructuredOutputWithMetadata,
  RUNTIME_MODEL,
  streamTextOutputWithMetadata,
} from "@/lib/openai";
import {
  appendSessionSummary,
  buildRuntimeInputMessages,
  buildRuntimeTurnFinalizationMessages,
  buildRuntimeTurnOutput,
  createSessionTurn,
} from "@/lib/runtime";
import {
  runtimeTurnFinalizationJsonSchema,
  runtimeTurnFinalizationOutputSchema,
  runtimeTurnOutputSchema,
} from "@/lib/schemas";

type SessionTurnResult = {
  turn: ReturnType<typeof createSessionTurn>;
  summary: string;
  previousResponseId: string;
  debug: {
    inputMessages: unknown;
    sentPreviousResponseId: string;
    responseId: string;
    rawResponse: unknown;
  };
};

async function generateAndPersistSessionTurn(params: {
  sessionId: string;
  playerAction: string;
  userId: string;
  onTextDelta?: (delta: string) => void | Promise<void>;
}): Promise<SessionTurnResult> {
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

  const streamedStory = await streamTextOutputWithMetadata({
    input: inputMessages,
    model: RUNTIME_MODEL,
    previousResponseId: bundle.session.previousResponseId || undefined,
    onDelta: params.onTextDelta,
  });

  const finalizationResponse = await createStructuredOutputWithMetadata<unknown>({
    schemaName: "session_turn_finalize",
    schema: runtimeTurnFinalizationJsonSchema,
    input: buildRuntimeTurnFinalizationMessages({
      world: bundle.world,
      character: bundle.character,
      session: bundle.session,
      playerAction: params.playerAction,
      storyText: streamedStory.text,
    }),
    model: RUNTIME_MODEL,
    store: false,
  });

  let finalization;

  try {
    finalization = runtimeTurnFinalizationOutputSchema.parse(finalizationResponse.output);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("The runtime returned data that did not match the expected turn schema.");
    }

    throw error;
  }

  const output = runtimeTurnOutputSchema.parse(
    buildRuntimeTurnOutput({
      storyText: streamedStory.text,
      finalization,
    }),
  );

  const turn = createSessionTurn({
    playerAction: params.playerAction,
    turnNumber: bundle.session.turnCount + 1,
    output,
  });
  const nextSessionSummary = appendSessionSummary(bundle.session.summary, turn.summaryAfterTurn);
  const nextPreviousResponseId =
    streamedStory.responseId || bundle.session.previousResponseId || "";

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
      rawResponse: {
        streamEvents: streamedStory.rawEvents,
        finalization: finalizationResponse.rawResponse,
      },
    },
  };
}

export async function runSessionTurn(params: {
  sessionId: string;
  playerAction: string;
  userId: string;
}) {
  return generateAndPersistSessionTurn(params);
}

export async function streamSessionTurn(
  params: Parameters<typeof generateAndPersistSessionTurn>[0],
) {
  return generateAndPersistSessionTurn(params);
}
