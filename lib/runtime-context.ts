import { PlayableStory } from "@/lib/types";
import { selectActiveStoryCards, selectCoreStoryCards } from "@/lib/runtime-story-cards";

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function stripStorySectionLabels(value: string) {
  return value
    .replace(/(?:^|\n)(?:Background|Opening):\n/gi, "\n")
    .trim();
}

export type RuntimeContextPacket = {
  mode: "opening" | "turn";
  isFirstTurn: boolean;
  turnCount: number;
  title: string;
  pov: PlayableStory["pov"];
  toneStyle: string;
  relationshipStructure: string;
  intensityLevel: PlayableStory["intensityLevel"];
  continuitySummary: string;
  instructions: string;
  background: string;
  runtimeBackground: string;
  openingScene: string;
  activeStoryCards: PlayableStory["storyCards"];
  coreStoryCards: PlayableStory["storyCards"];
  sceneState: {
    focalCharacterNames: string[];
    currentLocation: string;
    activePressure: string;
    latestBeat: string;
  };
  recentTurns: Array<{
    turnNumber: number;
    playerAction: string;
    storyText: string;
  }>;
  character: {
    name: string;
    description: string;
  };
};

export function buildRuntimeContextPacket(params: {
  story: PlayableStory;
  character: PlayableStory["playerCharacters"][number];
  session: {
    pov: PlayableStory["pov"];
    summary: string;
    inactiveStoryCardIds: string[];
    turnCount: number;
    recentTurns: Array<{
      turnNumber: number;
      playerAction: string;
      storyText: string;
    }>;
  };
  mode?: "opening" | "turn";
  playerAction?: string;
}): RuntimeContextPacket {
  const rollingSummary = params.session.summary.trim() || "The story is just beginning.";
  const inactiveStoryCardIds = new Set(params.session.inactiveStoryCardIds);
  const recentTurns = params.session.recentTurns.slice(-10).map((turn) => ({
    turnNumber: turn.turnNumber,
    playerAction: turn.playerAction,
    storyText: turn.storyText,
  }));
  const coreStoryCards = selectCoreStoryCards(params.story.storyCards).filter(
    (card) => !inactiveStoryCardIds.has(card.id),
  );
  const activeStoryCards = selectActiveStoryCards({
    storyCards: params.story.storyCards,
    playerAction: params.playerAction ?? "",
    rollingSummary,
    recentTurns,
  }).filter((card) => !inactiveStoryCardIds.has(card.id));
  const focalCharacterNames = [...new Set(
    [...activeStoryCards, ...coreStoryCards]
      .filter((card) => card.type === "character")
      .map((card) => card.title.trim())
      .filter((name) => name && name !== params.character.name),
  )].slice(0, 3);
  const currentLocation =
    [...activeStoryCards, ...coreStoryCards]
      .find((card) => card.type === "location")
      ?.title.trim() ?? "";
  const activePressure =
    [...activeStoryCards, ...coreStoryCards]
      .find((card) => card.type === "story_event")
      ?.description.trim() ??
    compactText(params.story.openingScene, 220);
  const latestBeat = params.session.recentTurns.at(-1)?.storyText?.trim()
    ? compactText(stripStorySectionLabels(params.session.recentTurns.at(-1)?.storyText ?? ""), 220)
    : compactText(params.story.openingScene, 220);

  return {
    mode: params.mode ?? "turn",
    isFirstTurn: params.session.turnCount === 0,
    turnCount: params.session.turnCount,
    title: params.story.title,
    pov: params.session.pov,
    toneStyle: params.story.toneStyle || params.story.authorStyle,
    relationshipStructure: params.story.relationshipStructure,
    intensityLevel: params.story.intensityLevel,
    continuitySummary: rollingSummary,
    instructions: params.story.instructions,
    background: params.story.background,
    runtimeBackground: params.story.runtimeBackground || params.story.background,
    openingScene: params.story.openingScene,
    activeStoryCards,
    coreStoryCards,
    sceneState: {
      focalCharacterNames,
      currentLocation,
      activePressure,
      latestBeat,
    },
    recentTurns,
    character: {
      name: params.character.name,
      description: params.character.description,
    },
  };
}
