"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteEntryButton } from "@/components/ui/delete-entry-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PlayerCharacter, World } from "@/lib/types";
import { formatLineList, parseLineList } from "@/lib/utils";

type WorldEditorProps = {
  initialWorld: World | null;
  worldId: string;
  basePath?: "/worlds" | "/stories";
  apiBasePath?: "/api/worlds" | "/api/stories";
};

export function WorldEditor({
  initialWorld,
  worldId,
  basePath = "/worlds",
  apiBasePath = "/api/worlds",
}: WorldEditorProps) {
  const router = useRouter();
  const [world, setWorld] = useState<World | null>(initialWorld);
  const [saved, setSaved] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!saved) {
      return;
    }

    const timeout = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  if (!world) {
    return (
      <Card>
        <p className="text-white">World not found.</p>
      </Card>
    );
  }

  function updateField<Key extends keyof World>(key: Key, value: World[Key]) {
    setWorld((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateCharacter(
    characterId: string,
    updater: (character: PlayerCharacter) => PlayerCharacter,
  ) {
    setWorld((current) =>
      current
        ? {
            ...current,
            playerCharacters: current.playerCharacters.map((character) =>
              character.id === characterId ? updater(character) : character,
            ),
          }
        : current,
    );
  }

  async function persistWorld(nextStep?: "characters") {
    if (!world || isSaving) {
      return false;
    }

    setIsSaving(true);
    setError("");
    const currentWorldId = world.id;

    try {
      const response = await fetch(`${apiBasePath}/${world.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(world),
      });

      const data = (await response.json()) as {
        world?: World;
        error?: string;
      };

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20save%20and%20play%20your%20story.");
        return false;
      }

      if (!response.ok || !data.world) {
        throw new Error(data.error || "The story could not be saved.");
      }

      setWorld(data.world);
      setSaved(true);

      if (nextStep === "characters") {
        router.push(`${basePath}/${data.world.id}/characters`);
      } else if (data.world.id !== currentWorldId || data.world.id !== worldId) {
        router.replace(
          basePath === "/stories"
            ? `${basePath}/${data.world.id}`
            : `${basePath}/${data.world.id}/edit`,
        );
      }

      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The world could not be saved.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    await persistWorld();
  }

  async function handlePlay() {
    await persistWorld("characters");
  }

  async function handleSaveAndPlay() {
    await persistWorld("characters");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {error ? (
        <Card className="border-rose-400/25 bg-rose-400/10 p-5">
          <p className="text-sm font-medium text-white">Story save failed</p>
          <p className="mt-2 text-sm leading-6 text-rose-100/90">{error}</p>
        </Card>
      ) : null}

      <Card className="space-y-6 p-6 sm:p-10">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-gold">Review your story</p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">{world.title}</h1>
          <p className="max-w-3xl text-base leading-7 text-mist">{world.summary}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={handlePlay} disabled={isSaving}>
            {isSaving ? "Saving..." : "Play"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsCustomizeOpen((current) => !current)}
            aria-expanded={isCustomizeOpen}
          >
            Customize
          </Button>
          {basePath === "/stories" ? (
            <DeleteEntryButton
              endpoint={`/api/stories/${world.id}`}
              label="Delete"
              signInMessage="Sign in to delete this story."
              confirmMessage={`Delete "${world.title}"? This will also permanently delete any sessions started from it.`}
            />
          ) : null}
        </div>
      </Card>

      {isCustomizeOpen ? (
        <Card className="space-y-6 p-6 sm:p-8">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-gold">Customize</p>
            <p className="text-sm leading-6 text-mist">
              Adjust the compiled story before you move into character selection.
            </p>
          </div>

          <div className="grid gap-5">
            <Field label="Title">
              <Input
                value={world.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
            </Field>
            <Field label="Summary">
              <Textarea
                value={world.summary}
                onChange={(event) => updateField("summary", event.target.value)}
              />
            </Field>
            <Field label="Background">
              <Textarea
                value={world.background}
                onChange={(event) => updateField("background", event.target.value)}
                className="min-h-40"
              />
            </Field>
            <Field label="First action">
              <Textarea
                value={world.firstAction}
                onChange={(event) => updateField("firstAction", event.target.value)}
              />
            </Field>
            <Field label="Objective">
              <Textarea
                value={world.objective}
                onChange={(event) => updateField("objective", event.target.value)}
              />
            </Field>
            <Field label="POV" hint="Controls narration perspective during play.">
              <Select
                value={world.pov}
                onChange={(event) => updateField("pov", event.target.value as World["pov"])}
              >
                <option value="second_person">Second person</option>
                <option value="first_person">First person</option>
                <option value="third_person">Third person</option>
              </Select>
            </Field>
            <Field label="Instructions">
              <Textarea
                value={world.instructions}
                onChange={(event) => updateField("instructions", event.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">Player characters</p>
              <p className="text-sm text-mist">
                Edit each playable character directly, including their strengths and weaknesses.
              </p>
            </div>
            <div className="grid gap-4">
              {world.playerCharacters.map((character) => (
                <div
                  key={character.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
                >
                  <div className="grid gap-4">
                    <Field label="Character name">
                      <Input
                        value={character.name}
                        onChange={(event) =>
                          updateCharacter(character.id, (current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Character description">
                      <Textarea
                        value={character.description}
                        onChange={(event) =>
                          updateCharacter(character.id, (current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field
                      label="Strengths"
                      hint="One per line. Aim to keep 2 story-relevant strengths."
                    >
                      <Textarea
                        value={formatLineList(character.strengths)}
                        onChange={(event) =>
                          updateCharacter(character.id, (current) => ({
                            ...current,
                            strengths: parseLineList(event.target.value, current.strengths, 2),
                          }))
                        }
                        className="min-h-28"
                      />
                    </Field>
                    <Field
                      label="Weaknesses"
                      hint="One per line. Aim to keep 2 story-relevant weaknesses."
                    >
                      <Textarea
                        value={formatLineList(character.weaknesses)}
                        onChange={(event) =>
                          updateCharacter(character.id, (current) => ({
                            ...current,
                            weaknesses: parseLineList(event.target.value, current.weaknesses, 2),
                          }))
                        }
                        className="min-h-28"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 border-t border-white/10 pt-6">
            {isAdvancedOpen ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(false)}
                  aria-expanded={isAdvancedOpen}
                  className="text-sm font-medium text-mist transition hover:text-white"
                >
                  Advanced options
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" onClick={handleSaveAndPlay} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save & Play"}
                </Button>
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(true)}
                  aria-expanded={isAdvancedOpen}
                  className="text-sm font-medium text-mist transition hover:text-white"
                >
                  Advanced options
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-mist">
              <span>{saved ? "Saved to database" : "Database-backed draft"}</span>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="font-medium text-white transition hover:text-gold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {isAdvancedOpen ? (
            <div className="space-y-4 border-t border-white/10 pt-6">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <Field label="Author Style">
                  <Textarea
                    value={world.authorStyle}
                    onChange={(event) => updateField("authorStyle", event.target.value)}
                  />
                </Field>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">Victory Conditions</p>
                    <p className="text-sm text-mist">Control whether the victory condition is active.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField("victoryEnabled", !world.victoryEnabled)}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-white/25 hover:bg-white/5"
                  >
                    {world.victoryEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <Textarea
                  value={world.victoryCondition}
                  onChange={(event) => updateField("victoryCondition", event.target.value)}
                  disabled={!world.victoryEnabled}
                  className="mt-4"
                />
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">Defeat Conditions</p>
                    <p className="text-sm text-mist">Control whether the defeat condition is active.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField("defeatEnabled", !world.defeatEnabled)}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-white/25 hover:bg-white/5"
                  >
                    {world.defeatEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <Textarea
                  value={world.defeatCondition}
                  onChange={(event) => updateField("defeatCondition", event.target.value)}
                  disabled={!world.defeatEnabled}
                  className="mt-4"
                />
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handleSaveAndPlay} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save & Play"}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
