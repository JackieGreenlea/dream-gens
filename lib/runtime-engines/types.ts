import { RuntimeTurnOutput } from "@/lib/schemas";
import { PlayableStory, PlayerCharacter, SessionTurn, StoryPov } from "@/lib/types";

export type RuntimeEngineMode = "opening" | "turn";

export type RuntimeEngineSessionContext = {
  pov: StoryPov;
  summary: string;
  inactiveStoryCardIds: string[];
  turnCount: number;
  previousResponseId: string;
  recentTurns: SessionTurn[];
};

export type RuntimeEngineGenerateTurnParams = {
  story: PlayableStory;
  character: PlayerCharacter;
  session: RuntimeEngineSessionContext;
  playerAction: string;
  mode?: RuntimeEngineMode;
  onTextDelta?: (delta: string) => void | Promise<void>;
};

export type RuntimeEngineSentPayload = {
  engineId: string;
  inputMessages: unknown;
  sentPreviousResponseId: string;
  sentStoryCardIds: string[];
};

export type RuntimeEngineGenerateTurnResult = {
  output: RuntimeTurnOutput;
  responseId: string;
  payload: RuntimeEngineSentPayload;
};

export type RuntimeEngineGenerateSuggestedActionsParams = {
  story: PlayableStory;
  character: PlayerCharacter;
  session: RuntimeEngineSessionContext;
  turn: SessionTurn;
};

export type RuntimeEngineGenerateSuggestedActionsResult = {
  suggestedActions: string[];
  payload: RuntimeEngineSentPayload;
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

export class RuntimeEnginePayloadError extends Error {
  payload: RuntimeEngineSentPayload;

  constructor(message: string, payload: RuntimeEngineSentPayload) {
    super(message);
    this.name = "RuntimeEnginePayloadError";
    this.payload = payload;
  }
}
