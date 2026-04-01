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

type TextStreamParams = {
  systemPrompt?: string;
  userPrompt?: string;
  input?: OpenAIInputMessage[];
  previousResponseId?: string;
  model?: string;
  store?: boolean;
  onDelta?: (delta: string) => void | Promise<void>;
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

type OpenAIStreamEvent = {
  type?: string;
  delta?: string;
  response?: {
    id?: string;
    status?: string;
    error?: {
      message?: string;
    };
  };
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
  const requestInput = buildRequestInput({ systemPrompt, userPrompt, input });

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

export async function streamTextOutputWithMetadata({
  systemPrompt,
  userPrompt,
  input,
  previousResponseId,
  model = COMPILER_MODEL,
  store = true,
  onDelta,
}: TextStreamParams): Promise<{
  text: string;
  responseId: string;
  rawEvents: OpenAIStreamEvent[];
}> {
  const requestInput = buildRequestInput({ systemPrompt, userPrompt, input });

  if (!requestInput) {
    throw new Error("Text streaming requests need either input messages or system/user prompts.");
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
      stream: true,
      ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
      input: requestInput,
    }),
  });

  if (!response.ok) {
    const json = (await response.json()) as OpenAIResponse;
    throw new Error(json.error?.message || "OpenAI streaming request failed.");
  }

  if (!response.body) {
    throw new Error("OpenAI streaming response body was missing.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const rawEvents: OpenAIStreamEvent[] = [];
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

    const event = JSON.parse(data) as OpenAIStreamEvent;
    rawEvents.push(event);

    if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
      text += event.delta;
      await onDelta?.(event.delta);
      return;
    }

    if (event.response?.id && !responseId) {
      responseId = event.response.id;
    }

    if (
      event.type === "response.failed" ||
      event.type === "response.incomplete" ||
      event.type === "error"
    ) {
      throw new Error(
        event.error?.message ||
          event.response?.error?.message ||
          "OpenAI streaming response did not complete.",
      );
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

  if (!text.trim()) {
    throw new Error("OpenAI streaming response did not include any story text.");
  }

  return {
    text,
    responseId,
    rawEvents,
  };
}

export async function createStructuredOutput<T>(params: StructuredOutputParams): Promise<T> {
  const result = await createStructuredOutputWithMetadata<T>(params);
  return result.output;
}
