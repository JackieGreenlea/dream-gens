import { PlayableStory } from "@/lib/types";
import { selectActiveStoryCards, selectCoreStoryCards } from "@/lib/runtime-story-cards";

export type RuntimeContextPacket = {
  mode: "opening" | "turn";
  isFirstTurn: boolean;
  turnCount: number;
  title: string;
  pov: PlayableStory["pov"];
  toneStyle: string;
  continuitySummary: string;
  instructions: string;
  background: string;
  runtimeBackground: string;
  activeStoryCards: PlayableStory["storyCards"];
  coreStoryCards: PlayableStory["storyCards"];
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

  return {
    mode: params.mode ?? "turn",
    isFirstTurn: params.session.turnCount === 0,
    turnCount: params.session.turnCount,
    title: params.story.title,
    pov: params.session.pov,
    toneStyle: params.story.toneStyle || params.story.authorStyle,
    continuitySummary: rollingSummary,
    instructions: params.story.instructions,
    background: params.story.background,
    runtimeBackground: params.story.runtimeBackground || params.story.background,
    activeStoryCards,
    coreStoryCards,
    recentTurns,
    character: {
      name: params.character.name,
      description: params.character.description,
    },
  };
}
