"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SessionOpeningSkeletonScreen } from "@/components/ui/loading";
import { Story } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

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
    () => liveStory?.playerCharacters.find((character) => character.id === selectedId) ?? null,
    [selectedId, liveStory],
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

  async function beginSession() {
    if (!selectedCharacter || !liveStory || isStarting) {
      return;
    }

    setIsStarting(true);
    setError("");

    try {
      const response = await fetch("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          worldId: liveStory.id,
          characterId: selectedCharacter.id,
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
      </div>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-secondary">Selected character</p>
          <p className="mt-1 text-lg font-medium text-foreground">
            {selectedCharacter ? selectedCharacter.name : "Choose a character"}
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
