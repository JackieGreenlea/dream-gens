import "server-only";

import { getSessionBundle, saveTurn, updateTurnSuggestedActions } from "@/lib/db";
import { getRuntimeEngine } from "@/lib/runtime-engines";
import { createSessionTurn, normalizeSuggestedActions } from "@/lib/runtime";

type SessionTurnResult = {
  turn: ReturnType<typeof createSessionTurn>;
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
  const requestStartMs = Date.now();
  const bundle = await getSessionBundle(params.sessionId, params.userId);
  console.info("[session-runtime] bundle loaded", {
    sessionId: params.sessionId,
    mode: params.mode ?? "turn",
    elapsedMs: Date.now() - requestStartMs,
  });

  if (!bundle || !bundle.character) {
    throw new Error("Session context could not be loaded.");
  }

  const runtimeEngine = getRuntimeEngine();
  const engineStartMs = Date.now();
  const engineResult = await runtimeEngine.generateTurn({
    world: bundle.world,
    character: bundle.character,
    session: {
      objective: bundle.session.objective,
      pov: bundle.session.pov,
      turnCount: bundle.session.turnCount,
      previousResponseId: bundle.session.previousResponseId,
      recentTurns: bundle.session.turns,
    },
    playerAction: params.playerAction,
    mode: params.mode ?? "turn",
    onTextDelta: params.onTextDelta,
  });
  console.info("[session-runtime] engine completed", {
    sessionId: params.sessionId,
    mode: params.mode ?? "turn",
    elapsedMs: Date.now() - engineStartMs,
    totalElapsedMs: Date.now() - requestStartMs,
  });

  const turn = createSessionTurn({
    playerAction: params.playerAction,
    turnNumber: bundle.session.turnCount + 1,
    output: engineResult.output,
    background: bundle.world.background,
    mode: params.mode ?? "turn",
  });
  const nextPreviousResponseId = engineResult.responseId || bundle.session.previousResponseId || "";

  await saveTurn({
    sessionId: bundle.session.id,
    turn,
    previousResponseId: nextPreviousResponseId,
  });
  console.info("[session-runtime] turn saved", {
    sessionId: params.sessionId,
    turnNumber: turn.turnNumber,
    elapsedMs: Date.now() - requestStartMs,
  });

  return {
    turn,
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

export async function generateSessionSuggestedActions(params: {
  sessionId: string;
  userId: string;
}) {
  const bundle = await getSessionBundle(params.sessionId, params.userId);

  if (!bundle || !bundle.character) {
    throw new Error("Session context could not be loaded.");
  }

  const latestTurn = bundle.session.turns.at(-1);

  if (!latestTurn) {
    throw new Error("There is no turn available for suggested actions.");
  }

  const runtimeEngine = getRuntimeEngine();
  const result = await runtimeEngine.generateSuggestedActions({
    world: bundle.world,
    character: bundle.character,
    session: {
      objective: bundle.session.objective,
      pov: bundle.session.pov,
      turnCount: bundle.session.turnCount,
      previousResponseId: bundle.session.previousResponseId,
      recentTurns: bundle.session.turns,
    },
    turn: latestTurn,
  });

  const suggestedActions = normalizeSuggestedActions(result.suggestedActions);
  const session = await updateTurnSuggestedActions({
    sessionId: bundle.session.id,
    userId: params.userId,
    turnNumber: latestTurn.turnNumber,
    suggestedActions,
  });

  if (!session) {
    throw new Error("Suggested actions could not be saved.");
  }

  return {
    session,
    turnNumber: latestTurn.turnNumber,
    suggestedActions,
    debug: result.debug,
  };
}
