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
import { StoryPov } from "@/lib/types";

const MISTRAL_CHAT_COMPLETIONS_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_RUNTIME_MODEL = process.env.MISTRAL_RUNTIME_MODEL || "mistral-tiny-latest";
const MISTRAL_RUNTIME_TEMPERATURE = readEnvFloat("MISTRAL_RUNTIME_TEMPERATURE", 0.95);
const MISTRAL_OPENING_MAX_TOKENS = readEnvInt("MISTRAL_OPENING_MAX_TOKENS", 240);
const MISTRAL_RUNTIME_MAX_TOKENS = readEnvInt("MISTRAL_RUNTIME_MAX_TOKENS", 160);
const MISTRAL_FINALIZER_MAX_TOKENS = readEnvInt("MISTRAL_FINALIZER_MAX_TOKENS", 120);
const MISTRAL_RUNTIME_RANDOM_SEED = readOptionalEnvInt("MISTRAL_RUNTIME_RANDOM_SEED");

type MistralMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function formatPovLabel(pov: StoryPov) {
  return pov.replace("_", " ");
}

function buildRollingSummaryLine(context: ReturnType<typeof buildRuntimeContextPacket>) {
  if (context.turnCount < 9) {
    return "";
  }

  const summary = context.continuitySummary.trim();

  if (!summary || summary === "The story is just beginning.") {
    return "";
  }

  return `Earlier in the story: ${summary}`;
}

function getPromptStoryCards(context: ReturnType<typeof buildRuntimeContextPacket>) {
  const cards = context.mode === "opening" ? context.coreStoryCards : [...context.coreStoryCards, ...context.activeStoryCards];
  const seenCardIds = new Set<string>();

  return cards.filter((card) => {
    if (seenCardIds.has(card.id)) {
      return false;
    }

    seenCardIds.add(card.id);
    return true;
  });
}

function getPromptStoryCardIds(context: ReturnType<typeof buildRuntimeContextPacket>) {
  return getPromptStoryCards(context).map((card) => card.id);
}

function buildCharacterCards(cards: ReturnType<typeof getPromptStoryCards>) {
  const characterCards = cards.filter((card) => card.type === "character");

  if (characterCards.length === 0) {
    return [];
  }

  return characterCards.map((card) =>
    `- ${card.title}${card.role?.trim() ? ` (${card.role.trim()})` : ""}: ${card.description}`,
  );
}

function buildSettings(context: ReturnType<typeof buildRuntimeContextPacket>) {
  const locationCards = getPromptStoryCards(context).filter((card) => card.type === "location");

  if (locationCards.length === 0) {
    return [];
  }

  return locationCards.map((card) => `- ${card.title}: ${card.description}`);
}

function buildEvents(context: ReturnType<typeof buildRuntimeContextPacket>) {
  const storyEventCards = getPromptStoryCards(context).filter((card) => card.type === "story_event");

  if (storyEventCards.length === 0) {
    return [];
  }

  return storyEventCards.map((card) => `- ${card.title}: ${card.description}`);
}

function buildOpeningSystemPrompt(context: ReturnType<typeof buildRuntimeContextPacket>) {
  const promptStoryCards = getPromptStoryCards(context);
  const characterCards = buildCharacterCards(promptStoryCards);
  const settings = buildSettings(context);
  const events = buildEvents(context);
  const additionalContextParts: string[] = [];

  if (context.instructions.trim()) {
    additionalContextParts.push(context.instructions.trim());
  }

  if (characterCards.length > 0) {
    additionalContextParts.push(["Characters:", ...characterCards].join("\n"));
  }

  if (settings.length > 0) {
    additionalContextParts.push(["Settings:", ...settings].join("\n"));
  }

  if (events.length > 0) {
    additionalContextParts.push(["Events:", ...events].join("\n"));
  }

  return `You are a roleplay chat partner. Follow the user's roleplay instructions closely.

Rules:
- Keep it to 2-4 sentences.
- Use present tense and ${formatPovLabel(context.pov)} POV.
- Never write thoughts, actions, or dialogue for the user-controlled character.
- Ensure each character has a distinct voice, personality, and mannerisms.
- Prefer dialogue, interaction, and concrete response over scenic elaboration.
- Stay in character.
- Start in motion around the user-controlled character.
- Make something happen immediately.
- Do not end on vague anticipation.
- Keep track of body positioning.

The user is playing as ${context.character.name}. ${context.character.description}
You are playing as all other characters. You can also create new characters as appropriate.

Background: ${context.runtimeBackground}

Tone/theme: ${context.toneStyle}

Additional context:
${additionalContextParts.join("\n\n")}

Write the opening scene now.`;
}

