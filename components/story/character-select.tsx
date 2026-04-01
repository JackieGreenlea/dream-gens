"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SessionOpeningSkeletonScreen } from "@/components/ui/loading";
import { Story } from "@/lib/types";
import { cn } from "@/lib/utils";

const CUSTOM_CHARACTER_ID = "__custom_character__";

type StoryCharacterSelectProps = {
  initialStory: Story | null;
  apiBasePath?: "/api/worlds" | "/api/stories" | null;
};

export function StoryCharacterSelect({
  initialStory,
  apiBasePath = "/api/worlds",
}: StoryCharacterSelectProps) {
  const router = useRouter();
  const [liveStory, setLiveStory] = useState<Story | null>(initialStory);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialStory?.playerCharacters[0]?.id ?? null,
  );
  const [customCharacter, setCustomCharacter] = useState({
    name: "",
    description: "",
    strengths: "",
    weaknesses: "",
  });
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const isCustomSelected = selectedId === CUSTOM_CHARACTER_ID;

  useEffect(() => {
    if (!initialStory || !apiBasePath) {
      return;
    }

    let isMounted = true;

    async function loadLatestStory() {
      if (!initialStory) {
        return;
      }

      try {
        const response = await fetch(`${apiBasePath}/${initialStory.id}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          story?: Story;
          world?: Story;
        };
        const fetchedStory = data.story ?? data.world;

        if (!response.ok || !fetchedStory || !isMounted) {
          return;
        }

        setLiveStory(fetchedStory);
        setSelectedId((current) =>
          current === CUSTOM_CHARACTER_ID ||
          fetchedStory.playerCharacters.some((character) => character.id === current)
            ? current
            : fetchedStory.playerCharacters[0]?.id ?? null,
        );
      } catch {
        // Keep the server-provided story if the refresh fails.
      }
    }

    void loadLatestStory();

    return () => {
      isMounted = false;
    };
  }, [apiBasePath, initialStory]);

  const selectedCharacter = useMemo(
    () =>
      selectedId === CUSTOM_CHARACTER_ID
        ? {
            id: CUSTOM_CHARACTER_ID,
            name: customCharacter.name.trim(),
            description: customCharacter.description.trim(),
            strengths: splitCustomCharacterField(customCharacter.strengths),
            weaknesses: splitCustomCharacterField(customCharacter.weaknesses),
          }
        : liveStory?.playerCharacters.find((character) => character.id === selectedId) ?? null,
    [customCharacter.description, customCharacter.name, customCharacter.strengths, customCharacter.weaknesses, selectedId, liveStory],
  );

  if (!liveStory) {
    return (
      <Card>
        <p className="text-foreground">Story not found.</p>
      </Card>
    );
  }

  if (isStarting) {
    return <SessionOpeningSkeletonScreen message="Preparing your opening scene..." />;
  }

  function splitCustomCharacterField(value: string) {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function beginSession() {
    if (!selectedCharacter || !liveStory || isStarting) {
      return;
    }

    setIsStarting(true);
    setError("");

    const isCustomCharacter = selectedId === CUSTOM_CHARACTER_ID;

    if (isCustomCharacter) {
      if (!selectedCharacter.name) {
        setError("Custom character name is required.");
        setIsStarting(false);
        return;
      }

      if (!selectedCharacter.description) {
        setError("Custom character description is required.");
        setIsStarting(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          worldId: liveStory.id,
          ...(isCustomCharacter
            ? {
                customCharacter: {
                  name: selectedCharacter.name,
                  description: selectedCharacter.description,
                  strengths: selectedCharacter.strengths,
                  weaknesses: selectedCharacter.weaknesses,
                },
              }
            : {
                characterId: selectedCharacter.id,
              }),
        }),
      });

      const data = (await response.json()) as {
        sessionId?: string;
        error?: string;
      };

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20start%20a%20session.");
        return;
      }

      if (!response.ok || !data.sessionId) {
        throw new Error(data.error || "The session could not be started.");
      }
      router.push(`/sessions/${data.sessionId}`);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "The session could not be started.",
      );
      setIsStarting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <p className="text-sm uppercase tracking-[0.24em] text-warm">Character Select</p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">{liveStory.title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-secondary">{liveStory.summary}</p>
          <p className="text-sm leading-6 text-secondary">
            Choose one of the story characters below, or create your own for this session.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {liveStory.playerCharacters.map((character) => {
          const isSelected = character.id === selectedId;

          return (
            <button
              key={character.id}
              type="button"
              onClick={() => setSelectedId(character.id)}
              className={cn(
                "rounded-xl border p-5 text-left transition",
                isSelected
                  ? "border-accent/55 bg-surface"
                  : "border-line/70 bg-transparent hover:border-fieldBorder hover:bg-surface",
              )}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-semibold text-foreground">{character.name}</p>
                    <p className="mt-2 text-sm leading-6 text-secondary">{character.description}</p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted">
                    {isSelected ? "Selected" : "Available"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-secondary">Strengths</p>
                    <div className="space-y-1.5 text-sm text-secondary">
                      {character.strengths.map((strength) => (
                        <p key={`${character.id}-${strength}`}>
                          {strength}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-secondary">Weaknesses</p>
                    <div className="space-y-1.5 text-sm text-secondary">
                      {character.weaknesses.map((weakness) => (
                        <p key={`${character.id}-${weakness}`}>
                          {weakness}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setSelectedId(CUSTOM_CHARACTER_ID)}
          className={cn(
            "rounded-xl border p-5 text-left transition",
            isCustomSelected
              ? "border-accent/55 bg-surface"
              : "border-line/70 bg-transparent hover:border-fieldBorder hover:bg-surface",
          )}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-semibold text-foreground">Create Your Own</p>
                <p className="mt-2 text-sm leading-6 text-secondary">
                  Build a custom protagonist for this session only. Your Story stays unchanged.
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.16em] text-muted">
                {isCustomSelected ? "Selected" : "Available"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-secondary">Required</p>
                <div className="space-y-1.5 text-sm text-secondary">
                  <p>Name</p>
                  <p>Description</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-secondary">Optional</p>
                <div className="space-y-1.5 text-sm text-secondary">
                  <p>Strengths</p>
                  <p>Weaknesses</p>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {isCustomSelected ? (
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-warm">Create Your Own</p>
            <p className="text-sm leading-6 text-secondary">
              This custom character is saved to the session only and does not change the Story.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-foreground">Name</span>
              <input
                type="text"
                value={customCharacter.name}
                onChange={(event) =>
                  setCustomCharacter((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-lg border border-fieldBorder bg-field px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                placeholder="Enter your character's name"
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-foreground">Description</span>
              <textarea
                value={customCharacter.description}
                onChange={(event) =>
                  setCustomCharacter((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="min-h-28 w-full rounded-lg border border-fieldBorder bg-field px-4 py-3 text-base leading-7 text-foreground placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                placeholder="Who is this character in the story?"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Strengths</span>
              <textarea
                value={customCharacter.strengths}
                onChange={(event) =>
                  setCustomCharacter((current) => ({ ...current, strengths: event.target.value }))
                }
                className="min-h-24 w-full rounded-lg border border-fieldBorder bg-field px-4 py-3 text-sm leading-6 text-foreground placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                placeholder="Optional. One per line or comma-separated."
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Weaknesses</span>
              <textarea
                value={customCharacter.weaknesses}
                onChange={(event) =>
                  setCustomCharacter((current) => ({ ...current, weaknesses: event.target.value }))
                }
                className="min-h-24 w-full rounded-lg border border-fieldBorder bg-field px-4 py-3 text-sm leading-6 text-foreground placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                placeholder="Optional. One per line or comma-separated."
              />
            </label>
          </div>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-secondary">Selected character</p>
          <p className="mt-1 text-lg font-medium text-foreground">
            {isCustomSelected
              ? selectedCharacter?.name || "Custom Character"
              : selectedCharacter?.name || "Choose a character"}
          </p>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </div>
        <Button type="button" onClick={beginSession} disabled={!selectedCharacter || isStarting}>
          {isStarting ? "Starting game..." : "Start Game"}
        </Button>
      </Card>
    </div>
  );
}
