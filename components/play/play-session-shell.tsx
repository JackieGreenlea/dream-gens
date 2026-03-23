"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayerCharacter, Session, SessionTurn, World } from "@/lib/types";
import { buildSuggestedActions } from "@/lib/utils";

type PlaySessionShellProps = {
  sessionId: string;
  initialSession: Session | null;
  initialWorld: World | null;
  initialCharacter: PlayerCharacter | null;
};

export function PlaySessionShell({
  sessionId,
  initialSession,
  initialWorld,
  initialCharacter,
}: PlaySessionShellProps) {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV !== "production";
  const [session, setSession] = useState<Session | null>(initialSession);
  const [world] = useState<World | null>(initialWorld);
  const [character] = useState<PlayerCharacter | null>(initialCharacter);
  const [playerAction, setPlayerAction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [debugRequestPayload, setDebugRequestPayload] = useState<unknown>(null);
  const [debugInputMessages, setDebugInputMessages] = useState<unknown>(null);
  const [debugThreadState, setDebugThreadState] = useState<unknown>(null);
  const [debugRawResponse, setDebugRawResponse] = useState<unknown>(null);
  const [debugNormalizedTurn, setDebugNormalizedTurn] = useState<SessionTurn | null>(null);

  const suggestedActions =
    session && world && character
      ? session.turns.at(-1)?.suggestedActions ?? buildSuggestedActions(world, character)
      : [];
  const recentTurns = session?.turns ?? [];
  const latestTurn = recentTurns.at(-1) ?? null;
  const previousTurns = latestTurn ? recentTurns.slice(0, -1) : [];

  if (!session || !world || !character) {
    return (
      <Card>
        <p className="text-white">Session not found.</p>
      </Card>
    );
  }

  async function submitAction(action: string) {
    const nextAction = action.trim();

    if (isSubmitting || !nextAction) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const requestPayload = {
        sessionId,
        playerAction: nextAction,
      };

      if (isDevelopment) {
        setDebugRequestPayload(requestPayload);
      }

      const response = await fetch("/api/session/turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const data = (await response.json()) as {
        turn?: SessionTurn;
        summary?: string;
        suggestedActions?: string[];
        previousResponseId?: string;
        error?: string;
        debug?: {
          inputMessages?: unknown;
          sentPreviousResponseId?: string;
          responseId?: string;
          rawResponse?: unknown;
        };
      };

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20continue%20this%20session.");
        return;
      }

      if (!response.ok || !data.turn || !data.summary) {
        throw new Error(data.error || "The session could not generate the next turn.");
      }

      if (isDevelopment) {
        setDebugInputMessages(data.debug?.inputMessages ?? null);
        setDebugThreadState({
          sentPreviousResponseId: data.debug?.sentPreviousResponseId ?? "",
          receivedResponseId: data.debug?.responseId ?? "",
          storedPreviousResponseId: data.previousResponseId ?? data.debug?.responseId ?? "",
        });
        setDebugRawResponse(data.debug?.rawResponse ?? null);
        setDebugNormalizedTurn(data.turn);
      }

      setSession((current) =>
        current
          ? {
              ...current,
              turnCount: data.turn?.turnNumber ?? current.turnCount,
              previousResponseId: data.previousResponseId ?? current.previousResponseId,
              summary: data.summary ?? current.summary,
              turns: [...current.turns, data.turn].slice(-5),
            }
          : current,
      );
      setPlayerAction("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while continuing the story.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAction(playerAction);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-6">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-mist">
            <span className="rounded-full border border-white/10 px-3 py-1">
              Turn {session.turnCount}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">{character.name}</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">{world.title}</h1>
            <p className="text-sm leading-6 text-mist">{character.description}</p>
          </div>
        </Card>

        {latestTurn ? (
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm uppercase tracking-[0.24em] text-gold">Current Scene</p>
              <span className="text-xs text-mist">Turn {latestTurn.turnNumber}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-mist">Latest Action</p>
              <p className="mt-2 text-sm leading-7 text-white">{latestTurn.playerAction}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-mist">Story</p>
              <p className="text-sm leading-7 text-mist">{latestTurn.storyText}</p>
            </div>
          </Card>
        ) : (
          <Card className="space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-gold">Starting Game</p>
            <p className="text-sm leading-7 text-mist">
              The first turn is being established for this session.
            </p>
          </Card>
        )}

        {previousTurns.length > 0 ? (
          <details className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-glow backdrop-blur">
            <summary className="cursor-pointer list-none text-sm font-medium text-white">
              Previous turns
            </summary>
            <div className="mt-4 space-y-4">
              {previousTurns.map((turn) => (
                <div key={turn.turnNumber} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-mist">Turn {turn.turnNumber}</p>
                  <p className="mt-2 text-sm leading-6 text-white">{turn.playerAction}</p>
                  <p className="mt-3 text-sm leading-7 text-mist">{turn.storyText}</p>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <Card className="space-y-4">
          <p className="text-sm uppercase tracking-[0.24em] text-gold">Suggested Actions</p>
          <div className="grid gap-3">
            {suggestedActions.map((action) => (
              <button
                key={action}
                type="button"
                disabled={isSubmitting}
                onClick={() => submitAction(action)}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-sm text-mist transition hover:border-white/25 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {action}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-gold">Character</p>
          <p className="text-lg font-medium text-white">{character.name}</p>
          <p className="text-sm leading-6 text-mist">{character.description}</p>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-gold">Objective</p>
          <p className="text-sm leading-6 text-mist">{session.objective}</p>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-gold">Session Memory</p>
          <p className="text-sm leading-6 text-mist">
            {session.summary || "No long-range memory yet. The session is still establishing itself."}
          </p>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-gold">Action Input</p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <textarea
              value={playerAction}
              onChange={(event) => setPlayerAction(event.target.value)}
              disabled={isSubmitting}
              className="min-h-40 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-mist/60 focus:border-gold/70 focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Type what your character does next..."
            />
            {error ? (
              <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
            <Button type="submit" disabled={isSubmitting || !playerAction.trim()}>
              {isSubmitting ? "Resolving turn..." : "Submit action"}
            </Button>
          </form>
        </Card>
      </div>

      {isDevelopment ? (
        <div className="xl:col-span-2">
          <details className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-6 shadow-glow backdrop-blur">
            <summary className="cursor-pointer list-none text-sm font-medium text-white">
              Runtime Debug
            </summary>
            <div className="mt-4 space-y-4">
              <Card className="space-y-3 border-amber-400/20 bg-black/30">
                <p className="text-sm uppercase tracking-[0.24em] text-gold">Client Request Payload</p>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-mist">
                  {debugRequestPayload
                    ? JSON.stringify(debugRequestPayload, null, 2)
                    : "No request submitted yet."}
                </pre>
              </Card>

              <Card className="space-y-3 border-amber-400/20 bg-black/30">
                <p className="text-sm uppercase tracking-[0.24em] text-gold">Runtime Message Array</p>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-mist">
                  {debugInputMessages
                    ? JSON.stringify(debugInputMessages, null, 2)
                    : "No message array captured yet."}
                </pre>
              </Card>

              <Card className="space-y-3 border-amber-400/20 bg-black/30">
                <p className="text-sm uppercase tracking-[0.24em] text-gold">Thread State</p>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-mist">
                  {debugThreadState
                    ? JSON.stringify(debugThreadState, null, 2)
                    : "No thread state captured yet."}
                </pre>
              </Card>

              <Card className="space-y-3 border-amber-400/20 bg-black/30">
                <p className="text-sm uppercase tracking-[0.24em] text-gold">Raw Runtime Response</p>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-mist">
                  {debugRawResponse
                    ? JSON.stringify(debugRawResponse, null, 2)
                    : "No raw response captured yet."}
                </pre>
              </Card>

              <Card className="space-y-3 border-amber-400/20 bg-black/30">
                <p className="text-sm uppercase tracking-[0.24em] text-gold">Final Normalized Turn</p>
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-mist">
                  {debugNormalizedTurn
                    ? JSON.stringify(debugNormalizedTurn, null, 2)
                    : "No normalized turn stored yet."}
                </pre>
              </Card>
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
