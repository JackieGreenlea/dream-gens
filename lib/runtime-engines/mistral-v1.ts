import "server-only";

import { ZodError } from "zod";
import { buildRuntimeContextPacket } from "@/lib/runtime-context";
import { buildRuntimeTurnOutput } from "@/lib/runtime-turns";
import { runtimeTurnFinalizationOutputSchema, runtimeTurnOutputSchema } from "@/lib/schemas";
import {
  RuntimeEngine,
  RuntimeEnginePayloadError,
  RuntimeEngineGenerateSuggestedActionsParams,
  RuntimeEngineGenerateSuggestedActionsResult,
  RuntimeEngineGenerateTurnParams,
  RuntimeEngineGenerateTurnResult,
} from "@/lib/runtime-engines/types";
import { StoryCardType } from "@/lib/types";

const MISTRAL_CHAT_COMPLETIONS_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_RUNTIME_MODEL = process.env.MISTRAL_RUNTIME_MODEL || "mistral-tiny-latest";
const MISTRAL_RUNTIME_TEMPERATURE = readEnvFloat("MISTRAL_RUNTIME_TEMPERATURE", 0.85);
const MISTRAL_OPENING_MAX_TOKENS = readEnvInt("MISTRAL_OPENING_MAX_TOKENS", 220);
const MISTRAL_RUNTIME_MAX_TOKENS = readEnvInt("MISTRAL_RUNTIME_MAX_TOKENS", 160);
const MISTRAL_FINALIZER_MAX_TOKENS = readEnvInt("MISTRAL_FINALIZER_MAX_TOKENS", 120);
const MISTRAL_RUNTIME_RANDOM_SEED = readOptionalEnvInt("MISTRAL_RUNTIME_RANDOM_SEED");
const INSTRUCTION_REMINDER_INTERVAL = 10;

type MistralMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const STORY_CARD_TYPE_LABELS: Record<StoryCardType, string> = {
  character: "Characters",
  location: "Locations",
  faction: "Factions",
  story_event: "Story Events",
};

const RUNTIME_OPENING_SYSTEM_PROMPT = `You are a roleplay chat partner. Follow the user's roleplay instructions closely.

Rules:
- Keep it to 2-4 sentences.
- Use present tense and 2nd person POV.
- Never paraphrase the user’s submitted action.
- Never write dialogue, thoughts, or actions for the user-controlled character.
- Ensure each character has a distinct voice, personality, and mannerisms.
- Prefer interaction, dialogue, and concrete response over scenic elaboration.
- Begin inside the opening scene instead of summarizing setup.
- Keep the central fantasy, chemistry, and immediate pressure active on the page.
- Maintain continuity of body positioning, touch, gaze, and proximity.
- Avoid generic filler, lore-dump openings, and vague anticipation.
- Start in motion around the user-controlled character.
- Make something happen immediately.`;

const RUNTIME_STORY_SYSTEM_PROMPT = `You are a roleplay chat partner. Follow the user's roleplay instructions closely.

Rules:
- Keep it to 2-4 sentences.
- Use present tense and 2nd person POV.
- Never paraphrase the user’s submitted action.
- Never write dialogue, thoughts, or actions for the user-controlled character.
- Ensure each character has a distinct voice, personality, and mannerisms.
- Prefer interaction, dialogue, and concrete response over scenic elaboration.
- Preserve the core fantasy, current scene pressure, and relationship dynamic.
- Maintain continuity of body positioning, touch, gaze, and proximity unless the scene clearly changes them.
- Avoid generic filler, vague "wait and see" endings, and detached narrator voice.`;

const RUNTIME_SUGGESTED_ACTIONS_SYSTEM_PROMPT = `Return only valid JSON.

Required keys:
- suggestedActions

Rules:
- suggestedActions: 2 to 3 short next moves.
- Start each suggested action with a clear verb when possible.
- Make them specific to the current pressure, counterpart dynamic, and scene temperature.
- Favor emotionally charged or erotically charged options when the story supports them.
- Do not include commentary, labels, or recap text outside the JSON object.`;

type MistralChatResponse = {
  id?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type MistralStreamEvent = {
  id?: string;
  choices?: Array<{
    delta?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
    finish_reason?: string | null;
  }>;
  error?: {
    message?: string;
  };
};

function getMistralApiKey() {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new Error("Missing MISTRAL_API_KEY.");
  }

  return apiKey;
}

