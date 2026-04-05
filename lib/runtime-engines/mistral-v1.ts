import "server-only";

import { ZodError } from "zod";
import { buildRuntimeInputMessages, buildRuntimeTurnFinalizationMessages, buildRuntimeTurnOutput } from "@/lib/runtime";
import { runtimeTurnFinalizationOutputSchema, runtimeTurnOutputSchema } from "@/lib/schemas";
import {
  RuntimeEngine,
  RuntimeEngineDebugError,
  RuntimeEngineDebugPayload,
  RuntimeEngineGenerateTurnParams,
  RuntimeEngineGenerateTurnResult,
} from "@/lib/runtime-engines/types";
import { OpenAIInputMessage } from "@/lib/openai";

const MISTRAL_CHAT_COMPLETIONS_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_RUNTIME_MODEL = process.env.MISTRAL_RUNTIME_MODEL || "mistral-large-latest";

type MistralMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

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

function flattenMessageText(message: OpenAIInputMessage) {
  return message.content
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function toMistralMessages(messages: OpenAIInputMessage[]): MistralMessage[] {
  return messages
    .map((message) => {
      const content = flattenMessageText(message);

      if (!content) {
        return null;
      }

      if (message.role === "developer") {
        return {
          role: "system" as const,
          content,
        };
      }

      return {
        role: message.role,
        content,
      };
    })
    .filter((message): message is MistralMessage => Boolean(message));
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
  const inputMessages = buildRuntimeInputMessages({
    world: params.world,
    character: params.character,
    session: params.session,
    playerAction: params.playerAction,
    mode,
  });

  const streamedStory = await streamMistralText({
    messages: toMistralMessages(inputMessages),
    onDelta: params.onTextDelta,
  });

  const finalizationResponse = await finalizeMistralTurn({
    messages: toMistralMessages(
      buildRuntimeTurnFinalizationMessages({
        world: params.world,
        character: params.character,
        session: params.session,
        playerAction: params.playerAction,
        storyText: streamedStory.text,
        mode,
      }),
    ),
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
