import "server-only";

import { SessionTurn } from "@/lib/types";

const TURN_BLOCK_SIZE = 8;
const MISTRAL_CHAT_COMPLETIONS_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_SUMMARY_MODEL =
  process.env.MISTRAL_SUMMARY_MODEL ||
  process.env.MISTRAL_RUNTIME_MODEL ||
  "mistral-small-latest";
const MISTRAL_SUMMARY_MAX_TOKENS = 500;

function normalizeStoryTextForSummary(storyText: string) {
  const trimmed = storyText.trim();
  const openingMatch = trimmed.match(/(?:^|\n)Opening:\n([\s\S]+)$/);

  if (openingMatch?.[1]) {
    return openingMatch[1].trim();
  }

  return trimmed;
}

function formatTurnForSummary(turn: SessionTurn) {
  const lines = [`Turn ${turn.turnNumber}`];

  if (turn.playerAction.trim()) {
    lines.push(`Player action: ${turn.playerAction.trim()}`);
  }

  lines.push(`Story beat: ${normalizeStoryTextForSummary(turn.storyText)}`);
  return lines.join("\n");
}

function getMistralApiKey() {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new Error("Missing MISTRAL_API_KEY.");
  }

  return apiKey;
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

async function createMistralSummary(params: {
  requestName: string;
  systemPrompt: string;
  userPrompt: string;
}) {
  const requestBody = {
    model: MISTRAL_SUMMARY_MODEL,
    temperature: 0.2,
    max_tokens: MISTRAL_SUMMARY_MAX_TOKENS,
    response_format: {
      type: "json_object" as const,
    },
    messages: [
      {
        role: "system" as const,
        content: [
          params.systemPrompt,
          "Return valid JSON only with key summary.",
          "The summary must be plain prose, compact, information-dense, and under 1200 characters.",
        ].join("\n"),
      },
      {
        role: "user" as const,
        content: params.userPrompt,
      },
    ],
  };

  console.info(
    `[session-summary] exact api request (${params.requestName})\n${JSON.stringify(requestBody, null, 2)}`,
  );

  const response = await fetch(MISTRAL_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getMistralApiKey()}`,
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  let json: {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
    error?: { message?: string };
  };

  try {
    json = JSON.parse(responseText) as typeof json;
  } catch {
    throw new Error(
      `Mistral summary request returned non-JSON response: ${responseText.slice(0, 200)}`,
    );
  }

  if (!response.ok) {
    throw new Error(json.error?.message || "Mistral summary request failed.");
  }

  const content = readMistralContent(json.choices?.[0]?.message?.content);

  if (!content) {
    throw new Error("Mistral summary response did not include JSON content.");
  }

  let parsedOutput: { summary?: unknown };

  try {
    parsedOutput = JSON.parse(content) as { summary?: unknown };
  } catch {
    throw new Error("Mistral summary response returned invalid JSON content.");
  }

  if (typeof parsedOutput.summary !== "string" || !parsedOutput.summary.trim()) {
    throw new Error("Mistral summary response did not include a valid summary.");
  }

  return parsedOutput.summary.trim().slice(0, 1200);
}

export function isRollingSummaryRefreshTurn(turnNumber: number) {
  return turnNumber > 0 && turnNumber % TURN_BLOCK_SIZE === 0;
}

export function getRollingSummaryBlockBounds(turnNumber: number) {
  return {
    startTurnNumber: turnNumber - (TURN_BLOCK_SIZE - 1),
    endTurnNumber: turnNumber,
  };
}

export async function summarizeTurnBlock(turns: SessionTurn[]) {
  if (turns.length !== TURN_BLOCK_SIZE) {
    throw new Error(`Rolling summary requires exactly ${TURN_BLOCK_SIZE} turns per block.`);
  }

  const formattedTurns = turns.map(formatTurnForSummary).join("\n\n");
  return createMistralSummary({
    requestName: "session_turn_block_summary",
    systemPrompt: [
      "Summarize where the story stands now after this 8-turn block.",
      "Preserve the current situation, who currently matters and why they matter, relationship shifts, unresolved tensions, secrets, promises, goals, conflicts, notable injuries, objects, obligations, revelations, and any major change in story direction.",
      "When relevant, preserve where the scene currently is, who is physically present, proximity/touch status, and the current emotional or erotic temperature.",
      "Write one compact, information-dense paragraph in plain usable prose.",
      "Do not write back-cover copy. Do not be flowery. Do not use a list unless absolutely necessary.",
    ].join("\n"),
    userPrompt: `Summarize this 8-turn block:\n\n${formattedTurns}`,
  });
}

export async function synthesizeRollingStorySummary(params: {
  previousSummary: string;
  latestBlockSummary: string;
}) {
  return createMistralSummary({
    requestName: "session_rolling_story_summary",
    systemPrompt: [
      "Synthesize a rolling story summary.",
      "Preserve where the story stands now, who currently matters and why they matter, relationship shifts, unresolved tensions, secrets, promises, goals, conflicts, notable injuries, objects, obligations, revelations, and major direction changes that still matter.",
      "When relevant, preserve current location, who is physically present, proximity/touch status, and the current emotional or erotic temperature.",
      "Treat the previous rolling summary as continuity state that should be carried forward unless a detail has clearly been resolved, replaced, or contradicted by the latest block.",
      "Do not collapse the summary into only the newest block.",
      "When in doubt, preserve still-relevant facts from the previous summary.",
      "Write one compact, information-dense paragraph in plain usable prose.",
      "Do not recap everything beat by beat. Do not be flowery. Do not use a list unless absolutely necessary.",
    ].join("\n"),
    userPrompt: [
      "Previous rolling summary:",
      params.previousSummary.trim(),
      "",
      "Latest 8-turn block summary:",
      params.latestBlockSummary.trim(),
      "",
      "Combine them into one updated rolling story summary.",
      "Carry forward older continuity that still matters, even if it is not repeated in the latest block summary.",
    ].join("\n"),
  });
}
