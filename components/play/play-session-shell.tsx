"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { LoadingDots } from "@/components/ui/loading";
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
  const [pendingPlayerAction, setPendingPlayerAction] = useState("");
  const [streamingStoryText, setStreamingStoryText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [debugRequestPayload, setDebugRequestPayload] = useState<unknown>(null);
  const [debugInputMessages, setDebugInputMessages] = useState<unknown>(null);
  const [debugThreadState, setDebugThreadState] = useState<unknown>(null);
  const [debugRawResponse, setDebugRawResponse] = useState<unknown>(null);
  const [debugNormalizedTurn, setDebugNormalizedTurn] = useState<SessionTurn | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [areSuggestedActionsOpen, setAreSuggestedActionsOpen] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const suggestedActions =
    session && world && character
      ? session.turns.at(-1)?.suggestedActions ?? buildSuggestedActions(world, character)
      : [];
  const recentTurns = session?.turns ?? [];

  function sanitizeStreamingStoryText(text: string) {
    return text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/g, "")
      .replace(/^\s*\{\s*"storyText"\s*:\s*/i, "")
      .replace(/^\s*"storyText"\s*:\s*/i, "")
      .replace(/\n?\s*"suggestedActions"\s*:\s*\[[\s\S]*$/i, "")
      .replace(/\n?\s*"summary"\s*:\s*[\s\S]*$/i, "")
      .replace(/\}\s*$/g, "")
      .trimStart();
  }

  function renderStoryText(text: string) {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    const content = paragraphs.length > 0 ? paragraphs : [text.trim()];

    return (
      <div className="space-y-4">
        {content.map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.slice(0, 24)}`}
            className="whitespace-pre-wrap text-[1.14rem] leading-[2.05rem] text-foreground/92"
          >
            {paragraph}
          </p>
        ))}
      </div>
    );
  }

  useEffect(() => {
    const thread = threadRef.current;

    if (!thread) {
      return;
    }

    thread.scrollTo({
      top: thread.scrollHeight,
      behavior: "smooth",
    });
  }, [session?.turns.length, isSubmitting, streamingStoryText]);

  useEffect(() => {
    setAreSuggestedActionsOpen(false);
  }, [session?.turns.length]);

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
    setPendingPlayerAction(nextAction);
    setStreamingStoryText("");
    setPlayerAction("");

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

      if (response.status === 401) {
        const data = (await response.json()) as { error?: string };
        setPendingPlayerAction("");
        setStreamingStoryText("");
        setPlayerAction(nextAction);
        router.push("/auth/sign-in?message=Sign%20in%20to%20continue%20this%20session.");
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "The session could not generate the next turn.");
      }

      if (!response.body) {
        throw new Error("The session stream could not be read.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      function handleEventBlock(block: string) {
        const lines = block
          .split("\n")
          .map((line) => line.trimEnd())
          .filter(Boolean);

        if (lines.length === 0) {
          return;
        }

        const eventLine = lines.find((line) => line.startsWith("event:"));
        const data = lines
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");

        if (!eventLine || !data) {
          return;
        }

        const event = eventLine.slice(6).trim();
        const payload = JSON.parse(data) as {
          delta?: string;
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

        if (event === "story_delta" && typeof payload.delta === "string") {
          setStreamingStoryText((current) => sanitizeStreamingStoryText(current + payload.delta));
          return;
        }

        if (event === "complete" && payload.turn && payload.summary) {
          completed = true;

          if (isDevelopment) {
            setDebugInputMessages(payload.debug?.inputMessages ?? null);
            setDebugThreadState({
              sentPreviousResponseId: payload.debug?.sentPreviousResponseId ?? "",
              receivedResponseId: payload.debug?.responseId ?? "",
              storedPreviousResponseId:
                payload.previousResponseId ?? payload.debug?.responseId ?? "",
            });
            setDebugRawResponse(payload.debug?.rawResponse ?? null);
            setDebugNormalizedTurn(payload.turn);
          }

          setSession((current) =>
            current
              ? {
                  ...current,
                  turnCount: payload.turn!.turnNumber,
                  previousResponseId: payload.previousResponseId ?? current.previousResponseId,
                  summary: payload.summary!,
                  turns: [...current.turns, payload.turn!].slice(-5),
                }
              : current,
          );
          setPendingPlayerAction("");
          setStreamingStoryText("");
          return;
        }

        if (event === "error") {
          throw new Error(payload.error || "The session could not generate the next turn.");
        }
      }

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });

        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          handleEventBlock(block);
        }

        if (done) {
          break;
        }
      }

      if (buffer.trim()) {
        handleEventBlock(buffer);
      }

      if (!completed) {
        throw new Error("The session stream ended before the turn was finalized.");
      }
    } catch (submitError) {
      setPendingPlayerAction("");
      setStreamingStoryText("");
      setPlayerAction(nextAction);
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

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!playerAction.trim() || isSubmitting) {
      return;
    }

    void submitAction(playerAction);
  }

  return (
    <div className="space-y-6">
      <Card className="flex h-[calc(100vh-8.5rem)] min-h-[42rem] flex-col overflow-hidden bg-transparent p-0">
        <section className="relative p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm text-secondary">
                <span className="rounded-md border border-line/70 px-2.5 py-1">
                  Turn {session.turnCount}
                </span>
                <span className="rounded-md border border-line/70 px-2.5 py-1">{character.name}</span>
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDetailsOpen((current) => !current)}
                  className="rounded-lg border border-line bg-transparent px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-secondary transition hover:border-fieldBorder hover:bg-surface hover:text-foreground"
                >
                  {isDetailsOpen ? "Hide" : "Details"}
                </button>

                {isDetailsOpen ? (
                  <div className="absolute right-0 top-10 z-10 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-5 backdrop-blur sm:w-[22rem]">
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

        <section className="flex min-h-0 flex-1 flex-col border-t border-line">
          <div
            ref={threadRef}
            className="min-h-0 flex-1 space-y-10 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6"
          >
            {recentTurns.length > 0 || pendingPlayerAction ? (
              <>
                {recentTurns.map((turn) => (
                  <div key={turn.turnNumber} className="space-y-5">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] space-y-2 text-right">
                        <p className="text-[0.72rem] uppercase tracking-[0.18em] text-muted">
                          You • Turn {turn.turnNumber}
                        </p>
                        <p className="text-[1.12rem] leading-[1.95rem] text-foreground">
                          {turn.playerAction}
                        </p>
                      </div>
                    </div>
                    <div className="max-w-4xl">{renderStoryText(turn.storyText)}</div>
                  </div>
                ))}

                {pendingPlayerAction ? (
                  <div className="space-y-5">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] space-y-2 text-right">
                        <p className="text-[0.72rem] uppercase tracking-[0.18em] text-muted">
                          You • Turn {session.turnCount + 1}
                        </p>
                        <p className="text-[1.12rem] leading-[1.95rem] text-foreground">
                          {pendingPlayerAction}
                        </p>
                      </div>
                    </div>
                    <div className="max-w-4xl space-y-4">
                      {streamingStoryText ? (
                        renderStoryText(streamingStoryText)
                      ) : (
                        <LoadingDots label="Writing the next beat..." />
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="max-w-3xl py-6">
                <p className="text-[1.14rem] leading-[2.05rem] text-secondary">
                  Preparing the opening scene for this session.
                </p>
              </div>
            )}
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="space-y-4">
              <form className="flex items-end gap-3" onSubmit={handleSubmit}>
                <textarea
                  value={playerAction}
                  onChange={(event) => setPlayerAction(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  disabled={isSubmitting}
                  className="min-h-[3.75rem] max-h-48 flex-1 resize-y rounded-lg bg-field px-4 py-3 text-[1.08rem] leading-[1.95rem] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Type what your character does next..."
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !playerAction.trim()}
                  aria-label={isSubmitting ? "Resolving turn" : "Send action"}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-transparent bg-accent text-night transition-colors hover:bg-[#e6c600] focus:outline-none focus:ring-2 focus:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h12" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="m13 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>

              {error ? <div className="border-l border-danger/45 pl-4 text-sm text-foreground">{error}</div> : null}

              {!isSubmitting && suggestedActions.length > 0 ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setAreSuggestedActionsOpen((current) => !current)}
                    className="text-[0.8rem] uppercase tracking-[0.18em] text-muted transition hover:text-foreground"
                  >
                    Suggested Actions {areSuggestedActionsOpen ? "v" : ">"}
                  </button>
                  {areSuggestedActionsOpen ? (
                    <div className="flex flex-col items-start gap-2">
                      {suggestedActions.map((action) => (
                        <button
                          key={action}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => submitAction(action)}
                          className="text-[1rem] leading-7 text-secondary transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
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
