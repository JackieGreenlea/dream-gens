import "server-only";

import { ZodError } from "zod";
import {
  createStructuredOutputWithMetadata,
  RUNTIME_MODEL,
  streamTextOutputWithMetadata,
} from "@/lib/openai";
import {
  buildRuntimeInputMessages,
  buildRuntimeTurnFinalizationMessages,
  buildRuntimeTurnOutput,
} from "@/lib/runtime";
import {
  runtimeTurnFinalizationJsonSchema,
  runtimeTurnFinalizationOutputSchema,
  runtimeTurnOutputSchema,
} from "@/lib/schemas";
import {
  RuntimeEngine,
  RuntimeEngineGenerateTurnParams,
  RuntimeEngineGenerateTurnResult,
} from "@/lib/runtime-engines/types";

async function generateOpenAITurn(
  params: RuntimeEngineGenerateTurnParams,
): Promise<RuntimeEngineGenerateTurnResult> {
  const mode = params.mode ?? "turn";
  const inputMessages = buildRuntimeInputMessages({
    world: params.world,
    character: params.character,
    session: params.session,
    playerAction: params.playerAction,
    mode,
  });

  const streamedStory = await streamTextOutputWithMetadata({
    input: inputMessages,
    model: RUNTIME_MODEL,
    previousResponseId: params.session.previousResponseId || undefined,
    onDelta: params.onTextDelta,
  });

  const finalizationResponse = await createStructuredOutputWithMetadata<unknown>({
    schemaName: "session_turn_finalize",
    schema: runtimeTurnFinalizationJsonSchema,
    input: buildRuntimeTurnFinalizationMessages({
      world: params.world,
      character: params.character,
      session: params.session,
      playerAction: params.playerAction,
      storyText: streamedStory.text,
      mode,
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

  return {
    output,
    responseId: streamedStory.responseId || params.session.previousResponseId || "",
    debug: {
      inputMessages,
      sentPreviousResponseId: params.session.previousResponseId || "",
      rawResponse: {
        streamEvents: streamedStory.rawEvents,
        finalization: finalizationResponse.rawResponse,
      },
    },
  };
}

export const openaiV1RuntimeEngine: RuntimeEngine = {
  id: "openai_v1",
  generateTurn: generateOpenAITurn,
};
