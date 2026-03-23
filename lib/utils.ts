import { PlayerCharacter, World } from "@/lib/types";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function createId(prefix: string) {
  const seed = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${seed}`;
}

export function titleFromPremise(premise: string) {
  const trimmed = premise.trim();

  if (!trimmed) {
    return "Untitled World";
  }

  const words = trimmed
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);

  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

export function parseLineList(value: string, fallback: string[] = [], targetCount = 3) {
  const parsed = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (parsed.length === 0) {
    return fallback;
  }

  return parsed.slice(0, targetCount);
}

export function formatLineList(values: string[]) {
  return values.join("\n");
}

export function buildSuggestedActions(world: World, character: PlayerCharacter) {
  const leadStrength = character.strengths[0];
  const definingWeakness = character.weaknesses[0];

  return [
    "Question the nearest witness.",
    leadStrength
      ? `Use ${leadStrength.toLowerCase()} to seize control.`
      : "Take decisive action now.",
    definingWeakness
      ? `Act before ${definingWeakness.toLowerCase()} costs you.`
      : "Force the situation to shift.",
  ];
}

export function formatLibraryDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
