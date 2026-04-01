const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const COMPILER_MODEL = "gpt-5-mini";
export const RUNTIME_MODEL = "gpt-5.2";

export type OpenAIInputMessage = {
  role: "system" | "developer" | "user";
  content: Array<{
    type: "input_text";
    text: string;
  }>;
} | {
  role: "assistant";
  content: Array<{
    type: "output_text";
    text: string;
  }>;
};

type StructuredOutputParams = {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt?: string;
  userPrompt?: string;
  input?: OpenAIInputMessage[];
  previousResponseId?: string;
  model?: string;
  store?: boolean;
};

type OpenAIResponse = {
  id?: string;
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return apiKey;
}

function extractOutputText(response: OpenAIResponse) {
  if (typeof response.output_text === "string" && response.output_text.length > 0) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (
        (content.type === "output_text" || content.type === "text") &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }

  throw new Error("OpenAI response did not include structured output text.");
}

export async function createStructuredOutputWithMetadata<T>({
  schemaName,
  schema,
  systemPrompt,
  userPrompt,
  input,
  previousResponseId,
  model = COMPILER_MODEL,
  store = true,
}: StructuredOutputParams): Promise<{
  output: T;
  responseId: string;
  rawResponse: OpenAIResponse;
}> {
  const requestInput =
    input ??
    (systemPrompt && userPrompt
      ? [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userPrompt }],
          },
        ]
      : null);

  if (!requestInput) {
    throw new Error("Structured output requests need either input messages or system/user prompts.");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model,
      store,
      ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
      input: requestInput,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });

  const json = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(json.error?.message || "OpenAI request failed.");
  }

  return {
    output: JSON.parse(extractOutputText(json)) as T,
    responseId: typeof json.id === "string" ? json.id : "",
    rawResponse: json,
  };
}

export async function createStructuredOutput<T>(params: StructuredOutputParams): Promise<T> {
  const result = await createStructuredOutputWithMetadata<T>(params);
  return result.output;
}
