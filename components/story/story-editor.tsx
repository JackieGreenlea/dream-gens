"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteEntryButton } from "@/components/ui/delete-entry-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatStoryTagLabel, normalizeStoryTag, normalizeStoryTags } from "@/lib/story-tags";
import {
  isAllowedStoryCoverType,
  MAX_STORY_COVER_BYTES,
} from "@/lib/supabase/storage";
import { PlayerCharacter, Story, StoryCard, StoryCardType } from "@/lib/types";
import { createId, formatLineList, parseLineList } from "@/lib/utils";

const STORY_CARD_TYPE_LABELS: Record<StoryCardType, string> = {
  character: "Characters",
  location: "Locations",
  faction: "Factions",
  story_event: "Story Events",
};

type StoryEditorProps = {
  initialStory: Story | null;
  storyId: string;
  authorName?: string | null;
  isOwner?: boolean;
  basePath?: "/worlds" | "/stories";
  apiBasePath?: "/api/worlds" | "/api/stories";
};

export function StoryEditor({
  initialStory,
  storyId,
  authorName = null,
  isOwner = true,
  basePath = "/worlds",
  apiBasePath = "/api/worlds",
}: StoryEditorProps) {
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(initialStory);
  const [saved, setSaved] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [pendingTag, setPendingTag] = useState("");
  const [characterLineDrafts, setCharacterLineDrafts] = useState<
    Record<string, { strengths?: string; weaknesses?: string }>
  >({});
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(
    initialStory?.coverImageUrl ?? null,
  );
  const [errorTitle, setErrorTitle] = useState("Story save failed");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!saved) {
      return;
    }

    const timeout = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  useEffect(() => {
    setCoverPreviewUrl(initialStory?.coverImageUrl ?? null);
  }, [initialStory?.coverImageUrl]);

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

  function updateCharacterLineDraft(
    characterId: string,
    field: "strengths" | "weaknesses",
    value: string,
  ) {
    setCharacterLineDrafts((current) => ({
      ...current,
      [characterId]: {
        ...current[characterId],
        [field]: value,
      },
    }));
  }

  function clearCharacterLineDraft(characterId: string, field: "strengths" | "weaknesses") {
    setCharacterLineDrafts((current) => {
      const nextCharacterDraft = { ...(current[characterId] ?? {}) };
      delete nextCharacterDraft[field];

      if (Object.keys(nextCharacterDraft).length === 0) {
        const nextDrafts = { ...current };
        delete nextDrafts[characterId];
        return nextDrafts;
      }

      return {
        ...current,
        [characterId]: nextCharacterDraft,
      };
    });
  }

  function updateStoryCard(cardId: string, updater: (card: StoryCard) => StoryCard) {
    setStory((current) =>
      current
        ? {
            ...current,
            storyCards: current.storyCards.map((card) => (card.id === cardId ? updater(card) : card)),
          }
        : current,
    );
  }

  function addStoryCard(type: StoryCardType) {
    setStory((current) =>
      current
        ? {
            ...current,
            storyCards: [
              ...current.storyCards,
              {
                id: createId("card"),
                type,
                title: `New ${STORY_CARD_TYPE_LABELS[type].slice(0, -1)}`,
                description: "Add card details.",
                role: "",
                triggerKeywords: [],
              },
            ],
          }
        : current,
    );
  }

  function removeStoryCard(cardId: string) {
    setStory((current) =>
      current
        ? {
            ...current,
            storyCards: current.storyCards.filter((card) => card.id !== cardId),
          }
        : current,
    );
  }

  function parseKeywordList(value: string) {
    return value
      .split("\n")
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  function handleAddTag() {
    const normalizedTag = normalizeStoryTag(pendingTag);

    if (!normalizedTag) {
      setPendingTag("");
      return;
    }

    updateField("tags", normalizeStoryTags([...(story?.tags ?? []), normalizedTag]));
    setPendingTag("");
  }

  function handleRemoveTag(tagToRemove: string) {
    updateField(
      "tags",
      normalizeStoryTags((story?.tags ?? []).filter((tag) => tag !== tagToRemove)),
    );
  }

  function setEditorError(title: string, message: string) {
    setErrorTitle(title);
    setError(message);
  }

  function renderParagraphs(text: string, className = "text-sm leading-7 text-secondary") {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    const content = paragraphs.length > 0 ? paragraphs : [text.trim()];

    return (
      <div className="space-y-4">
        {content.map((paragraph, index) => (
          <p key={`${index}-${paragraph.slice(0, 24)}`} className={className}>
            {paragraph}
          </p>
        ))}
      </div>
    );
  }

  const groupedStoryCards = (Object.keys(STORY_CARD_TYPE_LABELS) as StoryCardType[]).map((type) => ({
    type,
    title: STORY_CARD_TYPE_LABELS[type],
    cards: story.storyCards.filter((card) => card.type === type),
  }));

  async function persistStory(nextStep?: "characters" | "exit") {
    if (!story || isSaving) {
      return false;
    }

    setIsSaving(true);
    setErrorTitle("Story save failed");
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
        story?: Story;
        world?: Story;
        error?: string;
      };
      const savedStory = data.story ?? data.world;

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
      setEditorError(
        "Story save failed",
        saveError instanceof Error ? saveError.message : "The story could not be saved.",
      );
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
    if (!isOwner) {
      router.push(`/stories/${storyId}/characters`);
      return;
    }

    await persistStory("characters");
  }

  async function handleSaveAndPlay() {
    await persistStory("characters");
  }

  async function handlePublish() {
    if (!story || isPublishing) {
      return;
    }

    setIsPublishing(true);
    setErrorTitle("Story publish failed");
    setError("");

    try {
      const response = await fetch(`/api/stories/${story.id}/publish`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        story?: Story;
        error?: string;
      };

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20publish%20your%20story.");
        return;
      }

      if (!response.ok || !data.story) {
        throw new Error(data.error || "The story could not be published.");
      }

      const publishedStory = data.story;
      setStory((current) => (current ? { ...current, ...publishedStory } : publishedStory));
    } catch (publishError) {
      setEditorError(
        "Story publish failed",
        publishError instanceof Error ? publishError.message : "The story could not be published.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleUnpublish() {
    if (!story || isPublishing) {
      return;
    }

    setIsPublishing(true);
    setErrorTitle("Story unpublish failed");
    setError("");

    try {
      const response = await fetch(`/api/stories/${story.id}/publish`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        story?: Story;
        error?: string;
      };

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20manage%20your%20story.");
        return;
      }

      if (!response.ok || !data.story) {
        throw new Error(data.error || "The story could not be unpublished.");
      }

      const unpublishedStory = data.story;
      setStory((current) => (current ? { ...current, ...unpublishedStory } : unpublishedStory));
    } catch (unpublishError) {
      setEditorError(
        "Story unpublish failed",
        unpublishError instanceof Error
          ? unpublishError.message
          : "The story could not be unpublished.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !story || isUploadingCover) {
      return;
    }

    if (!isAllowedStoryCoverType(file.type)) {
      setEditorError("Story cover upload failed", "Upload a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_STORY_COVER_BYTES) {
      setEditorError("Story cover upload failed", "Image must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setCoverPreviewUrl(previewUrl);
    setIsUploadingCover(true);
    setErrorTitle("Story cover upload failed");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/stories/${story.id}/cover`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        story?: Story;
        error?: string;
      };

      if (response.status === 401) {
        setCoverPreviewUrl(story.coverImageUrl ?? null);
        router.push("/auth/sign-in?message=Sign%20in%20to%20upload%20a%20story%20cover.");
        return;
      }

      if (!response.ok || !data.story) {
        throw new Error(data.error || "The story cover could not be uploaded.");
      }

      const uploadedStory = data.story;
      setStory((current) => (current ? { ...current, ...uploadedStory } : uploadedStory));
      setCoverPreviewUrl(uploadedStory.coverImageUrl ?? null);
    } catch (uploadError) {
      setEditorError(
        "Story cover upload failed",
        uploadError instanceof Error
          ? uploadError.message
          : "The story cover could not be uploaded.",
      );
      setCoverPreviewUrl(story.coverImageUrl ?? null);
    } finally {
      URL.revokeObjectURL(previewUrl);
      event.target.value = "";
      setIsUploadingCover(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {error ? (
        <Card className="border-danger/25 bg-transparent p-5">
          <p className="text-sm font-medium text-foreground">{errorTitle}</p>
          <p className="mt-2 text-sm leading-6 text-secondary">{error}</p>
        </Card>
      ) : null}

      <section className="space-y-6 border-b border-line pb-8">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-warm">Story</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
            {story.title}
          </h1>
          <div className="space-y-1 text-sm text-secondary">
            {authorName ? <p>by @{authorName}</p> : null}
            {story.tags.length > 0 ? <p>{story.tags.map(formatStoryTagLabel).join(" • ")}</p> : null}
            {basePath === "/stories" && isOwner ? (
              <p>{story.visibility === "public" ? "Published story" : "Private story"}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" onClick={handlePlay} disabled={isSaving}>
            {isSaving ? "Saving..." : "Play"}
          </Button>
          {isOwner ? (
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {basePath === "/stories" ? (
              story.visibility === "public" ? (
                <button
                  type="button"
                  onClick={handleUnpublish}
                  disabled={isPublishing}
                  className="text-secondary transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPublishing ? "Unpublishing..." : "Unpublish"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="text-secondary transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPublishing ? "Publishing..." : "Publish"}
                </button>
              )
              ) : null}
              <button
                type="button"
                onClick={() => setIsCustomizeOpen((current) => !current)}
                aria-expanded={isCustomizeOpen}
                className="text-secondary transition hover:text-foreground"
              >
                {isCustomizeOpen ? "Close customization" : "Customize"}
              </button>
              {basePath === "/stories" ? (
                <DeleteEntryButton
                  endpoint={`/api/stories/${story.id}`}
                  label="Delete"
                  signInMessage="Sign in to delete this story."
                  confirmMessage={`Delete "${story.title}"? Existing sessions will remain playable, but this story will be removed from My Stories.`}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {(coverPreviewUrl || story.summary.trim()) ? (
        <section className="grid gap-8 border-b border-line pb-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
          {coverPreviewUrl ? (
            <img
              src={coverPreviewUrl}
              alt={`${story.title} cover`}
              className="w-full rounded-xl object-cover"
            />
          ) : null}
          <div className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">Summary</h2>
            {renderParagraphs(story.summary)}
          </div>
        </section>
      ) : null}

      <section className="space-y-3 border-b border-line pb-8">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">Background</h2>
        {renderParagraphs(story.background)}
      </section>

      {story.objective.trim() && story.victoryEnabled ? (
        <section className="space-y-3 border-b border-line pb-8">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">Objective</h2>
          {renderParagraphs(story.objective)}
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">
          Playable Characters
        </h2>
        <div className="divide-y divide-line">
          {story.playerCharacters.map((character) => (
            <div key={character.id} className="space-y-2 py-4 first:pt-0">
              <p className="text-lg font-medium text-foreground">{character.name}</p>
              <p className="max-w-3xl text-sm leading-7 text-secondary">{character.description}</p>
            </div>
          ))}
        </div>
      </section>

      {isOwner && isCustomizeOpen ? (
        <Card className="space-y-6 p-6 sm:p-8">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-warm">Customize</p>
            <p className="text-sm leading-6 text-secondary">
              Adjust the compiled story before you move into character selection.
            </p>
          </div>

          <div className="grid gap-5">
            <Field label="Cover image" hint="Upload a JPG, PNG, or WEBP image up to 5MB.">
              <div className="space-y-4">
                {coverPreviewUrl ? (
                  <div className="overflow-hidden rounded-lg border border-line/70 bg-surface/40">
                    <img
                      src={coverPreviewUrl}
                      alt={`${story.title} cover preview`}
                      className="h-56 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-line/70 bg-transparent text-sm text-secondary">
                    No cover image uploaded yet.
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCoverUpload}
                  disabled={isUploadingCover}
                  className="block w-full text-sm text-secondary file:mr-4 file:rounded-lg file:border file:border-line file:bg-transparent file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:border-fieldBorder"
                />
                {isUploadingCover ? (
                  <p className="text-sm text-secondary">Uploading cover image...</p>
                ) : null}
              </div>
            </Field>
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
            <Field
              label="Runtime Background"
              hint='Compact runtime-safe version of the background. Prefer neutral phrasing or placeholders like {{userCharacterName}} instead of "you."'
            >
              <Textarea
                value={story.runtimeBackground}
                onChange={(event) => updateField("runtimeBackground", event.target.value)}
                className="min-h-28"
              />
            </Field>
            <Field
              label="Tags"
              hint="Add simple genre/discovery tags. These drive Explore tabs and home rows."
            >
              <div className="space-y-3">
                {story.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-3 text-sm text-secondary">
                    {story.tags.map((tag) => (
                      <div key={tag} className="flex items-center gap-2">
                        <span>{formatStoryTagLabel(tag)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-muted transition hover:text-foreground"
                          aria-label={`Remove ${formatStoryTagLabel(tag)} tag`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-secondary">No tags yet.</p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    value={pendingTag}
                    onChange={(event) => setPendingTag(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add a tag"
                    className="max-w-sm"
                  />
                  <Button type="button" variant="ghost" onClick={handleAddTag}>
                    Add tag
                  </Button>
                </div>
              </div>
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
                  className="rounded-xl border border-line/70 bg-transparent p-4 sm:p-5"
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
                        value={
                          characterLineDrafts[character.id]?.strengths ??
                          formatLineList(character.strengths)
                        }
                        onChange={(event) =>
                          updateCharacterLineDraft(character.id, "strengths", event.target.value)
                        }
                        onBlur={(event) => {
                          updateCharacter(character.id, (current) => ({
                            ...current,
                            strengths: parseLineList(event.target.value, current.strengths, 2),
                          }));
                          clearCharacterLineDraft(character.id, "strengths");
                        }}
                        className="min-h-28"
                      />
                    </Field>
                    <Field
                      label="Weaknesses"
                      hint="One per line. Aim to keep 2 story-relevant weaknesses."
                    >
                      <Textarea
                        value={
                          characterLineDrafts[character.id]?.weaknesses ??
                          formatLineList(character.weaknesses)
                        }
                        onChange={(event) =>
                          updateCharacterLineDraft(character.id, "weaknesses", event.target.value)
                        }
                        onBlur={(event) => {
                          updateCharacter(character.id, (current) => ({
                            ...current,
                            weaknesses: parseLineList(event.target.value, current.weaknesses, 2),
                          }));
                          clearCharacterLineDraft(character.id, "weaknesses");
                        }}
                        className="min-h-28"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Story Cards</p>
              <p className="text-sm text-secondary">
                Generated continuity cards for the people, places, factions, and major events in this story.
              </p>
            </div>
            <div className="grid gap-4">
              {groupedStoryCards.map((group) => (
                <div
                  key={group.type}
                  className="rounded-xl border border-line/70 bg-transparent p-4 sm:p-5"
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{group.title}</p>
                        <p className="text-sm text-secondary">
                          {group.cards.length} card{group.cards.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" onClick={() => addStoryCard(group.type)}>
                        Add {group.title.slice(0, -1)}
                      </Button>
                    </div>
                    {group.cards.length > 0 ? (
                      <div className="grid gap-3">
                        {group.cards.map((card) => (
                          <div
                            key={card.id}
                            className="rounded-xl border border-line/60 bg-night/30 p-4"
                          >
                            <div className="space-y-4">
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => removeStoryCard(card.id)}
                                >
                                  Remove card
                                </Button>
                              </div>
                              <Field label="Title">
                                <Input
                                  value={card.title}
                                  onChange={(event) =>
                                    updateStoryCard(card.id, (current) => ({
                                      ...current,
                                      title: event.target.value,
                                    }))
                                  }
                                />
                              </Field>
                              <Field label="Description">
                                <Textarea
                                  value={card.description}
                                  onChange={(event) =>
                                    updateStoryCard(card.id, (current) => ({
                                      ...current,
                                      description: event.target.value,
                                    }))
                                  }
                                />
                              </Field>
                              {card.type === "character" ? (
                                <Field
                                  label="Role"
                                  hint="Optional short role label, like MMC, love interest, rival, or best friend."
                                >
                                  <Input
                                    value={card.role ?? ""}
                                    onChange={(event) =>
                                      updateStoryCard(card.id, (current) => ({
                                        ...current,
                                        role: event.target.value,
                                      }))
                                    }
                                  />
                                </Field>
                              ) : null}
                              <Field
                                label="Trigger Keywords"
                                hint="One per line. These are read-only runtime candidates for later phases."
                              >
                                <Textarea
                                  value={formatLineList(card.triggerKeywords)}
                                  onChange={(event) =>
                                    updateStoryCard(card.id, (current) => ({
                                      ...current,
                                      triggerKeywords: parseKeywordList(event.target.value),
                                    }))
                                  }
                                  className="min-h-24"
                                />
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-line/70 bg-transparent p-4">
                        <p className="text-sm text-secondary">No {group.title.toLowerCase()} yet.</p>
                      </div>
                    )}
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
              <div className="rounded-xl border border-line/70 bg-transparent p-4 sm:p-5">
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

              <div className="rounded-xl border border-line/70 bg-transparent p-4 sm:p-5">
                <Field label="Tone Style">
                  <Textarea
                    value={story.toneStyle}
                    onChange={(event) =>
                      setStory((current) =>
                        current
                          ? {
                              ...current,
                              toneStyle: event.target.value,
                              authorStyle: event.target.value,
                            }
                          : current,
                      )
                    }
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-line/70 bg-transparent p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Victory Conditions</p>
                    <p className="text-sm text-secondary">Control whether the victory condition is active.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField("victoryEnabled", !story.victoryEnabled)}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm text-foreground transition hover:border-fieldBorder hover:bg-surface"
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

              <div className="rounded-xl border border-line/70 bg-transparent p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Defeat Conditions</p>
                    <p className="text-sm text-secondary">Control whether the defeat condition is active.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField("defeatEnabled", !story.defeatEnabled)}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm text-foreground transition hover:border-fieldBorder hover:bg-surface"
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
