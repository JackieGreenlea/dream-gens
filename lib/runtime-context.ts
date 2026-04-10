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
}): RuntimeContextPacket {
  return {
    mode: params.mode ?? "turn",
    isFirstTurn: params.session.turnCount === 0,
    turnCount: params.session.turnCount,
    title: params.world.title,
    pov: params.session.pov,
    toneStyle: params.world.toneStyle || params.world.authorStyle,
    objective: params.session.objective,
    continuitySummary: params.session.summary.trim() || "The story is just beginning.",
    instructions: params.world.instructions,
    background: params.world.background,
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
