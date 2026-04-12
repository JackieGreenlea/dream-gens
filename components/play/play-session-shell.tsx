"use client";

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { LoadingDots } from "@/components/ui/loading";
import { PlayerCharacter, Session, SessionTurn, StoryCardType, World } from "@/lib/types";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isNavVisible = searchParams.get("nav") === "1";
  const [session, setSession] = useState<Session | null>(initialSession);
  const [world] = useState<World | null>(initialWorld);
  const [character] = useState<PlayerCharacter | null>(initialCharacter);
  const [playerAction, setPlayerAction] = useState("");
  const [pendingPlayerAction, setPendingPlayerAction] = useState("");
  const [streamingStoryText, setStreamingStoryText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSuggestedActions, setIsGeneratingSuggestedActions] = useState(false);
  const [isUpdatingStoryCards, setIsUpdatingStoryCards] = useState(false);
  const [error, setError] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [areSuggestedActionsOpen, setAreSuggestedActionsOpen] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const firstChunkReceivedLoggedRef = useRef(false);
  const firstStoryDeltaReceivedLoggedRef = useRef(false);
  const firstStoryDeltaRenderedLoggedRef = useRef(false);

  const suggestedActions = session?.turns.at(-1)?.suggestedActions ?? [];
  const recentTurns = session?.turns ?? [];
  const storyCardGroups: Array<{ type: StoryCardType; title: string }> = [
    { type: "character", title: "Characters" },
    { type: "location", title: "Settings" },
    { type: "faction", title: "Factions" },
    { type: "story_event", title: "Events" },
  ];
  function sanitizeStreamingStoryText(text: string) {
    return text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/g, "")
      .replace(/^\s*\{\s*"storyText"\s*:\s*/i, "")
      .replace(/^\s*"storyText"\s*:\s*/i, "")
      .replace(/\n?\s*"suggestedActions"\s*:\s*\[[\s\S]*$/i, "")
      .replace(/\}\s*$/g, "")
      .trimStart();
  }

  function renderStoryText(text: string) {
    function renderInlineEmphasis(value: string): ReactNode[] {
      const parts = value.split(/(\*[^*\n]+\*|_[^_\n]+_)/g);

      return parts.filter(Boolean).map((part, index) => {
        const isStarItalic = part.startsWith("*") && part.endsWith("*") && part.length > 2;
        const isUnderscoreItalic = part.startsWith("_") && part.endsWith("_") && part.length > 2;

        if (isStarItalic || isUnderscoreItalic) {
          return (
            <em key={`${index}-${part.slice(1, 12)}`} className="italic">
              {part.slice(1, -1)}
            </em>
          );
        }

        return <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>;
      });
    }

    const paragraphs = text
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    const content = paragraphs.length > 0 ? paragraphs : [text.trim()];

    return (
      <div className="space-y-4">
        {content.map((paragraph, index) => {
          const sectionMatch = paragraph.match(/^(BACKGROUND|OPENING):\n([\s\S]+)$/);

          if (sectionMatch) {
            const [, label, body] = sectionMatch;

            return (
              <div
                key={`${index}-${label}-${body.slice(0, 24)}`}
                className="space-y-2 text-[0.94rem] leading-[1.58rem] text-foreground sm:text-[1.48rem] sm:leading-[2.12rem] lg:text-[1.18rem] lg:leading-[1.8rem]"
              >
                <p className="text-[0.9rem] font-bold tracking-[0.01em] text-foreground sm:text-[1.28rem] lg:text-[1.02rem]">{label}:</p>
                <p className="whitespace-pre-wrap font-semibold text-foreground">
                  {renderInlineEmphasis(body.trim())}
                </p>
              </div>
            );
          }

          return (
            <p
              key={`${index}-${paragraph.slice(0, 24)}`}
              className="whitespace-pre-wrap text-[0.9rem] font-semibold leading-[1.58rem] text-foreground sm:text-[1.2rem] sm:leading-[2.12rem] lg:text-[1rem] lg:leading-[1.75rem]"
            >
              {renderInlineEmphasis(paragraph)}
            </p>
          );
        })}
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

  useEffect(() => {
    if (!streamingStoryText || firstStoryDeltaRenderedLoggedRef.current) {
      return;
    }

    firstStoryDeltaRenderedLoggedRef.current = true;
    console.info("[client] first story_delta rendered", {
      sessionId,
      textLength: streamingStoryText.length,
    });
  }, [sessionId, streamingStoryText]);

  if (!session || !world || !character) {
    return (
      <Card className="h-full overflow-hidden">
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
    firstChunkReceivedLoggedRef.current = false;
    firstStoryDeltaReceivedLoggedRef.current = false;
    firstStoryDeltaRenderedLoggedRef.current = false;
    setPlayerAction("");
    console.info("[client] submit clicked", {
      sessionId,
    });

    try {
      const response = await fetch("/api/session/turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          playerAction: nextAction,
        }),
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
          previousResponseId?: string;
          error?: string;
        };

        if (event === "story_delta" && typeof payload.delta === "string") {
          if (!firstStoryDeltaReceivedLoggedRef.current) {
            firstStoryDeltaReceivedLoggedRef.current = true;
            console.info("[client] first story_delta received", {
              sessionId,
              textLength: payload.delta.length,
            });
          }

          setStreamingStoryText((current) => sanitizeStreamingStoryText(current + payload.delta));
          return;
        }

        if (event === "complete" && payload.turn) {
          completed = true;
          setSession((current) =>
            current
              ? {
                  ...current,
                  turnCount: payload.turn!.turnNumber,
                  previousResponseId: payload.previousResponseId ?? current.previousResponseId,
                  turns: [...current.turns, payload.turn!].slice(-10),
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

        if (value && value.length > 0 && !firstChunkReceivedLoggedRef.current) {
          firstChunkReceivedLoggedRef.current = true;
          console.info("[client] first chunk received", {
            sessionId,
            byteLength: value.length,
          });
        }

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

  async function generateSuggestedActions() {
    if (!session || isGeneratingSuggestedActions || isSubmitting) {
      return;
    }

    setIsGeneratingSuggestedActions(true);
    setError("");

    try {
      const response = await fetch("/api/session/suggested-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      const payload = (await response.json()) as {
        turnNumber?: number;
        suggestedActions?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to generate suggested actions.");
      }

      if (typeof payload.turnNumber !== "number" || !Array.isArray(payload.suggestedActions)) {
        throw new Error("Suggested actions response was malformed.");
      }

      setSession((current) =>
        current
          ? {
              ...current,
              turns: current.turns.map((turn) =>
                turn.turnNumber === payload.turnNumber
                  ? { ...turn, suggestedActions: payload.suggestedActions ?? [] }
                  : turn,
              ),
            }
          : current,
      );
      setAreSuggestedActionsOpen(true);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Unable to generate suggested actions.",
      );
    } finally {
      setIsGeneratingSuggestedActions(false);
    }
  }

  async function toggleStoryCard(cardId: string) {
    if (!session || isUpdatingStoryCards) {
      return;
    }

    setIsUpdatingStoryCards(true);
    setError("");

    const currentInactiveIds = session.inactiveStoryCardIds ?? [];
    const nextInactiveIds = currentInactiveIds.includes(cardId)
      ? currentInactiveIds.filter((id) => id !== cardId)
      : [...currentInactiveIds, cardId];

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inactiveStoryCardIds: nextInactiveIds,
        }),
      });

      const payload = (await response.json()) as {
        session?: Session;
        error?: string;
      };

      if (!response.ok || !payload.session) {
        throw new Error(payload.error || "Unable to update story cards for this session.");
      }

      setSession(payload.session);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Unable to update story cards for this session.",
      );
    } finally {
      setIsUpdatingStoryCards(false);
    }
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

  function toggleSessionNav() {
    const params = new URLSearchParams(searchParams.toString());

    if (isNavVisible) {
      params.delete("nav");
    } else {
      params.set("nav", "1");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="h-full overflow-hidden overscroll-none">
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none">
        <section className={`relative px-1.5 pb-1.5 pt-1 sm:px-6 sm:pb-3 sm:pt-3 ${isNavVisible ? "lg:pt-16" : ""}`}>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-secondary sm:text-sm lg:text-[0.82rem]">
                <button
                  type="button"
                  onClick={toggleSessionNav}
                  className="rounded-lg border border-line bg-transparent px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.15em] text-secondary transition hover:border-fieldBorder hover:bg-surface hover:text-foreground sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.18em] lg:text-[0.68rem]"
                >
                  {isNavVisible ? "Hide Nav" : "Show Nav"}
                </button>
                <span className="rounded-md border border-line/70 px-2 py-0.5 sm:px-2.5 sm:py-1">
                  Turn {session.turnCount}
                </span>
                <span className="rounded-md border border-line/70 px-2 py-0.5 sm:px-2.5 sm:py-1">{character.name}</span>
              </div>
              <div className="relative shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsContextOpen((current) => !current)}
                    className="rounded-lg border border-line bg-transparent px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.15em] text-secondary transition hover:border-fieldBorder hover:bg-surface hover:text-foreground sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.18em] lg:text-[0.68rem]"
                  >
                    {isContextOpen ? "Hide Context" : "Context"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDetailsOpen((current) => !current)}
                    className="rounded-lg border border-line bg-transparent px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.15em] text-secondary transition hover:border-fieldBorder hover:bg-surface hover:text-foreground sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.18em] lg:text-[0.68rem]"
                  >
                    {isDetailsOpen ? "Hide" : "Details"}
                  </button>
                </div>

                {isContextOpen ? (
                  <div className="absolute right-0 top-10 z-20 w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-5 backdrop-blur sm:w-[30rem]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground lg:text-[0.88rem]">Story Context</p>
                      <button
                        type="button"
                        onClick={() => setIsContextOpen(false)}
                        className="text-xs uppercase tracking-[0.18em] text-secondary transition hover:text-foreground lg:text-[0.68rem]"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-4 max-h-[70vh] space-y-5 overflow-y-auto pr-1">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-secondary lg:text-[0.68rem]">Rolling Summary</p>
                        <p className="text-sm leading-6 text-secondary lg:text-[0.88rem] lg:leading-5">
                          {session.summary.trim() || "The story is just beginning."}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-secondary lg:text-[0.68rem]">Background</p>
                        <p className="text-sm leading-6 text-secondary lg:text-[0.88rem] lg:leading-5">{world.background}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-secondary lg:text-[0.68rem]">Runtime Background</p>
                        <p className="text-sm leading-6 text-secondary lg:text-[0.88rem] lg:leading-5">{world.runtimeBackground || world.background}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-secondary lg:text-[0.68rem]">Tone / Theme</p>
                        <p className="text-sm leading-6 text-secondary lg:text-[0.88rem] lg:leading-5">{world.toneStyle || world.authorStyle || "No tone set."}</p>
                      </div>
                      {world.instructions.trim() ? (
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-secondary lg:text-[0.68rem]">Additional Context</p>
                          <p className="text-sm leading-6 text-secondary lg:text-[0.88rem] lg:leading-5">{world.instructions}</p>
                        </div>
                      ) : null}
                      <div className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-secondary lg:text-[0.68rem]">Story Cards</p>
                        {storyCardGroups.map((group) => {
                          const cards = world.storyCards.filter((card) => card.type === group.type);

                          if (cards.length === 0) {
                            return null;
                          }

                          return (
                            <div key={group.type} className="space-y-2">
                              <p className="text-sm font-medium text-foreground lg:text-[0.88rem]">{group.title}</p>
                              <div className="space-y-2">
                                {cards.map((card) => (
                                  <div key={card.id} className="rounded-lg border border-line/60 bg-night/35 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <p className="text-sm font-medium text-foreground lg:text-[0.88rem]">
                                        {card.title}
                                        {card.role?.trim() ? ` (${card.role.trim()})` : ""}
                                      </p>
                                      <button
                                        type="button"
                                        disabled={isUpdatingStoryCards}
                                        onClick={() => void toggleStoryCard(card.id)}
                                        className="shrink-0 rounded-md border border-line bg-transparent px-2 py-1 text-[0.68rem] uppercase tracking-[0.14em] text-secondary transition hover:border-fieldBorder hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {session.inactiveStoryCardIds.includes(card.id) ? "Activate" : "Deactivate"}
                                      </button>
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-secondary lg:text-[0.88rem] lg:leading-5">
                                      {card.description}
                                    </p>
                                    <p className="mt-2 text-xs leading-5 text-muted lg:text-[0.72rem]">
                                      {session.inactiveStoryCardIds.includes(card.id)
                                        ? "Inactive for this session."
                                        : "Active for this session."}
                                    </p>
                                    {card.triggerKeywords.length > 0 ? (
                                      <p className="mt-2 text-xs leading-5 text-muted lg:text-[0.72rem]">
                                        Triggers: {card.triggerKeywords.join(", ")}
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {isDetailsOpen ? (
                  <div className="absolute right-0 top-10 z-10 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-5 backdrop-blur sm:w-[22rem]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground lg:text-[0.88rem]">Details</p>
                      <button
                        type="button"
                        onClick={() => setIsDetailsOpen(false)}
                        className="text-xs uppercase tracking-[0.18em] text-secondary transition hover:text-foreground lg:text-[0.68rem]"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-4 space-y-5">
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-secondary lg:text-[0.68rem]">Character</p>
                        <p className="text-lg font-medium text-foreground lg:text-[1rem]">{character.name}</p>
                        <p className="text-sm leading-6 text-secondary lg:text-[0.88rem] lg:leading-5">{character.description}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-secondary lg:text-[0.68rem]">Objective</p>
                        <p className="text-sm leading-6 text-secondary lg:text-[0.88rem] lg:leading-5">{session.objective}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-secondary lg:text-[0.68rem]">Story Summary</p>
                        <p className="text-sm leading-6 text-secondary lg:text-[0.88rem] lg:leading-5">{world.summary}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-1">
              <h1 className="text-[1.38rem] font-semibold leading-tight text-foreground sm:text-[2.4rem] lg:text-[2rem]">
                {world.title}
              </h1>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-line">
          <div
            ref={threadRef}
            className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain px-1.5 py-3 sm:px-6 sm:py-6"
          >
            {recentTurns.length > 0 || pendingPlayerAction ? (
              <>
                {recentTurns.map((turn) => (
                  <div key={turn.turnNumber} className="space-y-5">
                    {turn.playerAction ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] text-right">
                          <p className="text-[0.92rem] font-semibold leading-[1.5rem] text-accent sm:text-[1.12rem] sm:leading-[1.95rem] lg:text-[0.98rem] lg:leading-[1.6rem]">
                            {turn.playerAction}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <div className="max-w-none sm:max-w-4xl">{renderStoryText(turn.storyText)}</div>
                  </div>
                ))}

                {pendingPlayerAction ? (
                  <div className="space-y-5">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] text-right">
                        <p className="text-[0.92rem] font-semibold leading-[1.5rem] text-accent sm:text-[1.12rem] sm:leading-[1.95rem] lg:text-[0.98rem] lg:leading-[1.6rem]">
                          {pendingPlayerAction}
                        </p>
                      </div>
                    </div>
                    <div className="max-w-none space-y-4 sm:max-w-4xl">
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
              <div className="max-w-none py-4 sm:max-w-3xl sm:py-6">
                <p className="text-[0.9rem] leading-[1.58rem] text-secondary sm:text-[1.2rem] sm:leading-[2.12rem] lg:text-[1rem] lg:leading-[1.7rem]">
                  Preparing the opening scene for this session.
                </p>
              </div>
            )}
          </div>

          <div className="px-1.5 py-2.5 sm:px-6 sm:py-5">
            <div className="space-y-2">
              <form className="relative" onSubmit={handleSubmit}>
                <textarea
                  value={playerAction}
                  onChange={(event) => setPlayerAction(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  disabled={isSubmitting}
                  className="min-h-[3.75rem] max-h-48 w-full resize-y rounded-lg bg-field px-4 py-3 pr-16 text-[0.84rem] leading-[1.2rem] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-focus/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-[1.02rem] sm:leading-[1.7rem] lg:text-[0.92rem] lg:leading-[1.45rem]"
                  placeholder="Type what your character does next..."
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !playerAction.trim()}
                  aria-label={isSubmitting ? "Resolving turn" : "Send action"}
                  className="absolute bottom-2.5 right-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent bg-accent text-night transition-colors hover:bg-[#e6c600] focus:outline-none focus:ring-2 focus:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:w-9"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h12" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="m13 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>

              {error ? <div className="border-l border-danger/45 pl-4 text-sm text-foreground lg:text-[0.88rem]">{error}</div> : null}

              {!isSubmitting && suggestedActions.length > 0 ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setAreSuggestedActionsOpen((current) => !current)}
                    className="text-[0.8rem] uppercase tracking-[0.18em] text-muted transition hover:text-foreground lg:text-[0.68rem]"
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
                          className="text-[1rem] leading-7 text-secondary transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 lg:text-[0.9rem] lg:leading-6"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!isSubmitting && suggestedActions.length === 0 && recentTurns.length > 0 ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isGeneratingSuggestedActions}
                    onClick={() => void generateSuggestedActions()}
                    className="text-[0.8rem] uppercase tracking-[0.18em] text-muted transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 lg:text-[0.68rem]"
                  >
                    {isGeneratingSuggestedActions ? "Generating Suggested Actions..." : "Generate Suggested Actions"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </Card>
    </div>
  );
}
