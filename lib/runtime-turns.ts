import { RuntimeTurnFinalizationOutput, RuntimeTurnOutput } from "@/lib/schemas";
import { SessionTurn } from "@/lib/types";

const FALLBACK_ACTIONS = [
  "Question the nearest witness.",
  "Press the advantage immediately.",
  "Change the balance now.",
];

function normalizeSuggestedAction(action: string, fallback: string) {
  const firstSentence = action
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)[0]
    ?.trim() ?? "";

  const cleaned = firstSentence
    .replace(/^Follow the opening lead:?/i, "")
    .replace(/^Make progress toward:?/i, "")
    .replace(/^Try to /i, "")
    .replace(/^You could /i, "")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 30);
  const shortened = words.join(" ").replace(/[,:;]+$/g, "").trim();

  if (!shortened) {
    return fallback;
  }

  return /[.!?]$/.test(shortened) ? shortened : `${shortened}.`;
}

export function normalizeSuggestedActions(actions: string[]) {
  return actions
    .slice(0, 3)
    .map((action, index) => normalizeSuggestedAction(action, FALLBACK_ACTIONS[index]))
    .filter(Boolean);
}

function normalizeActionComparisonText(text: string) {
  return text
    .toLowerCase()
    .replace(/\b(i|you|me|my|your)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeRestatedOpening(playerAction: string, storyText: string) {
  const paragraphs = storyText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return storyText.trim();
  }

  const firstParagraphSentences = paragraphs[0]
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (firstParagraphSentences.length === 0) {
    return storyText.trim();
  }

  const normalizedAction = normalizeActionComparisonText(playerAction);
  const normalizedOpening = normalizeActionComparisonText(firstParagraphSentences[0]);

  if (!normalizedAction || !normalizedOpening) {
    return storyText.trim();
  }

  const actionPrefix = normalizedAction.split(" ").slice(0, 6).join(" ");
  const openingRestatesAction =
    normalizedOpening === normalizedAction ||
    normalizedOpening.startsWith(normalizedAction) ||
    normalizedAction.startsWith(normalizedOpening) ||
    (actionPrefix.length >= 20 && normalizedOpening.startsWith(actionPrefix));

  if (!openingRestatesAction) {
    return storyText.trim();
  }

  firstParagraphSentences.shift();

  if (firstParagraphSentences.length > 0) {
    paragraphs[0] = firstParagraphSentences.join(" ");
  } else {
    paragraphs.shift();
  }

  return paragraphs.join("\n\n").trim() || storyText.trim();
}

export function createSessionTurn(params: {
  playerAction: string;
  turnNumber: number;
  output: RuntimeTurnOutput;
  background?: string;
  mode?: "opening" | "turn";
}): SessionTurn {
  const openingStoryText = [
    params.background?.trim() ? `Background: ${params.background.trim()}` : "",
    params.output.storyText.trim() ? `Opening scene: ${params.output.storyText.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    turnNumber: params.turnNumber,
    playerAction: params.playerAction.trim(),
    storyText:
      params.mode === "opening"
        ? openingStoryText || params.output.storyText.trim()
        : removeRestatedOpening(params.playerAction, params.output.storyText),
    suggestedActions: normalizeSuggestedActions(params.output.suggestedActions),
    summaryAfterTurn: params.output.summary.trim(),
  };
}

export function buildRuntimeTurnOutput(params: {
  storyText: string;
  finalization: RuntimeTurnFinalizationOutput;
}): RuntimeTurnOutput {
  return {
    storyText: params.storyText.trim(),
    suggestedActions: params.finalization.suggestedActions,
    summary: params.finalization.summary.trim(),
  };
}

const SESSION_SUMMARY_CAP = 2400;

function normalizeSummaryChunk(chunk: string) {
  return chunk.replace(/\s+/g, " ").trim();
}

export function appendSessionSummary(existingSummary: string, nextChunk: string) {
  const normalizedChunk = normalizeSummaryChunk(nextChunk);

  if (!normalizedChunk) {
    return existingSummary.trim();
  }

  const chunks = existingSummary
    .split("\n")
    .map(normalizeSummaryChunk)
    .filter(Boolean);

  chunks.push(normalizedChunk);

  let combined = chunks.join("\n");

  while (combined.length > SESSION_SUMMARY_CAP && chunks.length > 1) {
    chunks.shift();
    combined = chunks.join("\n");
  }

  if (combined.length > SESSION_SUMMARY_CAP) {
    return normalizedChunk.slice(0, SESSION_SUMMARY_CAP).trim();
  }

  return combined;
}
