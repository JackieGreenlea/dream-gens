import { OpenAIInputMessage } from "@/lib/openai";
import { RuntimeTurnFinalizationOutput, RuntimeTurnOutput } from "@/lib/schemas";
import { SessionTurn, World } from "@/lib/types";

export const RUNTIME_STORY_SYSTEM_PROMPT = `You are Story World Studio's session runtime.

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

export const RUNTIME_OPENING_SYSTEM_PROMPT = `You are Story World Studio's session runtime.

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

export const RUNTIME_FINALIZATION_SYSTEM_PROMPT = `You are Story World Studio's turn finalizer.

Requirements:
- Read the completed story beat and return strictly valid JSON matching the requested schema.
- summary must be a very short continuity note, not a recap paragraph.
- Keep summary to about 20 words maximum.
- Prefer one short sentence.
- summary should capture only what newly happened that still matters.
- Suggested actions must reflect reasonable next moves in the current scene.
- Each suggested action must be 1-2 short sentences and no more than 20 words.
- Start each suggested action with a clear verb when possible.
- Do not restate the scene or write strategy commentary.`;

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

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function buildFirstTurnDeveloperMessage({
  world,
  character,
  session,
  mode,
}: {
  world: World;
  character: World["playerCharacters"][number];
  session: {
    objective: string;
    pov: World["pov"];
    summary: string;
  };
  mode: "opening" | "turn";
}) {
  return [
    "Session Setup:",
    `Title: ${world.title}`,
    `POV: ${session.pov.replace("_", " ")}`,
    `Tone / Style: ${world.authorStyle}`,
    `Objective: ${session.objective}`,
    "",
    "Story Instructions:",
    world.instructions,
    "",
    "Story Background:",
    world.background,
    "",
    "Selected Playable Character:",
    `${character.name}: ${character.description}`,
    `Strengths: ${character.strengths.join(", ")}`,
    `Weaknesses: ${character.weaknesses.join(", ")}`,
    "",
    "Launch Notes:",
    `This is the opening runtime turn for this session.`,
    mode === "opening"
      ? `Generate an opening scene that invites the player's first action.`
      : `The latest user message is the player's action already taken.`,
    world.firstAction.trim()
      ? `Optional opening guidance from the story template: ${world.firstAction.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildContinuityDeveloperMessage({
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
    "Continuity Packet:",
    `Title: ${world.title}`,
    `POV: ${session.pov.replace("_", " ")}`,
    `Tone / Style: ${world.authorStyle}`,
    `Objective: ${session.objective}`,
    `Runtime Instructions: ${compactText(world.instructions, 220)}`,
    `Character Anchor: ${character.name} — ${compactText(character.description, 180)}`,
    `Strengths: ${character.strengths.join(", ")}`,
    `Weaknesses: ${character.weaknesses.join(", ")}`,
    `Continuity Summary: ${session.summary || "The story is just beginning."}`,
  ].join("\n");
}

function buildRuntimeDeveloperMessage({
  world,
  character,
  session,
  mode,
}: {
  world: World;
  character: World["playerCharacters"][number];
  session: {
    objective: string;
    pov: World["pov"];
    summary: string;
    turnCount: number;
  };
  mode: "opening" | "turn";
}) {
  return session.turnCount === 0
    ? buildFirstTurnDeveloperMessage({
        world,
        character,
        session,
        mode,
      })
    : buildContinuityDeveloperMessage({
        world,
        character,
        session,
      });
}

export function buildRuntimeInputMessages({
  world,
  character,
  session,
  playerAction,
  mode = "turn",
}: {
  world: World;
  character: World["playerCharacters"][number];
  session: {
    objective: string;
    pov: World["pov"];
    summary: string;
    turnCount: number;
  };
  playerAction: string;
  mode?: "opening" | "turn";
}) {
  const messages: OpenAIInputMessage[] = [
    toInputMessage("system", mode === "opening" ? RUNTIME_OPENING_SYSTEM_PROMPT : RUNTIME_STORY_SYSTEM_PROMPT),
    toInputMessage(
      "developer",
      buildRuntimeDeveloperMessage({
        world,
        character,
        session,
        mode,
      }),
    ),
  ];

  messages.push(
    toInputMessage(
      "user",
      mode === "opening"
        ? "Generate the opening scene for this session. Introduce the selected character, establish the situation, and end by inviting the player's first action."
        : playerAction.trim(),
    ),
  );

  return messages;
}

export function buildRuntimeTurnFinalizationMessages({
  world,
  character,
  session,
  playerAction,
  storyText,
  mode = "turn",
}: {
  world: World;
  character: World["playerCharacters"][number];
  session: {
    objective: string;
    pov: World["pov"];
    summary: string;
    turnCount: number;
  };
  playerAction: string;
  storyText: string;
  mode?: "opening" | "turn";
}) {
  return [
    toInputMessage("system", RUNTIME_FINALIZATION_SYSTEM_PROMPT),
    toInputMessage(
      "developer",
      buildRuntimeDeveloperMessage({
        world,
        character,
        session,
        mode,
      }),
    ),
    toInputMessage(
      "user",
      mode === "opening"
        ? [
            "This is the opening scene for the session.",
            "",
            "Completed story beat:",
            storyText.trim(),
            "",
            "Return JSON with suggestedActions and summary only.",
          ].join("\n")
        : [
            `Player action: ${playerAction.trim()}`,
            "",
            "Completed story beat:",
            storyText.trim(),
            "",
            "Return JSON with suggestedActions and summary only.",
          ].join("\n"),
    ),
  ];
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
  mode?: "opening" | "turn";
}): SessionTurn {
  return {
    turnNumber: params.turnNumber,
    playerAction: params.playerAction.trim(),
    storyText:
      params.mode === "opening"
        ? params.output.storyText.trim()
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
