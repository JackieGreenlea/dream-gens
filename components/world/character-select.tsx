"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { World } from "@/lib/types";
import { cn } from "@/lib/utils";

type CharacterSelectProps = {
  initialWorld: World | null;
  apiBasePath?: "/api/worlds" | "/api/stories";
};

export function CharacterSelect({
  initialWorld,
  apiBasePath = "/api/worlds",
}: CharacterSelectProps) {
  const router = useRouter();
  const [liveWorld, setLiveWorld] = useState<World | null>(initialWorld);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialWorld?.playerCharacters[0]?.id ?? null,
  );
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialWorld) {
      return;
    }

    let isMounted = true;

    async function loadLatestWorld() {
      try {
        const response = await fetch(`${apiBasePath}/${initialWorld.id}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          world?: World;
        };

        if (!response.ok || !data.world || !isMounted) {
          return;
        }

        setLiveWorld(data.world);
        setSelectedId((current) =>
          data.world?.playerCharacters.some((character) => character.id === current)
            ? current
            : data.world?.playerCharacters[0]?.id ?? null,
        );
      } catch {
        // Keep the server-provided world if the refresh fails.
      }
    }

    void loadLatestWorld();

    return () => {
      isMounted = false;
    };
  }, [apiBasePath, initialWorld]);

  const selectedCharacter = useMemo(
    () => liveWorld?.playerCharacters.find((character) => character.id === selectedId) ?? null,
    [selectedId, liveWorld],
  );

  if (!liveWorld) {
    return (
      <Card>
        <p className="text-white">World not found.</p>
      </Card>
    );
  }

  async function beginSession() {
    if (!selectedCharacter || !liveWorld || isStarting) {
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
          worldId: liveWorld.id,
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
        <p className="text-sm uppercase tracking-[0.24em] text-gold">Character Select</p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">{liveWorld.title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-mist">{liveWorld.summary}</p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {liveWorld.playerCharacters.map((character) => {
          const isSelected = character.id === selectedId;

          return (
            <button
              key={character.id}
              type="button"
              onClick={() => setSelectedId(character.id)}
              className={cn(
                "rounded-3xl border p-6 text-left transition",
                isSelected
                  ? "border-gold bg-white/[0.08] shadow-glow"
                  : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.06]",
              )}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-semibold text-white">{character.name}</p>
                    <p className="mt-2 text-sm leading-6 text-mist">{character.description}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-mist">
                    {isSelected ? "Selected" : "Available"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-mist">Strengths</p>
                    <div className="flex flex-wrap gap-2">
                      {character.strengths.map((strength) => (
                        <span
                          key={`${character.id}-${strength}`}
                          className="rounded-full border border-white/10 px-3 py-1 text-xs text-mist"
                        >
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-mist">Weaknesses</p>
                    <div className="flex flex-wrap gap-2">
                      {character.weaknesses.map((weakness) => (
                        <span
                          key={`${character.id}-${weakness}`}
                          className="rounded-full border border-white/10 px-3 py-1 text-xs text-mist"
                        >
                          {weakness}
                        </span>
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
          <p className="text-sm text-mist">Selected character</p>
          <p className="mt-1 text-lg font-medium text-white">
            {selectedCharacter ? selectedCharacter.name : "Choose a character"}
          </p>
          {error ? <p className="mt-2 text-sm text-rose-200">{error}</p> : null}
        </div>
        <Button type="button" onClick={beginSession} disabled={!selectedCharacter || isStarting}>
          {isStarting ? "Starting game..." : "Start Game"}
        </Button>
      </Card>
    </div>
  );
}
