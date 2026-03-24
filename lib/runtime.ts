import { OpenAIInputMessage } from "@/lib/openai";
import { RuntimeTurnOutput } from "@/lib/schemas";
import { SessionTurn, World } from "@/lib/types";

export const RUNTIME_SYSTEM_PROMPT = `You are Story World Studio's session runtime.

Requirements:
- Continue directly from the player's action.
- Do not restate or paraphrase the player's submitted action at the start of storyText.
- Begin with the immediate consequence, reaction, reveal, or next dramatic beat.
- Respect the world's tone, rules, and dramatic logic.
- Use the character's strengths and weaknesses narratively, not as dice rolls or RPG mechanics.
- summary must be a very short memory chunk, not a recap paragraph.
- Keep summary to about 20 words maximum.
- Prefer one short sentence.
- summary should capture only what newly happened that still matters for continuity.
- Suggested actions must reflect reasonable actions the player could take based on the current scene.
- Each suggested action must be 1-2 short sentences.
- Each suggested action must not exceed 20 words.
- Start each suggested action with a clear verb when possible.
- Do not restate the scene or write strategy commentary.
- Return strictly valid JSON matching the requested schema.
- Keep storyText to 1-3 short paragraphs.
- Avoid one dense block of text.`;

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

  const withEnding = /[.!?]$/.test(shortened) ? shortened : `${shortened}.`;
  return withEnding;
}

export function normalizeSuggestedActions(actions: string[]) {
  const normalized = actions
    .slice(0, 3)
    .map((action, index) => normalizeSuggestedAction(action, FALLBACK_ACTIONS[index]))
    .filter(Boolean);

  while (normalized.length < 3) {
    normalized.push(FALLBACK_ACTIONS[normalized.length]);
  }

  return normalized;
}

function toInputMessage(role: OpenAIInputMessage["role"], text: string): OpenAIInputMessage {
  if (role === "assistant") {
    return {
      role,
      content: [{ type: "output_text", text }],
    };
  }

  return {
    role,
    content: [{ type: "input_text", text }],
  };
}

function buildRuntimeDeveloperMessage({
  world,
  character,
  session,
}: {
  world: World;
  character: World["playerCharacters"][number];
  session: {
    objective: string;
    pov: World["pov"];
    summary: string;
  };
}) {
  return [
    "Story Background:",
    world.background,
    "",
    "Story Instructions:",
    world.instructions,
    "",
    `Write in the following style: ${world.authorStyle}`,
    `Narrate in ${session.pov.replace("_", " ")} point of view.`,
    `The user is ${character.name}, ${character.description}`,
    `The user's objective is ${session.objective}`,
    `The user's strengths are ${character.strengths.join(", ")}`,
    `The user's weaknesses are ${character.weaknesses.join(", ")}`,
    `So far in the story: ${session.summary || "The story is just beginning."}`,
  ].join("\n");
}

export function buildRuntimeInputMessages({
  world,
  character,
  session,
  playerAction,
}: {
  world: World;
  character: World["playerCharacters"][number];
  session: {
    objective: string;
    pov: World["pov"];
    previousResponseId: string;
    summary: string;
    turns: SessionTurn[];
  };
  playerAction: string;
}) {
  const messages: OpenAIInputMessage[] = [
    toInputMessage("system", RUNTIME_SYSTEM_PROMPT),
    toInputMessage(
      "developer",
      buildRuntimeDeveloperMessage({
        world,
        character,
        session,
      }),
    ),
  ];

  messages.push(toInputMessage("user", playerAction.trim()));

  return messages;
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
}): SessionTurn {
  return {
    turnNumber: params.turnNumber,
    playerAction: params.playerAction.trim(),
    storyText: removeRestatedOpening(params.playerAction, params.output.storyText),
    suggestedActions: normalizeSuggestedActions(params.output.suggestedActions),
    summaryAfterTurn: params.output.summary.trim(),
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
