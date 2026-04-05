import "server-only";

import { getSessionBundle, saveTurn } from "@/lib/db";
import { getRuntimeEngine } from "@/lib/runtime-engines";
import { appendSessionSummary, createSessionTurn } from "@/lib/runtime";

type SessionTurnResult = {
  turn: ReturnType<typeof createSessionTurn>;
  summary: string;
  previousResponseId: string;
  debug: {
    inputMessages: unknown;
    sentPreviousResponseId: string;
    responseId: string;
    rawResponse: unknown;
  };
};

async function generateAndPersistSessionTurn(params: {
  sessionId: string;
  playerAction: string;
  userId: string;
  mode?: "opening" | "turn";
  onTextDelta?: (delta: string) => void | Promise<void>;
}): Promise<SessionTurnResult> {
  const bundle = await getSessionBundle(params.sessionId, params.userId);

  if (!bundle || !bundle.character) {
    throw new Error("Session context could not be loaded.");
  }

  const runtimeEngine = getRuntimeEngine();
  const engineResult = await runtimeEngine.generateTurn({
    world: bundle.world,
    character: bundle.character,
    session: {
      objective: bundle.session.objective,
      pov: bundle.session.pov,
      summary: bundle.session.summary,
      turnCount: bundle.session.turnCount,
      previousResponseId: bundle.session.previousResponseId,
      recentTurns: bundle.session.turns,
    },
    playerAction: params.playerAction,
    mode: params.mode ?? "turn",
    onTextDelta: params.onTextDelta,
  });

  const turn = createSessionTurn({
    playerAction: params.playerAction,
    turnNumber: bundle.session.turnCount + 1,
    output: engineResult.output,
    background: bundle.world.background,
    mode: params.mode ?? "turn",
  });
  const nextSessionSummary = appendSessionSummary(bundle.session.summary, turn.summaryAfterTurn);
  const nextPreviousResponseId = engineResult.responseId || bundle.session.previousResponseId || "";

  await saveTurn({
    sessionId: bundle.session.id,
    turn,
    summary: nextSessionSummary,
    previousResponseId: nextPreviousResponseId,
  });

  return {
    turn,
    summary: nextSessionSummary,
    previousResponseId: nextPreviousResponseId,
    debug: {
      inputMessages: engineResult.debug.inputMessages,
      sentPreviousResponseId: engineResult.debug.sentPreviousResponseId,
      responseId: nextPreviousResponseId,
      rawResponse: engineResult.debug.rawResponse,
    },
  };
}

export async function runSessionTurn(params: {
  sessionId: string;
  playerAction: string;
  userId: string;
}) {
  return generateAndPersistSessionTurn(params);
}

export async function runSessionOpeningTurn(params: {
  sessionId: string;
  userId: string;
}) {
  return generateAndPersistSessionTurn({
    sessionId: params.sessionId,
    userId: params.userId,
    playerAction: "",
    mode: "opening",
  });
}

export async function streamSessionTurn(
  params: Parameters<typeof generateAndPersistSessionTurn>[0],
) {
  return generateAndPersistSessionTurn(params);
}
