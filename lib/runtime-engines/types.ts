import { RuntimeTurnOutput } from "@/lib/schemas";
import { PlayerCharacter, SessionTurn, StoryPov, World } from "@/lib/types";

export type RuntimeEngineMode = "opening" | "turn";

export type RuntimeEngineSessionContext = {
  objective: string;
  pov: StoryPov;
  turnCount: number;
  previousResponseId: string;
  recentTurns: SessionTurn[];
};

export type RuntimeEngineGenerateTurnParams = {
  world: World;
  character: PlayerCharacter;
  session: RuntimeEngineSessionContext;
  playerAction: string;
  mode?: RuntimeEngineMode;
  onTextDelta?: (delta: string) => void | Promise<void>;
};

export type RuntimeEngineDebugPayload = {
  engineId: string;
  inputMessages: unknown;
  sentPreviousResponseId: string;
  rawResponse: unknown;
  finalizationText?: string;
  parsedOutput?: unknown;
  validationError?: unknown;
};

export type RuntimeEngineGenerateTurnResult = {
  output: RuntimeTurnOutput;
  responseId: string;
  debug: RuntimeEngineDebugPayload;
};

export type RuntimeEngineGenerateSuggestedActionsParams = {
  world: World;
  character: PlayerCharacter;
  session: RuntimeEngineSessionContext;
  turn: SessionTurn;
};

export type RuntimeEngineGenerateSuggestedActionsResult = {
  suggestedActions: string[];
  debug: RuntimeEngineDebugPayload;
};

export interface RuntimeEngine {
  id: string;
  generateTurn(
    params: RuntimeEngineGenerateTurnParams,
  ): Promise<RuntimeEngineGenerateTurnResult>;
  generateSuggestedActions(
    params: RuntimeEngineGenerateSuggestedActionsParams,
  ): Promise<RuntimeEngineGenerateSuggestedActionsResult>;
}

export class RuntimeEngineDebugError extends Error {
  debug: RuntimeEngineDebugPayload;

  constructor(message: string, debug: RuntimeEngineDebugPayload) {
    super(message);
    this.name = "RuntimeEngineDebugError";
    this.debug = debug;
  }
}