function readEnvFloat(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readEnvInt(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function readOptionalEnvInt(name: string) {
  const raw = process.env[name];

  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function buildOpeningContextPacket(context: ReturnType<typeof buildRuntimeContextPacket>) {
  const lines = [
    "# Opening State",
    `- Title: ${context.title}`,
    `- POV: ${context.pov.replace("_", " ")}`,
    `- Tone / Style: ${context.toneStyle}`,
    `- Runtime Background: ${context.runtimeBackground}`,
    `- Opening Scene Anchor: ${context.openingScene}`,
    `- Relationship Structure: ${context.relationshipStructure}`,
    `- Intensity Level: ${context.intensityLevel}`,
    `- User-controlled character: ${context.character.name} — ${compactText(context.character.description, 180)}`,
  ];

  if (context.sceneState.focalCharacterNames.length > 0) {
    lines.push(`- Foregrounded counterparts: ${context.sceneState.focalCharacterNames.join(", ")}`);
  }

  if (context.sceneState.currentLocation) {
    lines.push(`- Current location: ${context.sceneState.currentLocation}`);
  }

  if (context.sceneState.activePressure) {
    lines.push(`- Active pressure: ${context.sceneState.activePressure}`);
  }

  const activeStoryCardLines = buildActiveStoryCardLines(context);

  if (activeStoryCardLines.length > 0) {
    lines.push(...activeStoryCardLines);
  }

  if (context.instructions.trim()) {
    lines.push(`- Compatibility Story Instructions: ${context.instructions}`);
  }

  return lines.join("\n");
}

function buildContinuityContextPacket(context: ReturnType<typeof buildRuntimeContextPacket>) {
  const lines = ["# Continuity State"];

  if (shouldIncludeInstructionReminder(context)) {
    lines.push(`- POV: ${context.pov.replace("_", " ")}`);
  }

  lines.push(`- Relationship Structure: ${context.relationshipStructure}`);
  lines.push(`- Intensity Level: ${context.intensityLevel}`);
  lines.push(`- User-controlled character: ${context.character.name} — ${compactText(context.character.description, 180)}`);
  lines.push(`- Rolling Story Summary: ${context.continuitySummary}`);

  if (context.sceneState.focalCharacterNames.length > 0) {
    lines.push(`- Foregrounded counterparts: ${context.sceneState.focalCharacterNames.join(", ")}`);
  }

  if (context.sceneState.currentLocation) {
    lines.push(`- Current location: ${context.sceneState.currentLocation}`);
  }

  if (context.sceneState.activePressure) {
    lines.push(`- Active pressure: ${context.sceneState.activePressure}`);
  }

  if (context.sceneState.latestBeat) {
    lines.push(`- Latest beat: ${context.sceneState.latestBeat}`);
  }

  const activeStoryCardLines = buildActiveStoryCardLines(context);

  if (activeStoryCardLines.length > 0) {
    lines.push(...activeStoryCardLines);
  }

  if (shouldIncludeInstructionReminder(context) && context.instructions.trim()) {
    lines.push(`- Compatibility Story Instructions: ${context.instructions}`);
  }

  return lines.join("\n");
}

function buildActiveStoryCardLines(context: ReturnType<typeof buildRuntimeContextPacket>) {
  if (context.activeStoryCards.length === 0) {
    return [];
  }

  const lines = ["- Active Story Cards:"];

  for (const type of Object.keys(STORY_CARD_TYPE_LABELS) as StoryCardType[]) {
    const cards = context.activeStoryCards.filter((card) => card.type === type);

    if (cards.length === 0) {
      continue;
    }

    lines.push(`  - ${STORY_CARD_TYPE_LABELS[type]}:`);

    for (const card of cards) {
      lines.push(`    - ${card.title}: ${compactText(card.description, 160)}`);
    }
  }

  return lines;
}

function shouldIncludeInstructionReminder(context: ReturnType<typeof buildRuntimeContextPacket>) {
  if (context.mode === "opening") {
    return true;
  }

  const upcomingTurnNumber = context.turnCount + 1;
  return upcomingTurnNumber % INSTRUCTION_REMINDER_INTERVAL === 0;
}

function buildContextPacketMessage(
  context: ReturnType<typeof buildRuntimeContextPacket>,
): MistralMessage {
  return {
    role: "system",
    content: context.mode === "opening" ? buildOpeningContextPacket(context) : buildContinuityContextPacket(context),
  };
}

function buildHistoricalActionMessage(turnNumber: number, action: string): MistralMessage {
  return {
    role: "user",
    content: [
      action.trim(),
    ].join("\n\n"),
  };
}

function buildCurrentActionMessage(action: string): MistralMessage {
  return {
    role: "user",
    content: [
      action.trim(),
    ].join("\n\n"),
  };
}

function normalizeHistoricalAssistantContent(storyText: string) {
  const trimmed = storyText.trim();
  const openingMatch = trimmed.match(/(?:^|\n)Opening:\n([\s\S]+)$/);

  if (openingMatch?.[1]) {
    return openingMatch[1].trim();
  }

  return trimmed;
}

function buildRecentHistoryMessages(
  turns: ReturnType<typeof buildRuntimeContextPacket>["recentTurns"],
): MistralMessage[] {
  return turns.flatMap((turn) => {
    const messages: MistralMessage[] = [];

    if (turn.playerAction.trim()) {
      messages.push(buildHistoricalActionMessage(turn.turnNumber, turn.playerAction));
    }

    messages.push({
      role: "assistant",
      content: normalizeHistoricalAssistantContent(turn.storyText),
    });

    return messages;
  });
}

function buildOpeningRequestMessage(): MistralMessage {
  return {
    role: "user",
    content: [
      "# Opening Request",
      "Begin inside the opening scene anchor you were given.",
      "Write a live opening beat, not a synopsis.",
    ].join("\n\n"),
  };
}

function buildMistralStoryMessages(params: {
  context: ReturnType<typeof buildRuntimeContextPacket>;
  playerAction: string;
}): MistralMessage[] {
  const messages: MistralMessage[] = [
    {
      role: "system",
      content:
        params.context.mode === "opening" ? RUNTIME_OPENING_SYSTEM_PROMPT : RUNTIME_STORY_SYSTEM_PROMPT,
    },
    buildContextPacketMessage(params.context),
  ];

  if (params.context.mode === "opening") {
    messages.push(buildOpeningRequestMessage());
    return messages;
  }

  messages.push(...buildRecentHistoryMessages(params.context.recentTurns));
  messages.push(buildCurrentActionMessage(params.playerAction));

  return messages;
}

function buildMistralFinalizationMessages(params: {
  context: ReturnType<typeof buildRuntimeContextPacket>;
  playerAction: string;
  storyText: string;
}): MistralMessage[] {
  return [
    {
      role: "system",
      content: RUNTIME_SUGGESTED_ACTIONS_SYSTEM_PROMPT,
    },
    buildContextPacketMessage(params.context),
    {
      role: "assistant",
      content: params.storyText.trim(),
    },
    {
      role: "user",
      content:
        params.context.mode === "opening"
          ? [
              "# Suggested Actions",
              "Return JSON only with key suggestedActions.",
              "The assistant message above is the opening scene.",
              `Relationship structure: ${params.context.relationshipStructure}`,
              `Intensity level: ${params.context.intensityLevel}`,
            ].join("\n\n")
          : [
              "# Suggested Actions",
              "Return JSON only with key suggestedActions.",
              `The user action that led to the assistant message above was:\n${params.playerAction.trim()}`,
              `Relationship structure: ${params.context.relationshipStructure}`,
              `Intensity level: ${params.context.intensityLevel}`,
            ].join("\n\n"),
    },
  ];
}

function readMistralContent(
  content: string | Array<{ type?: string; text?: string }> | undefined,
) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((item) => item.type === "text" && typeof item.text === "string")
      .map((item) => item.text)
      .join("");
  }

  return "";
}

async function streamMistralText(params: {
  mode: "opening" | "turn";
  messages: MistralMessage[];
  onDelta?: (delta: string) => void | Promise<void>;
}) {
  const requestStartMs = Date.now();
  const maxTokens =
    params.mode === "opening" ? MISTRAL_OPENING_MAX_TOKENS : MISTRAL_RUNTIME_MAX_TOKENS;
  const requestBody = {
    model: MISTRAL_RUNTIME_MODEL,
    stream: true,
    temperature: MISTRAL_RUNTIME_TEMPERATURE,
    top_p: 0.9,
    presence_penalty: 0.5,
    frequency_penalty: 0.4,
    max_tokens: maxTokens,
    ...(typeof MISTRAL_RUNTIME_RANDOM_SEED === "number"
      ? { random_seed: MISTRAL_RUNTIME_RANDOM_SEED }
      : {}),
    response_format: {
      type: "text" as const,
    },
    messages: params.messages,
  };
  console.info(
    `[mistral-v1] exact api request\n${JSON.stringify(requestBody, null, 2)}`,
  );

  const response = await fetch(MISTRAL_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getMistralApiKey()}`,
    },
    body: JSON.stringify(requestBody),
  });
  console.info("[mistral-v1] fetch responded", {
    model: MISTRAL_RUNTIME_MODEL,
    elapsedMs: Date.now() - requestStartMs,
    ok: response.ok,
    status: response.status,
  });

  if (!response.ok) {
    const json = (await response.json()) as MistralChatResponse;
    throw new Error(json.error?.message || "Mistral streaming request failed.");
  }

  if (!response.body) {
    throw new Error("Mistral streaming response body was missing.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const rawEvents: MistralStreamEvent[] = [];
  let responseId = "";
  let finishReason = "";
  let text = "";
  let buffer = "";
  let firstDeltaLogged = false;

  async function processEventBlock(block: string) {
    const lines = block
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean);

    if (lines.length === 0) {
      return;
    }

    const dataLines = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());

    if (dataLines.length === 0) {
      return;
    }

    const data = dataLines.join("\n");

    if (data === "[DONE]") {
      return;
    }

    const event = JSON.parse(data) as MistralStreamEvent;
    rawEvents.push(event);

    if (event.id && !responseId) {
      responseId = event.id;
    }

    const eventFinishReason = event.choices?.[0]?.finish_reason;

    if (typeof eventFinishReason === "string" && eventFinishReason.length > 0) {
      finishReason = eventFinishReason;
    }

    const deltaText = readMistralContent(event.choices?.[0]?.delta?.content);

    if (deltaText) {
      if (!firstDeltaLogged) {
        firstDeltaLogged = true;
        console.info("[mistral-v1] first delta", {
          model: MISTRAL_RUNTIME_MODEL,
          elapsedMs: Date.now() - requestStartMs,
        });
      }
      text += deltaText;
      await params.onDelta?.(deltaText);
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      await processEventBlock(block);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    await processEventBlock(buffer);
  }

  console.info("[mistral-v1] stream completed", {
    model: MISTRAL_RUNTIME_MODEL,
    elapsedMs: Date.now() - requestStartMs,
    textLength: text.trim().length,
    finishReason,
  });

  return {
    text: text.trim(),
    responseId,
    finishReason,
    rawEvents,
  };
}

async function finalizeMistralTurn(params: {
  messages: MistralMessage[];
}) {
  const requestBody = {
    model: MISTRAL_RUNTIME_MODEL,
    temperature: 0,
    max_tokens: MISTRAL_FINALIZER_MAX_TOKENS,
    ...(typeof MISTRAL_RUNTIME_RANDOM_SEED === "number"
      ? { random_seed: MISTRAL_RUNTIME_RANDOM_SEED }
      : {}),
    response_format: {
      type: "json_object" as const,
    },
    messages: params.messages,
  };

  console.info(
    `[mistral-v1] exact api request\n${JSON.stringify(requestBody, null, 2)}`,
  );

  const response = await fetch(MISTRAL_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getMistralApiKey()}`,
    },
    body: JSON.stringify(requestBody),
  });

  const json = (await response.json()) as MistralChatResponse;

  if (!response.ok) {
    throw new Error(json.error?.message || "Mistral finalization request failed.");
  }

  const content = readMistralContent(json.choices?.[0]?.message?.content);

  if (!content) {
    throw new Error("Mistral finalization response did not include JSON content.");
  }

  let parsedOutput: unknown;

  try {
    parsedOutput = JSON.parse(content) as unknown;
  } catch {
    throw new RuntimeEnginePayloadError("Mistral finalization returned invalid JSON.", {
      engineId: "mistral_v1",
      inputMessages: params.messages,
      sentPreviousResponseId: "",
      sentStoryCardIds: [],
    });
  }

  return {
    output: parsedOutput,
    responseId: json.id || "",
    rawResponse: json,
    rawText: content,
  };
}

