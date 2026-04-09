import "server-only";

import {
  getSessionBundle,
  getSessionTurnBlock,
  saveTurn,
  updateSessionSummary,
  updateTurnSuggestedActions,
} from "@/lib/db";
import { getRuntimeEngine } from "@/lib/runtime-engines";
import { createSessionTurn, normalizeSuggestedActions } from "@/lib/runtime";
import {
  getRollingSummaryBlockBounds,
  isRollingSummaryRefreshTurn,
  summarizeTurnBlock,
  synthesizeRollingStorySummary,
} from "@/lib/session-summary";

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

async function refreshRollingSessionSummary(params: {
  sessionId: string;
  userId: string;
  completedTurnNumber: number;
  previousSummary: string;
}) {
  if (!isRollingSummaryRefreshTurn(params.completedTurnNumber)) {
    return;
  }

  const { startTurnNumber, endTurnNumber } = getRollingSummaryBlockBounds(params.completedTurnNumber);
  const blockTurns = await getSessionTurnBlock({
    sessionId: params.sessionId,
    userId: params.userId,
    startTurnNumber,
    endTurnNumber,
  });

  if (!blockTurns || blockTurns.length !== 8) {
    console.warn("[session-summary] skipped refresh due to incomplete block", {
      sessionId: params.sessionId,
      completedTurnNumber: params.completedTurnNumber,
      expectedTurns: 8,
      actualTurns: blockTurns?.length ?? 0,
    });
    return;
  }

  console.info("[session-summary] refresh start", {
    sessionId: params.sessionId,
    startTurnNumber,
    endTurnNumber,
  });

  const blockSummary = await summarizeTurnBlock(blockTurns);
  const nextSummary = params.previousSummary.trim()
    ? await synthesizeRollingStorySummary({
        previousSummary: params.previousSummary,
        latestBlockSummary: blockSummary,
      })
    : blockSummary;

  await updateSessionSummary({
    sessionId: params.sessionId,
    userId: params.userId,
    summary: nextSummary,
  });

  console.info("[session-summary] refresh success", {
    sessionId: params.sessionId,
    completedTurnNumber: params.completedTurnNumber,
    summaryLength: nextSummary.length,
  });
}

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
      summary: bundle.session.summary,
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

  try {
    await refreshRollingSessionSummary({
      sessionId: bundle.session.id,
      userId: params.userId,
      completedTurnNumber: turn.turnNumber,
      previousSummary: bundle.session.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown rolling-summary failure.";
    console.error("[session-summary] refresh failure", {
      sessionId: params.sessionId,
      completedTurnNumber: turn.turnNumber,
      message,
    });
  }

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
      summary: bundle.session.summary,
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
