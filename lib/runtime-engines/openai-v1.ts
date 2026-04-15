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
  RuntimeEngineGenerateSuggestedActionsParams,
  RuntimeEngineGenerateSuggestedActionsResult,
  RuntimeEngineGenerateTurnParams,
  RuntimeEngineGenerateTurnResult,
} from "@/lib/runtime-engines/types";
import { StoryCardType } from "@/lib/types";

const RUNTIME_STORY_SYSTEM_PROMPT = `You are Everplot's session runtime.

Requirements:
- The latest user message is the action already taken.
- Continue directly from that action.
- Use present tense.
- Do not restate or paraphrase the player's submitted action at the start.
- Begin with the immediate consequence, reaction, reveal, or next beat.
- Keep player agency intact and move the scene forward.
- Respect POV, tone, story logic, relationship structure, intensity level, and runtime instructions.
- Prioritize live interaction over explanation.
- Keep character voices sharp, socially specific, and emotionally legible.
- Maintain continuity of proximity, touch, gaze, and body positioning unless the scene clearly changes them.
- Keep the central fantasy and current interpersonal pressure in motion.
- Avoid generic assistant-y narration, filler recap, lore-dump paragraphs, and vague stall-outs.
- Do not end on passive "wait and see" beats.
- Do not expose internal scaffolding.
- Return only the narrative story prose for this beat.
- Do not return JSON.
- Do not include field names, code fences, labels, or wrapper text.
- Keep the prose to 1-3 short paragraphs.
- Avoid one dense block of text.`;

const RUNTIME_OPENING_SYSTEM_PROMPT = `You are Everplot's session runtime.

Requirements:
- Generate the opening scene for this session before the player has acted.
- Set the scene around the selected character.
- Begin inside the opening scene, not with a synopsis.
- Establish tone, motion, chemistry, and immediate tension.
- Move directly into an opening beat that invites the player's first action.
- Do not describe a hidden player action or imply the player already chose something.
- Keep player agency intact and leave room for the player's first move.
- Respect POV, tone, story logic, relationship structure, intensity level, and runtime instructions.
- Foreground the most important counterpart, temptation, or pressure when appropriate.
- Maintain concrete physical staging, proximity, gaze, and emotional temperature.
- Avoid throat-clearing exposition, generic setup language, and bland scene-setter prose.
- Do not expose internal scaffolding.
- Return only the narrative story prose for this opening.
- Do not return JSON.
- Do not include field names, code fences, labels, or wrapper text.
- Keep the prose to 1-3 short paragraphs.
- Do not end responses with explicit player-prompt questions.
- Avoid one dense block of text.`;

const RUNTIME_SUGGESTED_ACTIONS_SYSTEM_PROMPT = `You are Everplot's suggested-actions generator.

Requirements:
- Read the completed story beat and return strictly valid JSON matching the requested schema.
- Suggested actions must reflect reasonable next moves in the current scene.
- Make them specific to the current pressure, relationship dynamic, and emotional temperature.
- Favor actions with clear interpersonal or erotic stakes when the scenario supports them.
- Return 2 to 3 suggested actions.
- Each suggested action must be 1-2 short sentences and no more than 20 words.
- Start each suggested action with a clear verb when possible.
- Do not restate the scene or write strategy commentary.
- Avoid bland menu actions that could fit any story.`;

const STORY_CARD_TYPE_LABELS: Record<StoryCardType, string> = {
  character: "Characters",
  location: "Locations",
  faction: "Factions",
  story_event: "Story Events",
};

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
  const activeStoryCardsSection = buildActiveStoryCardsSection(context);
  const sceneStateLines = buildSceneStateLines(context);

  if (context.isFirstTurn) {
    return [
      "Session Setup:",
      `Title: ${context.title}`,
      `POV: ${context.pov.replace("_", " ")}`,
      `Tone / Style: ${context.toneStyle}`,
      `Relationship Structure: ${context.relationshipStructure}`,
      `Intensity Level: ${context.intensityLevel}`,
      "",
      "Runtime Background:",
      context.runtimeBackground,
      "",
      "Opening Scene Anchor:",
      context.openingScene,
      "",
      "Selected Playable Character:",
      `${context.character.name}: ${context.character.description}`,
      sceneStateLines.length > 0 ? "" : null,
      sceneStateLines.length > 0 ? "Current Scene State:" : null,
      ...sceneStateLines,
      activeStoryCardsSection ? "" : null,
      activeStoryCardsSection,
      context.instructions.trim() ? "" : null,
      context.instructions.trim() ? "Compatibility Story Instructions:" : null,
      context.instructions.trim() ? context.instructions : null,
      "",
      "Launch Notes:",
      "This is the opening runtime turn for this session.",
      context.mode === "opening"
        ? "Generate an opening scene that invites the player's first action."
        : "The latest user message is the player's action already taken.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Continuity Packet:",
    `Title: ${context.title}`,
    `POV: ${context.pov.replace("_", " ")}`,
    `Tone / Style: ${context.toneStyle}`,
    `Relationship Structure: ${context.relationshipStructure}`,
    `Intensity Level: ${context.intensityLevel}`,
    `Rolling Story Summary: ${context.continuitySummary}`,
    `Character Anchor: ${context.character.name} — ${compactText(context.character.description, 180)}`,
    ...sceneStateLines.map((line, index) => (index === 0 ? `Scene State: ${line}` : line)),
    activeStoryCardsSection ? "" : null,
    activeStoryCardsSection,
    context.instructions.trim() ? "" : null,
    context.instructions.trim() ? `Compatibility Story Instructions: ${context.instructions}` : null,
  ].join("\n");
}

