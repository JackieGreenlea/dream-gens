import "server-only";

import { ZodError } from "zod";
import { buildRuntimeContextPacket } from "@/lib/runtime-context";
import { buildRuntimeTurnOutput } from "@/lib/runtime-turns";
import { runtimeTurnFinalizationOutputSchema, runtimeTurnOutputSchema } from "@/lib/schemas";
import {
  RuntimeEngine,
  RuntimeEngineDebugError,
  RuntimeEngineDebugPayload,
  RuntimeEngineGenerateTurnParams,
  RuntimeEngineGenerateTurnResult,
} from "@/lib/runtime-engines/types";

const MISTRAL_CHAT_COMPLETIONS_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_RUNTIME_MODEL = process.env.MISTRAL_RUNTIME_MODEL || "mistral-large-latest";

type MistralMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const RUNTIME_STORY_SYSTEM_PROMPT = `You are Everplot's session runtime.

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

const RUNTIME_OPENING_SYSTEM_PROMPT = `You are Everplot's session runtime.

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

const RUNTIME_FINALIZATION_SYSTEM_PROMPT = `You are Everplot's turn finalizer.

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

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function buildMistralDeveloperMessage(
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

function buildMistralInputMessages(params: {
  context: ReturnType<typeof buildRuntimeContextPacket>;
  playerAction: string;
}): MistralMessage[] {
  return [
    {
      role: "system",
      content:
        params.context.mode === "opening" ? RUNTIME_OPENING_SYSTEM_PROMPT : RUNTIME_STORY_SYSTEM_PROMPT,
    },
    {
      role: "system",
      content: buildMistralDeveloperMessage(params.context),
    },
    {
      role: "user",
      content:
        params.context.mode === "opening"
          ? "Generate the opening scene for this session. Introduce the selected character, establish the situation, and end by inviting the player's first action."
          : params.playerAction.trim(),
    },
  ];
}

function buildMistralFinalizationMessages(params: {
  context: ReturnType<typeof buildRuntimeContextPacket>;
  playerAction: string;
  storyText: string;
}): MistralMessage[] {
  return [
    {
      role: "system",
      content: RUNTIME_FINALIZATION_SYSTEM_PROMPT,
    },
    {
      role: "system",
      content: buildMistralDeveloperMessage(params.context),
    },
    {
      role: "user",
      content:
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
  const response = await fetch(MISTRAL_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getMistralApiKey()}`,
    },
    body: JSON.stringify({
      model: MISTRAL_RUNTIME_MODEL,
      stream: true,
      response_format: {
        type: "text",
      },
      messages: params.messages,
    }),
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
    rawEvents,
  };
}

async function finalizeMistralTurn(params: {
  messages: MistralMessage[];
}) {
  const response = await fetch(MISTRAL_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getMistralApiKey()}`,
    },
    body: JSON.stringify({
      model: MISTRAL_RUNTIME_MODEL,
      temperature: 0,
      response_format: {
        type: "json_object",
      },
      messages: params.messages,
    }),
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
  const inputMessages = buildMistralInputMessages({
    context,
    playerAction: params.playerAction,
  });

  const streamedStory = await streamMistralText({
    messages: inputMessages,
    onDelta: params.onTextDelta,
  });

  const finalizationResponse = await finalizeMistralTurn({
    messages: buildMistralFinalizationMessages({
      context,
      playerAction: params.playerAction,
      storyText: streamedStory.text,
    }),
  });

  const debugBase: RuntimeEngineDebugPayload = {
    engineId: "mistral_v1",
    inputMessages,
    sentPreviousResponseId: "",
    rawResponse: {
      streamEvents: streamedStory.rawEvents,
      finalization: finalizationResponse.rawResponse,
    },
    finalizationText: finalizationResponse.rawText,
    parsedOutput: finalizationResponse.output,
  };

  let finalization;

  try {
    finalization = runtimeTurnFinalizationOutputSchema.parse(finalizationResponse.output);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new RuntimeEngineDebugError(
        "The runtime returned data that did not match the expected turn schema.",
        {
          ...debugBase,
          validationError: error.flatten(),
        },
      );
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
    responseId: streamedStory.responseId || finalizationResponse.responseId || "",
    debug: debugBase,
  };
}

export const mistralV1RuntimeEngine: RuntimeEngine = {
  id: "mistral_v1",
  generateTurn: generateMistralTurn,
};
