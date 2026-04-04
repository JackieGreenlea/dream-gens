import { RuntimeTurnOutput } from "@/lib/schemas";
import { PlayerCharacter, StoryPov, World } from "@/lib/types";

export type RuntimeEngineMode = "opening" | "turn";

export type RuntimeEngineSessionContext = {
  objective: string;
  pov: StoryPov;
  summary: string;
  turnCount: number;
  previousResponseId: string;
};

export type RuntimeEngineGenerateTurnParams = {
  world: World;
  character: PlayerCharacter;
  session: RuntimeEngineSessionContext;
  playerAction: string;
  mode?: RuntimeEngineMode;
  onTextDelta?: (delta: string) => void | Promise<void>;
};

export type RuntimeEngineGenerateTurnResult = {
  output: RuntimeTurnOutput;
  responseId: string;
  debug: {
    inputMessages: unknown;
    sentPreviousResponseId: string;
    rawResponse: unknown;
  };
};

export interface RuntimeEngine {
  id: string;
  generateTurn(
    params: RuntimeEngineGenerateTurnParams,
  ): Promise<RuntimeEngineGenerateTurnResult>;
}