function buildStorySystemPrompt(context: ReturnType<typeof buildRuntimeContextPacket>) {
  const rollingSummaryLine = buildRollingSummaryLine(context);
  const promptStoryCards = getPromptStoryCards(context);
  const characterCards = buildCharacterCards(promptStoryCards);
  const settings = buildSettings(context);
  const events = buildEvents(context);
  const additionalContextParts: string[] = [];

  if (context.instructions.trim()) {
    additionalContextParts.push(context.instructions.trim());
  }

  if (characterCards.length > 0) {
    additionalContextParts.push(["Other characters: ", ...characterCards].join("\n"));
  }

  if (settings.length > 0) {
    additionalContextParts.push(["Settings: ", ...settings].join("\n"));
  }

  if (events.length > 0) {
    additionalContextParts.push(["Events:", ...events].join("\n"));
  }

  return `You are a roleplay chat partner. Follow the user's roleplay instructions closely.

Rules:
- Keep it to 2-4 sentences.
- Use present tense and ${formatPovLabel(context.pov)} POV.
- Never paraphrase the user’s submitted action.
- Never write dialogue, actions, or thoughts for the player/user-controlled character.
- Ensure each character has a distinct voice, personality, and mannerisms.
- Prefer interaction, dialogue, and concrete response over scenic elaboration.
- Keep track of body positioning.

The user is playing as ${context.character.name}. ${context.character.description}
You are playing as all other characters. You can also create new characters as appropriate.

Background: ${context.runtimeBackground}

Tone/theme: ${context.toneStyle}

Additional context:
${additionalContextParts.join("\n\n")}
${rollingSummaryLine ? `\n\n${rollingSummaryLine}` : ""}`;
}

const RUNTIME_SUGGESTED_ACTIONS_SYSTEM_PROMPT = `Return only valid JSON.

Required keys:
- suggestedActions

Rules:
- suggestedActions: 2 to 3 short next moves.
- Start each suggested action with a clear verb when possible.
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

function buildHistoricalActionMessage(action: string): MistralMessage {
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
      messages.push(buildHistoricalActionMessage(turn.playerAction));
    }

    messages.push({
      role: "assistant",
      content: normalizeHistoricalAssistantContent(turn.storyText),
    });

    return messages;
  });
}

function buildMistralStoryMessages(params: {
  context: ReturnType<typeof buildRuntimeContextPacket>;
  playerAction: string;
}): MistralMessage[] {
  const messages: MistralMessage[] = [
    {
      role: "system",
      content:
        params.context.mode === "opening"
          ? buildOpeningSystemPrompt(params.context)
          : buildStorySystemPrompt(params.context),
    },
  ];

  if (params.context.mode === "opening") {
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
            ].join("\n\n")
          : [
              "# Suggested Actions",
              "Return JSON only with key suggestedActions.",
              `The user action that led to the assistant message above was:\n${params.playerAction.trim()}`,
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
    top_p: 0.95,
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
    `[mistral-v2] exact api request\n${JSON.stringify(requestBody, null, 2)}`,
  );

  const response = await fetch(MISTRAL_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getMistralApiKey()}`,
    },
    body: JSON.stringify(requestBody),
  });
  console.info("[mistral-v2] fetch responded", {
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
        console.info("[mistral-v2] first delta", {
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

  console.info("[mistral-v2] stream completed", {
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
    `[mistral-v2] exact api request\n${JSON.stringify(requestBody, null, 2)}`,
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
      engineId: "mistral_v2",
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
    world: params.world,
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
      engineId: "mistral_v2",
      inputMessages,
      sentPreviousResponseId: "",
      sentStoryCardIds: getPromptStoryCardIds(context),
    },
  };
}

async function generateMistralSuggestedActions(
  params: RuntimeEngineGenerateSuggestedActionsParams,
): Promise<RuntimeEngineGenerateSuggestedActionsResult> {
  const mode = params.turn.playerAction.trim() ? "turn" : "opening";
  const context = buildRuntimeContextPacket({
    world: params.world,
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
          engineId: "mistral_v2",
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
      engineId: "mistral_v2",
      inputMessages,
      sentPreviousResponseId: "",
      sentStoryCardIds: [],
    },
  };
}

export const mistralV2RuntimeEngine: RuntimeEngine = {
  id: "mistral_v2",
  generateTurn: generateMistralTurn,
  generateSuggestedActions: generateMistralSuggestedActions,
};
