import { selectActiveStoryCards } from "@/lib/runtime-story-cards";
import { World } from "@/lib/types";

export type RuntimeContextPacket = {
  mode: "opening" | "turn";
  isFirstTurn: boolean;
  turnCount: number;
  title: string;
  pov: World["pov"];
  toneStyle: string;
  objective: string;
  continuitySummary: string;
  instructions: string;
  background: string;
  activeStoryCards: World["storyCards"];
  recentTurns: Array<{
    turnNumber: number;
    playerAction: string;
    storyText: string;
  }>;
  character: {
    name: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
  };
};

export function buildRuntimeContextPacket(params: {
  world: World;
  character: World["playerCharacters"][number];
  session: {
    objective: string;
    pov: World["pov"];
    summary: string;
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

  return {
    mode: params.mode ?? "turn",
    isFirstTurn: params.session.turnCount === 0,
    turnCount: params.session.turnCount,
    title: params.world.title,
    pov: params.session.pov,
    toneStyle: params.world.toneStyle || params.world.authorStyle,
    objective: params.session.objective,
    continuitySummary: rollingSummary,
    instructions: params.world.instructions,
    background: params.world.background,
    activeStoryCards: selectActiveStoryCards({
      storyCards: params.world.storyCards,
      playerAction: params.playerAction ?? "",
      rollingSummary,
      recentTurns: params.session.recentTurns,
    }),
    recentTurns: params.session.recentTurns.slice(-10).map((turn) => ({
      turnNumber: turn.turnNumber,
      playerAction: turn.playerAction,
      storyText: turn.storyText,
    })),
    character: {
      name: params.character.name,
      description: params.character.description,
      strengths: params.character.strengths,
      weaknesses: params.character.weaknesses,
    },
  };
}
