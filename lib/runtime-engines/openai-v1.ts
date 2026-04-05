import "server-only";

import { ZodError } from "zod";
import {
  OpenAIInputMessage,
  createStructuredOutputWithMetadata,
  RUNTIME_MODEL,
  streamTextOutputWithMetadata,
} from "@/lib/openai";
import { buildRuntimeContextPacket } from "@/lib/runtime-context";
import { buildRuntimeTurnOutput } from "@/lib/runtime-turns";
import {
  runtimeTurnFinalizationJsonSchema,
  runtimeTurnFinalizationOutputSchema,
  runtimeTurnOutputSchema,
} from "@/lib/schemas";
import {
  RuntimeEngine,
  RuntimeEngineDebugPayload,
  RuntimeEngineGenerateTurnParams,
  RuntimeEngineGenerateTurnResult,
} from "@/lib/runtime-engines/types";

const RUNTIME_STORY_SYSTEM_PROMPT = `You are Story World Studio's session runtime.

Requirements:
- The latest user message is the action already taken.
- Continue directly from that action.
- Use present tense.
- Do not restate or paraphrase the player's submitted action at the start.
- Begin with the immediate consequence, reaction, reveal, or next beat.
- Keep player agency intact and move the scene forward.
- Respect POV, tone, story logic, and runtime instructions.
- Use the character's strengths and weaknesses narratively, not as mechanics.
- Do not expose internal scaffolding.
- Return only the narrative story prose for this beat.
- Do not return JSON.
- Do not include field names, code fences, labels, or wrapper text.
- Keep the prose to 1-3 short paragraphs.
- Avoid one dense block of text.`;

const RUNTIME_OPENING_SYSTEM_PROMPT = `You are Story World Studio's session runtime.

Requirements:
- Generate the opening scene for this session before the player has acted.
- Set the scene around the selected character.
- Establish tone, motion, and immediate tension.
- Move directly into an opening beat that invites the player's first action.
- Do not describe a hidden player action or imply the player already chose something.
- Keep player agency intact and leave room for the player's first move.
- Respect POV, tone, story logic, and runtime instructions.
- Use the character's strengths and weaknesses narratively, not as mechanics.
- Do not expose internal scaffolding.
- Return only the narrative story prose for this opening.
- Do not return JSON.
- Do not include field names, code fences, labels, or wrapper text.
- Keep the prose to 1-3 short paragraphs.
- Do not end responses with explicit player-prompt questions.
- Avoid one dense block of text.`;

const RUNTIME_FINALIZATION_SYSTEM_PROMPT = `You are Story World Studio's turn finalizer.

Requirements:
- Read the completed story beat and return strictly valid JSON matching the requested schema.
- summary must be a very short continuity note, not a recap paragraph.
- Keep summary to about 20 words maximum.
- Prefer one short sentence.
- summary should capture only what newly happened that still matters.
- Suggested actions must reflect reasonable next moves in the current scene.
- Return 2 to 3 suggested actions.
- Each suggested action must be 1-2 short sentences and no more than 20 words.
- Start each suggested action with a clear verb when possible.
- Do not restate the scene or write strategy commentary.`;

