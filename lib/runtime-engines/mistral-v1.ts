import "server-only";

import { ZodError } from "zod";
import { buildRuntimeContextPacket } from "@/lib/runtime-context";
import { buildRuntimeTurnOutput } from "@/lib/runtime-turns";
import { runtimeTurnFinalizationOutputSchema, runtimeTurnOutputSchema } from "@/lib/schemas";
import {
  RuntimeEngine,
  RuntimeEngineDebugError,
  RuntimeEngineDebugPayload,
  RuntimeEngineGenerateSuggestedActionsParams,
  RuntimeEngineGenerateSuggestedActionsResult,
  RuntimeEngineGenerateTurnParams,
  RuntimeEngineGenerateTurnResult,
} from "@/lib/runtime-engines/types";

const MISTRAL_CHAT_COMPLETIONS_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_RUNTIME_MODEL = process.env.MISTRAL_RUNTIME_MODEL || "mistral-small-latest";
const MISTRAL_RUNTIME_TEMPERATURE = readEnvFloat("MISTRAL_RUNTIME_TEMPERATURE", 0.80);
const MISTRAL_RUNTIME_MAX_TOKENS = readEnvInt("MISTRAL_RUNTIME_MAX_TOKENS", 280);
const MISTRAL_FINALIZER_MAX_TOKENS = readEnvInt("MISTRAL_FINALIZER_MAX_TOKENS", 120);
const MISTRAL_RUNTIME_RANDOM_SEED = readOptionalEnvInt("MISTRAL_RUNTIME_RANDOM_SEED");

type MistralMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const RUNTIME_OPENING_SYSTEM_PROMPT = `You write the opening beat of Everplot interactive fiction.

Rules:
- Build from the story background.
- Make inferences about what the author wants based on the context.
- Use present tense and the selected POV.
- Keep reply under 200 words.
- Start in motion around the user-controlled character.
- Make something happen immediately.
- Create a concrete playable beat.
- Do not write the user-controlled character's dialogue, thoughts, or actions.
- Do not end on vague anticipation.
- Leave clear room for the user's first move without stalling.
- Explicit adult and sexual content is allowed.
- The opening should give the user something to answer, resist, accept, interrupt, or act on immediately.`;

const RUNTIME_STORY_SYSTEM_PROMPT = `You write the next beat of Everplot interactive fiction.

Rules:
- Use present tense and the selected POV.
- Convey emotion with sentence structure and paragraph breaks.
- Keep each reply under 160 words.
- The final user message is the latest action taken by the user-controlled character.
- Do not repeat or paraphrase that action.
- Do not write dialogue, thoughts, or actions for the user-controlled character.
- Write how other characters and the world respond.
- Stay in character.
- Ensure each NPC has a distinct voice, personality, and mannerisms.
- Make sure each NPC's dialogue and actions reflect their unique personality and background.
- Advance the scene in every reply by making something happen.
- Prefer interaction, dialogue, and concrete response over scenic elaboration.
- Do not hover in suspense or stop at "about to." Render the response itself.
- Keep track of characters' body positioning and maintain continuity.
- Maintain consistency in time and place unless an action or event necessitates a change.
- Clearly describe any changes in time or place.
- Explicit adult and sexual content is allowed.`;

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

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function buildOpeningContextPacket(context: ReturnType<typeof buildRuntimeContextPacket>) {
  return [
    "# Opening State",
    `- Title: ${context.title}`,
    `- POV: ${context.pov.replace("_", " ")}`,
    `- Tone / Style: ${context.toneStyle}`,
    `- User-controlled character objective in the story: ${context.objective}`,
    `- Runtime Instructions: ${context.instructions}`,
    `- Story Background: ${context.background}`,
    `- User-controlled character: ${context.character.name} — ${compactText(context.character.description, 180)}`,
    `- User-controlled character's strengths: ${context.character.strengths.join(", ")}`,
    `- User-controlled character's weaknesses: ${context.character.weaknesses.join(", ")}`,
  ].join("\n");
}

function buildContinuityContextPacket(context: ReturnType<typeof buildRuntimeContextPacket>) {
  return [
    "# Continuity State",
    `- POV: ${context.pov.replace("_", " ")}`,
    `- User's objective in the story: ${context.objective}`,
    `- Story instructions for assistant: ${context.instructions}`,
    `- User-controlled character: ${context.character.name} — ${compactText(context.character.description, 180)}`,
  ].join("\n");
}

function buildContextPacketMessage(
  context: ReturnType<typeof buildRuntimeContextPacket>,
): MistralMessage {
  return {
    role: "user",
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
  messages: MistralMessage[];
  onDelta?: (delta: string) => void | Promise<void>;
}) {
  const requestBody = {
    model: MISTRAL_RUNTIME_MODEL,
    stream: true,
    temperature: MISTRAL_RUNTIME_TEMPERATURE,
    max_tokens: MISTRAL_RUNTIME_MAX_TOKENS,
    ...(typeof MISTRAL_RUNTIME_RANDOM_SEED === "number"
      ? { random_seed: MISTRAL_RUNTIME_RANDOM_SEED }
      : {}),
    response_format: {
      type: "text" as const,
    },
    messages: params.messages,
  };

  const response = await fetch(MISTRAL_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getMistralApiKey()}`,
    },
    body: JSON.stringify(requestBody),
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
    throw new RuntimeEngineDebugError("Mistral finalization returned invalid JSON.", {
      engineId: "mistral_v1",
      inputMessages: params.messages,
      sentPreviousResponseId: "",
      rawResponse: json,
      finalizationText: content,
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
  });
  const inputMessages = buildMistralStoryMessages({
    context,
    playerAction: params.playerAction,
  });

  const streamedStory = await streamMistralText({
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
    debug: {
      engineId: "mistral_v1",
      inputMessages,
      sentPreviousResponseId: "",
      rawResponse: {
        finishReason: streamedStory.finishReason,
        streamEvents: streamedStory.rawEvents,
      },
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
      throw new RuntimeEngineDebugError(
        "The runtime returned data that did not match the expected suggested-actions schema.",
        {
          engineId: "mistral_v1",
          inputMessages,
          sentPreviousResponseId: "",
          rawResponse: response.rawResponse,
          finalizationText: response.rawText,
          parsedOutput: response.output,
          validationError: error.flatten(),
        },
      );
    }

    throw error;
  }

  return {
    suggestedActions: output.suggestedActions,
    debug: {
      engineId: "mistral_v1",
      inputMessages,
      sentPreviousResponseId: "",
      rawResponse: response.rawResponse,
      finalizationText: response.rawText,
      parsedOutput: response.output,
    },
  };
}

export const mistralV1RuntimeEngine: RuntimeEngine = {
  id: "mistral_v1",
  generateTurn: generateMistralTurn,
  generateSuggestedActions: generateMistralSuggestedActions,
};