function buildActiveStoryCardsSection(context: ReturnType<typeof buildRuntimeContextPacket>) {
  if (context.activeStoryCards.length === 0) {
    return "";
  }

  const lines = ["Active Story Cards:"];

  for (const type of Object.keys(STORY_CARD_TYPE_LABELS) as StoryCardType[]) {
    const cards = context.activeStoryCards.filter((card) => card.type === type);

    if (cards.length === 0) {
      continue;
    }

    lines.push(`${STORY_CARD_TYPE_LABELS[type]}:`);

    for (const card of cards) {
      lines.push(`- ${card.title}: ${compactText(card.description, 160)}`);
    }
  }

  return lines.join("\n");
}

function buildSceneStateLines(context: ReturnType<typeof buildRuntimeContextPacket>) {
  const lines: string[] = [];

  if (context.sceneState.focalCharacterNames.length > 0) {
    lines.push(`Foregrounded Counterparts: ${context.sceneState.focalCharacterNames.join(", ")}`);
  }

  if (context.sceneState.currentLocation) {
    lines.push(`Current Location: ${context.sceneState.currentLocation}`);
  }

  if (context.sceneState.activePressure) {
    lines.push(`Active Pressure: ${context.sceneState.activePressure}`);
  }

  if (context.sceneState.latestBeat) {
    lines.push(`Latest Beat: ${context.sceneState.latestBeat}`);
  }

  return lines;
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
        ? [
            "Generate the opening scene for this session.",
            "",
            `Begin inside this exact opening moment: ${params.context.openingScene}`,
            "Drop immediately into a live, charged scene rather than summarizing setup.",
            "Keep the focus on the selected character, the most important counterpart or pressure, and the player's next opportunity to act.",
          ].join("\n")
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
    toInputMessage("system", RUNTIME_SUGGESTED_ACTIONS_SYSTEM_PROMPT),
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
            "Return JSON with suggestedActions only.",
          ].join("\n")
        : [
            `Player action: ${params.playerAction.trim()}`,
            "",
            "Completed story beat:",
            params.storyText.trim(),
            "",
            "Return JSON with suggestedActions only.",
          ].join("\n"),
    ),
  ];
}

async function generateOpenAITurn(
  params: RuntimeEngineGenerateTurnParams,
): Promise<RuntimeEngineGenerateTurnResult> {
  const mode = params.mode ?? "turn";
  const context = buildRuntimeContextPacket({
    story: params.story,
    character: params.character,
    session: params.session,
    mode,
    playerAction: params.playerAction,
  });
  const inputMessages = buildOpenAIInputMessages({
    context,
    playerAction: params.playerAction,
  });
  console.info(
    `[openai-v1] exact api request\n${JSON.stringify(
      {
        model: RUNTIME_MODEL,
        input: inputMessages,
        ...(params.session.previousResponseId
          ? { previous_response_id: params.session.previousResponseId }
          : {}),
      },
      null,
      2,
    )}`,
  );

  const streamedStory = await streamTextOutputWithMetadata({
    input: inputMessages,
    model: RUNTIME_MODEL,
    previousResponseId: params.session.previousResponseId || undefined,
    onDelta: params.onTextDelta,
  });
  const output = runtimeTurnOutputSchema.parse(
    buildRuntimeTurnOutput({
      storyText: streamedStory.text,
    }),
  );

  return {
    output,
    responseId: streamedStory.responseId || params.session.previousResponseId || "",
    payload: {
      engineId: "openai_v1",
      inputMessages,
      sentPreviousResponseId: params.session.previousResponseId || "",
      sentStoryCardIds: context.activeStoryCards.map((card) => card.id),
    },
  };
}

async function generateOpenAISuggestedActions(
  params: RuntimeEngineGenerateSuggestedActionsParams,
): Promise<RuntimeEngineGenerateSuggestedActionsResult> {
  const mode = params.turn.playerAction.trim() ? "turn" : "opening";
  const context = buildRuntimeContextPacket({
    story: params.story,
    character: params.character,
    session: params.session,
    mode,
    playerAction: params.turn.playerAction,
  });
  const inputMessages = buildOpenAIFinalizationMessages({
    context,
    playerAction: params.turn.playerAction,
    storyText: params.turn.storyText,
  });
  console.info(
    `[openai-v1] exact api request\n${JSON.stringify(
      {
        model: RUNTIME_MODEL,
        input: inputMessages,
        schemaName: "session_turn_suggested_actions",
        schema: runtimeTurnFinalizationJsonSchema,
        store: false,
      },
      null,
      2,
    )}`,
  );

  const response = await createStructuredOutputWithMetadata<unknown>({
    schemaName: "session_turn_suggested_actions",
    schema: runtimeTurnFinalizationJsonSchema,
    input: inputMessages,
    model: RUNTIME_MODEL,
    store: false,
  });

  let output;

  try {
    output = runtimeTurnFinalizationOutputSchema.parse(response.output);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("The runtime returned data that did not match the expected suggested-actions schema.");
    }

    throw error;
  }

  return {
    suggestedActions: output.suggestedActions,
    payload: {
      engineId: "openai_v1",
      inputMessages,
      sentPreviousResponseId: params.session.previousResponseId || "",
      sentStoryCardIds: [],
    },
  };
}

export const openaiV1RuntimeEngine: RuntimeEngine = {
  id: "openai_v1",
  generateTurn: generateOpenAITurn,
  generateSuggestedActions: generateOpenAISuggestedActions,
};