function toInputMessage(role: OpenAIInputMessage["role"], text: string): OpenAIInputMessage {
  if (role === "assistant") {
    return {
      role,
      content: [{ type: "output_text", text }],
    };
  }

  return {
    role,
    content: [{ type: "input_text", text }],
  };
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function buildOpenAIDeveloperMessage(
  context: ReturnType<typeof buildRuntimeContextPacket>,
) {
  if (context.isFirstTurn) {
    return [
      "Session Setup:",
      `Title: ${context.title}`,
      `POV: ${context.pov.replace("_", " ")}`,
      `Tone / Style: ${context.toneStyle}`,
      `Objective: ${context.objective}`,
      "",
      "Story Instructions:",
      context.instructions,
      "",
      "Story Background:",
      context.background,
      "",
      "Selected Playable Character:",
      `${context.character.name}: ${context.character.description}`,
      `Strengths: ${context.character.strengths.join(", ")}`,
      `Weaknesses: ${context.character.weaknesses.join(", ")}`,
      "",
      "Launch Notes:",
      "This is the opening runtime turn for this session.",
      context.mode === "opening"
        ? "Generate an opening scene that invites the player's first action."
        : "The latest user message is the player's action already taken.",
      context.openingGuidance
        ? `Optional opening guidance from the story template: ${context.openingGuidance}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Continuity Packet:",
    `Title: ${context.title}`,
    `POV: ${context.pov.replace("_", " ")}`,
    `Tone / Style: ${context.toneStyle}`,
    `Objective: ${context.objective}`,
    `Runtime Instructions: ${compactText(context.instructions, 220)}`,
    `Character Anchor: ${context.character.name} — ${compactText(context.character.description, 180)}`,
    `Strengths: ${context.character.strengths.join(", ")}`,
    `Weaknesses: ${context.character.weaknesses.join(", ")}`,
    `Continuity Summary: ${context.continuitySummary}`,
  ].join("\n");
}

function buildOpenAIInputMessages(params: {
  context: ReturnType<typeof buildRuntimeContextPacket>;
  playerAction: string;
}): OpenAIInputMessage[] {
  return [
    toInputMessage(
      "system",
      params.context.mode === "opening" ? RUNTIME_OPENING_SYSTEM_PROMPT : RUNTIME_STORY_SYSTEM_PROMPT,
    ),
    toInputMessage("developer", buildOpenAIDeveloperMessage(params.context)),
    toInputMessage(
      "user",
      params.context.mode === "opening"
        ? "Generate the opening scene for this session. Introduce the selected character, establish the situation, and end by inviting the player's first action."
        : params.playerAction.trim(),
    ),
  ];
}

function buildOpenAIFinalizationMessages(params: {
  context: ReturnType<typeof buildRuntimeContextPacket>;
  playerAction: string;
  storyText: string;
}): OpenAIInputMessage[] {
  return [
    toInputMessage("system", RUNTIME_FINALIZATION_SYSTEM_PROMPT),
    toInputMessage("developer", buildOpenAIDeveloperMessage(params.context)),
    toInputMessage(
      "user",
      params.context.mode === "opening"
        ? [
            "This is the opening scene for the session.",
            "",
            "Completed story beat:",
            params.storyText.trim(),
            "",
            "Return JSON with suggestedActions and summary only.",
          ].join("\n")
        : [
            `Player action: ${params.playerAction.trim()}`,
            "",
            "Completed story beat:",
            params.storyText.trim(),
            "",
            "Return JSON with suggestedActions and summary only.",
          ].join("\n"),
    ),
  ];
}

async function generateOpenAITurn(
  params: RuntimeEngineGenerateTurnParams,
): Promise<RuntimeEngineGenerateTurnResult> {
  const mode = params.mode ?? "turn";
  const context = buildRuntimeContextPacket({
    world: params.world,
    character: params.character,
    session: params.session,
    mode,
  });
  const inputMessages = buildOpenAIInputMessages({
    context,
    playerAction: params.playerAction,
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
    input: buildOpenAIFinalizationMessages({
      context,
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

  const debug: RuntimeEngineDebugPayload = {
    engineId: "openai_v1",
    inputMessages,
    sentPreviousResponseId: params.session.previousResponseId || "",
    rawResponse: {
      streamEvents: streamedStory.rawEvents,
      finalization: finalizationResponse.rawResponse,
    },
  };

  return {
    output,
    responseId: streamedStory.responseId || params.session.previousResponseId || "",
    debug,
  };
}

export const openaiV1RuntimeEngine: RuntimeEngine = {
  id: "openai_v1",
  generateTurn: generateOpenAITurn,
};