async function generateMistralTurn(
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
  const inputMessages = buildMistralStoryMessages({
    context,
    playerAction: params.playerAction,
  });

  const streamedStory = await streamMistralText({
    mode,
    messages: inputMessages,
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
      engineId: "mistral_v1",
      inputMessages,
      sentPreviousResponseId: "",
      sentStoryCardIds: context.activeStoryCards.map((card) => card.id),
    },
  };
}

async function generateMistralSuggestedActions(
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
  const inputMessages = buildMistralFinalizationMessages({
    context,
    playerAction: params.turn.playerAction,
    storyText: params.turn.storyText,
  });
  const response = await finalizeMistralTurn({
    messages: inputMessages,
  });

  let output;

  try {
    output = runtimeTurnFinalizationOutputSchema.parse(response.output);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new RuntimeEnginePayloadError(
        "The runtime returned data that did not match the expected suggested-actions schema.",
        {
          engineId: "mistral_v1",
          inputMessages,
          sentPreviousResponseId: "",
          sentStoryCardIds: [],
        },
      );
    }

    throw error;
  }

  return {
    suggestedActions: output.suggestedActions,
    payload: {
      engineId: "mistral_v1",
      inputMessages,
      sentPreviousResponseId: "",
      sentStoryCardIds: [],
    },
  };
}

export const mistralV1RuntimeEngine: RuntimeEngine = {
  id: "mistral_v1",
  generateTurn: generateMistralTurn,
  generateSuggestedActions: generateMistralSuggestedActions,
};
