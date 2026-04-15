import { OpenAIInputMessage } from "@/lib/openai";

const MISTRAL_CHAT_COMPLETIONS_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_FINAL_STORY_MODEL =
  process.env.MISTRAL_FINAL_STORY_MODEL ||
  process.env.MISTRAL_COMPILER_MODEL ||
  process.env.MISTRAL_RUNTIME_MODEL ||
  "mistral-small-latest";

type StructuredOutputParams = {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt?: string;
  userPrompt?: string;
  input?: OpenAIInputMessage[];
  model?: string;
};

type MistralResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function getApiKey() {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new Error("Missing MISTRAL_API_KEY.");
  }

  return apiKey;
}

function buildRequestInput({
  systemPrompt,
  userPrompt,
  input,
}: Pick<StructuredOutputParams, "systemPrompt" | "userPrompt" | "input">) {
  return (
    input ??
    (systemPrompt && userPrompt
      ? [
          {
            role: "system" as const,
            content: [{ type: "input_text" as const, text: systemPrompt }],
          },
          {
            role: "user" as const,
            content: [{ type: "input_text" as const, text: userPrompt }],
          },
        ]
      : null)
  );
}

function toMistralMessages(input: OpenAIInputMessage[]) {
  return input.map((message) => {
    const text = message.content
      .map((part) => part.text ?? "")
      .join("\n\n")
      .trim();

    return {
      role: message.role === "developer" ? "system" : message.role,
      content: text,
    };
  });
}

function extractMistralText(response: MistralResponse) {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new Error("Mistral response did not include structured output text.");
}

export async function createStructuredOutput<T>({
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  input,
  model = MISTRAL_FINAL_STORY_MODEL,
}: StructuredOutputParams): Promise<T> {
  const requestInput = buildRequestInput({ systemPrompt, userPrompt, input });

  if (!requestInput) {
    throw new Error("Structured output requests need either input messages or system/user prompts.");
  }

  const response = await fetch(MISTRAL_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model,
      messages: toMistralMessages(requestInput),
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          schema,
          strict: true,
        },
      },
    }),
  });

  const json = (await response.json()) as MistralResponse;

  if (!response.ok) {
    throw new Error(json.error?.message || "Mistral request failed.");
  }

  return JSON.parse(extractMistralText(json)) as T;
}
