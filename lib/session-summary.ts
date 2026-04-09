import "server-only";

import { createStructuredOutputWithMetadata } from "@/lib/openai";
import { SessionTurn } from "@/lib/types";

const TURN_BLOCK_SIZE = 8;

const storySummaryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: {
    summary: {
      type: "string",
      minLength: 1,
      maxLength: 1200,
    },
  },
} as const;

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
  const response = await createStructuredOutputWithMetadata<{ summary: string }>({
    schemaName: "session_turn_block_summary",
    schema: storySummaryJsonSchema,
    store: false,
    systemPrompt: [
      "Summarize where the story stands now after this 8-turn block.",
      "Preserve the current situation, who currently matters and why they matter, relationship shifts, unresolved tensions, secrets, promises, goals, conflicts, notable injuries, objects, obligations, revelations, and any major change in story direction.",
      "Write one compact, information-dense paragraph in plain usable prose.",
      "Do not write back-cover copy. Do not be flowery. Do not use a list unless absolutely necessary.",
    ].join("\n"),
    userPrompt: `Summarize this 8-turn block:\n\n${formattedTurns}`,
  });

  return response.output.summary.trim();
}

export async function synthesizeRollingStorySummary(params: {
  previousSummary: string;
  latestBlockSummary: string;
}) {
  const response = await createStructuredOutputWithMetadata<{ summary: string }>({
    schemaName: "session_rolling_story_summary",
    schema: storySummaryJsonSchema,
    store: false,
    systemPrompt: [
      "Synthesize a rolling story summary.",
      "Preserve where the story stands now, who currently matters and why they matter, relationship shifts, unresolved tensions, secrets, promises, goals, conflicts, notable injuries, objects, obligations, revelations, and major direction changes that still matter.",
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
    ].join("\n"),
  });

  return response.output.summary.trim();
}
