"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteEntryButton } from "@/components/ui/delete-entry-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { PlayerCharacter, Story } from "@/lib/types";
import { formatLineList, parseLineList } from "@/lib/utils";

type StoryEditorProps = {
  initialStory: Story | null;
  storyId: string;
  basePath?: "/worlds" | "/stories";
  apiBasePath?: "/api/worlds" | "/api/stories";
};

export function StoryEditor({
  initialStory,
  storyId,
  basePath = "/worlds",
  apiBasePath = "/api/worlds",
}: StoryEditorProps) {
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(initialStory);
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

  if (!story) {
    return (
      <Card>
        <p className="text-foreground">Story not found.</p>
      </Card>
    );
  }

  function updateField<Key extends keyof Story>(key: Key, value: Story[Key]) {
    setStory((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateCharacter(
    characterId: string,
    updater: (character: PlayerCharacter) => PlayerCharacter,
  ) {
    setStory((current) =>
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

  async function persistStory(nextStep?: "characters" | "exit") {
    if (!story || isSaving) {
      return false;
    }

    setIsSaving(true);
    setError("");
    const currentStoryId = story.id;

    try {
      const response = await fetch(`${apiBasePath}/${story.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(story),
      });

      const data = (await response.json()) as {
        world?: Story;
        error?: string;
      };
      const savedStory = data.world;

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20save%20and%20play%20your%20story.");
        return false;
      }

      if (!response.ok || !savedStory) {
        throw new Error(data.error || "The story could not be saved.");
      }

      setStory(savedStory);
      setSaved(true);

      if (nextStep === "characters") {
        router.push(`${basePath}/${savedStory.id}/characters`);
      } else if (nextStep === "exit") {
        setIsCustomizeOpen(false);
        setIsAdvancedOpen(false);

        if (basePath === "/stories" && savedStory.id !== currentStoryId) {
          router.replace(`${basePath}/${savedStory.id}`);
        }
      } else if (savedStory.id !== currentStoryId || savedStory.id !== storyId) {
        router.replace(
          basePath === "/stories" ? `${basePath}/${savedStory.id}` : `${basePath}/${savedStory.id}/edit`,
        );
      }

      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The story could not be saved.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    await persistStory();
  }

  async function handleSaveAndExit() {
    await persistStory("exit");
  }

  async function handlePlay() {
    await persistStory("characters");
  }

  async function handleSaveAndPlay() {
    await persistStory("characters");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {error ? (
        <Card className="border-danger/35 bg-danger/12 p-5">
          <p className="text-sm font-medium text-foreground">Story save failed</p>
          <p className="mt-2 text-sm leading-6 text-secondary">{error}</p>
        </Card>
      ) : null}

      <Card className="space-y-6 p-6 sm:p-10">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-warm">Review your story</p>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{story.title}</h1>
          <p className="max-w-3xl text-base leading-7 text-secondary">{story.summary}</p>
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
              endpoint={`/api/stories/${story.id}`}
              label="Delete"
              signInMessage="Sign in to delete this story."
              confirmMessage={`Delete "${story.title}"? Existing sessions will remain playable, but this story will be removed from My Stories.`}
            />
          ) : null}
        </div>
      </Card>

      {isCustomizeOpen ? (
        <Card className="space-y-6 p-6 sm:p-8">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-warm">Customize</p>
            <p className="text-sm leading-6 text-secondary">
              Adjust the compiled story before you move into character selection.
            </p>
          </div>

          <div className="grid gap-5">
            <Field label="Title">
              <Input
                value={story.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
            </Field>
            <Field label="Summary">
              <Textarea
                value={story.summary}
                onChange={(event) => updateField("summary", event.target.value)}
              />
            </Field>
            <Field label="Background">
              <Textarea
                value={story.background}
                onChange={(event) => updateField("background", event.target.value)}
                className="min-h-40"
              />
            </Field>
            <Field label="First action">
              <Textarea
                value={story.firstAction}
                onChange={(event) => updateField("firstAction", event.target.value)}
              />
            </Field>
            <Field label="Objective">
              <Textarea
                value={story.objective}
                onChange={(event) => updateField("objective", event.target.value)}
              />
            </Field>
            <Field label="Instructions">
              <Textarea
                value={story.instructions}
                onChange={(event) => updateField("instructions", event.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Player characters</p>
              <p className="text-sm text-secondary">
                Edit each playable character directly, including their strengths and weaknesses.
              </p>
            </div>
            <div className="grid gap-4">
              {story.playerCharacters.map((character) => (
                <div
                  key={character.id}
                  className="rounded-3xl border border-line bg-elevated p-4 sm:p-5"
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

          <div className="space-y-4 border-t border-line pt-6">
            {isAdvancedOpen ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(false)}
                  aria-expanded={isAdvancedOpen}
                  className="text-sm font-medium text-secondary transition hover:text-foreground"
                >
                  Advanced options
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {basePath === "/stories" ? (
                    <Button type="button" variant="ghost" onClick={handleSaveAndExit} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save & Exit"}
                    </Button>
                  ) : null}
                  <Button type="button" onClick={handleSaveAndPlay} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save & Play"}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(true)}
                  aria-expanded={isAdvancedOpen}
                  className="text-sm font-medium text-secondary transition hover:text-foreground"
                >
                  Advanced options
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-secondary">
              <span>{saved ? "Saved to database" : "Database-backed draft"}</span>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="font-medium text-foreground transition hover:text-warm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          {isAdvancedOpen ? (
            <div className="space-y-4 border-t border-line pt-6">
              <div className="rounded-3xl border border-line bg-elevated p-4 sm:p-5">
                <Field label="POV" hint="Controls narration perspective during play.">
                  <Select
                    value={story.pov}
                    onChange={(event) => updateField("pov", event.target.value as Story["pov"])}
                  >
                    <option value="second_person">Second person</option>
                    <option value="first_person">First person</option>
                    <option value="third_person">Third person</option>
                  </Select>
                </Field>
              </div>

              <div className="rounded-3xl border border-line bg-elevated p-4 sm:p-5">
                <Field label="Author Style">
                  <Textarea
                    value={story.authorStyle}
                    onChange={(event) => updateField("authorStyle", event.target.value)}
                  />
                </Field>
              </div>

              <div className="rounded-3xl border border-line bg-elevated p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Victory Conditions</p>
                    <p className="text-sm text-secondary">Control whether the victory condition is active.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField("victoryEnabled", !story.victoryEnabled)}
                    className="rounded-full border border-line px-4 py-2 text-sm text-foreground transition hover:border-fieldBorder hover:bg-surface"
                  >
                    {story.victoryEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <Textarea
                  value={story.victoryCondition}
                  onChange={(event) => updateField("victoryCondition", event.target.value)}
                  disabled={!story.victoryEnabled}
                  className="mt-4"
                />
              </div>

              <div className="rounded-3xl border border-line bg-elevated p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Defeat Conditions</p>
                    <p className="text-sm text-secondary">Control whether the defeat condition is active.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField("defeatEnabled", !story.defeatEnabled)}
                    className="rounded-full border border-line px-4 py-2 text-sm text-foreground transition hover:border-fieldBorder hover:bg-surface"
                  >
                    {story.defeatEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <Textarea
                  value={story.defeatCondition}
                  onChange={(event) => updateField("defeatCondition", event.target.value)}
                  disabled={!story.defeatEnabled}
                  className="mt-4"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                {basePath === "/stories" ? (
                  <Button type="button" variant="ghost" onClick={handleSaveAndExit} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save & Exit"}
                  </Button>
                ) : null}
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
