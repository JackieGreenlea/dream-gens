import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getCurrentUserIdFast } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MISTRAL_CHAT_COMPLETIONS_URL = "https://api.mistral.ai/v1/chat/completions";
const ROLEPLAY_MODEL = process.env.MISTRAL_RUNTIME_MODEL || "mistral-small-latest";
const ROLEPLAY_TEMPERATURE = 0.95;
const ROLEPLAY_MAX_TOKENS = 220;

const roleplayMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1),
});

const roleplayRequestSchema = z.object({
  messages: z.array(roleplayMessageSchema).max(40).default([]),
});

type MistralMessage = {
  role: "system" | "user" | "assistant";
  content: string;
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

  throw new Error("Mistral roleplay response did not include any text.");
}

function parseMistralError(text: string) {
  try {
    const json = JSON.parse(text) as MistralResponse;
    return json.error?.message || text;
  } catch {
    return text;
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserIdFast();

    if (!userId) {
      return NextResponse.json({ error: "Sign in to use roleplay." }, { status: 401 });
    }

    const body = await request.json();
    const input = roleplayRequestSchema.parse(body);

    const messages: MistralMessage[] = input.messages;

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "At least one message is required." },
        { status: 400 },
      );
    }

    const requestPayload = {
      model: ROLEPLAY_MODEL,
      temperature: ROLEPLAY_TEMPERATURE,
      max_tokens: ROLEPLAY_MAX_TOKENS,
      messages,
    };

    const response = await fetch(MISTRAL_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(parseMistralError(errorText) || "Roleplay request failed.");
    }

    const json = (await response.json()) as MistralResponse;

    return NextResponse.json({ reply: extractMistralText(json), requestPayload });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "The roleplay request did not match the expected schema.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to continue roleplay.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
