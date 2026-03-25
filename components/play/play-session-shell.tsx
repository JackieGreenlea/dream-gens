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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const suggestedActions =
    session && world && character
      ? session.turns.at(-1)?.suggestedActions ?? buildSuggestedActions(world, character)
      : [];
  const recentTurns = session?.turns ?? [];
  const latestTurn = recentTurns.at(-1) ?? null;
  const previousTurns = latestTurn ? recentTurns.slice(0, -1) : [];

  function renderStoryText(text: string) {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    const content = paragraphs.length > 0 ? paragraphs : [text.trim()];

    return (
      <div className="space-y-4">
        {content.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 24)}`} className="text-sm leading-7 text-secondary whitespace-pre-wrap">
            {paragraph}
          </p>
        ))}
      </div>
    );
  }

  if (!session || !world || !character) {
    return (
      <Card>
        <p className="text-foreground">Session not found.</p>
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

      const nextTurn = data.turn;
      const nextSummary = data.summary;

      if (isDevelopment) {
        setDebugInputMessages(data.debug?.inputMessages ?? null);
        setDebugThreadState({
          sentPreviousResponseId: data.debug?.sentPreviousResponseId ?? "",
          receivedResponseId: data.debug?.responseId ?? "",
          storedPreviousResponseId: data.previousResponseId ?? data.debug?.responseId ?? "",
        });
        setDebugRawResponse(data.debug?.rawResponse ?? null);
        setDebugNormalizedTurn(nextTurn);
      }

      setSession((current) =>
        current
          ? {
              ...current,
              turnCount: nextTurn.turnNumber,
              previousResponseId: data.previousResponseId ?? current.previousResponseId,
              summary: nextSummary,
              turns: [...current.turns, nextTurn].slice(-5),
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
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <section className="relative p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm text-secondary">
                <span className="rounded-full border border-line px-3 py-1">
                  Turn {session.turnCount}
                </span>
                <span className="rounded-full border border-line px-3 py-1">{character.name}</span>
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDetailsOpen((current) => !current)}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-foreground transition hover:border-fieldBorder hover:bg-elevated"
                >
                  {isDetailsOpen ? "Hide" : "Details"}
                </button>

                {isDetailsOpen ? (
                  <div className="absolute right-0 top-10 z-10 w-[min(20rem,calc(100vw-2rem))] rounded-3xl border border-line bg-surface p-5 backdrop-blur sm:w-[22rem]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">Details</p>
                      <button
                        type="button"
                        onClick={() => setIsDetailsOpen(false)}
                        className="text-xs uppercase tracking-[0.18em] text-secondary transition hover:text-foreground"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-4 space-y-5">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-secondary">Character</p>
                        <p className="text-lg font-medium text-foreground">{character.name}</p>
                        <p className="text-sm leading-6 text-secondary">{character.description}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-secondary">Objective</p>
                        <p className="text-sm leading-6 text-secondary">{session.objective}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-secondary">Story Summary</p>
                        <p className="text-sm leading-6 text-secondary">{world.summary}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{world.title}</h1>
            </div>
          </div>
        </section>

        {previousTurns.length > 0 ? (
          <section className="border-t border-line p-4 sm:p-6">
            <details className="space-y-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                Previous turns
              </summary>
              <div className="mt-4 space-y-4">
                {previousTurns.map((turn) => (
                  <div key={turn.turnNumber} className="rounded-2xl border border-line bg-elevated p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-secondary">Turn {turn.turnNumber}</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{turn.playerAction}</p>
                    <div className="mt-3">{renderStoryText(turn.storyText)}</div>
                  </div>
                ))}
              </div>
            </details>
          </section>
        ) : null}

        <section className="border-t border-line p-4 sm:p-6">
          {latestTurn ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm uppercase tracking-[0.24em] text-warm">Current Scene</p>
                <span className="text-xs text-secondary">Turn {latestTurn.turnNumber}</span>
              </div>
              <p className="text-sm leading-7 text-foreground">{latestTurn.playerAction}</p>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-secondary">Story</p>
                {renderStoryText(latestTurn.storyText)}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.24em] text-warm">Starting Game</p>
              <p className="text-sm leading-7 text-secondary">
                The first turn is being established for this session.
              </p>
            </div>
          )}
        </section>

        <section className="border-t border-line p-4 sm:p-6">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-warm">Actions</p>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <textarea
                value={playerAction}
                onChange={(event) => setPlayerAction(event.target.value)}
                disabled={isSubmitting}
                className="min-h-40 w-full rounded-2xl border border-fieldBorder bg-field px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Type what your character does next..."
              />
              {error ? (
                <div className="rounded-2xl border border-danger/35 bg-danger/12 p-4 text-sm text-foreground">
                  {error}
                </div>
              ) : null}
              <Button type="submit" disabled={isSubmitting || !playerAction.trim()}>
                {isSubmitting ? "Resolving turn..." : "Submit action"}
              </Button>
            </form>

            <div className="space-y-3 border-t border-line pt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary">Suggested Actions</p>
              <div className="grid gap-3">
                {suggestedActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => submitAction(action)}
                    className="rounded-2xl border border-line bg-elevated p-4 text-left text-sm text-secondary transition hover:border-fieldBorder hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Card>

      {isDevelopment ? (
        <div>
          <details className="rounded-3xl border border-warning/35 bg-warning/10 p-6 backdrop-blur">
            <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
              Runtime Debug
            </summary>
            <div className="mt-4 space-y-4">
              <Card className="space-y-3 border-warning/35 bg-elevated">
                <p className="text-sm uppercase tracking-[0.24em] text-warm">Client Request Payload</p>
                <pre className="overflow-x-auto rounded-2xl border border-line bg-page p-4 text-xs leading-6 text-secondary">
                  {debugRequestPayload
                    ? JSON.stringify(debugRequestPayload, null, 2)
                    : "No request submitted yet."}
                </pre>
              </Card>

              <Card className="space-y-3 border-warning/35 bg-elevated">
                <p className="text-sm uppercase tracking-[0.24em] text-warm">Runtime Message Array</p>
                <pre className="overflow-x-auto rounded-2xl border border-line bg-page p-4 text-xs leading-6 text-secondary">
                  {debugInputMessages
                    ? JSON.stringify(debugInputMessages, null, 2)
                    : "No message array captured yet."}
                </pre>
              </Card>

              <Card className="space-y-3 border-warning/35 bg-elevated">
                <p className="text-sm uppercase tracking-[0.24em] text-warm">Thread State</p>
                <pre className="overflow-x-auto rounded-2xl border border-line bg-page p-4 text-xs leading-6 text-secondary">
                  {debugThreadState
                    ? JSON.stringify(debugThreadState, null, 2)
                    : "No thread state captured yet."}
                </pre>
              </Card>

              <Card className="space-y-3 border-warning/35 bg-elevated">
                <p className="text-sm uppercase tracking-[0.24em] text-warm">Raw Runtime Response</p>
                <pre className="overflow-x-auto rounded-2xl border border-line bg-page p-4 text-xs leading-6 text-secondary">
                  {debugRawResponse
                    ? JSON.stringify(debugRawResponse, null, 2)
                    : "No raw response captured yet."}
                </pre>
              </Card>

              <Card className="space-y-3 border-warning/35 bg-elevated">
                <p className="text-sm uppercase tracking-[0.24em] text-warm">Final Normalized Turn</p>
                <pre className="overflow-x-auto rounded-2xl border border-line bg-page p-4 text-xs leading-6 text-secondary">
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
