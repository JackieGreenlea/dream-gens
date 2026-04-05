import { World } from "@/lib/types";

export type RuntimeContextPacket = {
  mode: "opening" | "turn";
  isFirstTurn: boolean;
  title: string;
  pov: World["pov"];
  toneStyle: string;
  objective: string;
  instructions: string;
  background: string;
  continuitySummary: string;
  openingGuidance: string;
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
  };
  mode?: "opening" | "turn";
}): RuntimeContextPacket {
  return {
    mode: params.mode ?? "turn",
    isFirstTurn: params.session.turnCount === 0,
    title: params.world.title,
    pov: params.session.pov,
    toneStyle: params.world.authorStyle,
    objective: params.session.objective,
    instructions: params.world.instructions,
    background: params.world.background,
    continuitySummary: params.session.summary || "The story is just beginning.",
    openingGuidance: params.world.firstAction.trim(),
    character: {
      name: params.character.name,
      description: params.character.description,
      strengths: params.character.strengths,
      weaknesses: params.character.weaknesses,
    },
  };
}
