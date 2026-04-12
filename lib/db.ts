import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CustomSessionCharacter } from "@/lib/schemas";
import { getSampleWorldById } from "@/lib/sampleData";
import { createWorldFromStory } from "@/lib/story";
import { normalizeStoryTags } from "@/lib/story-tags";
import { sanitizeTextArrayForDatabase, sanitizeTextForDatabase } from "@/lib/text-sanitize";
import {
  PlayerCharacter,
  Session,
  SessionTurn,
  Story,
  StoryCard,
  StoryPov,
  StoryCardType,
  StoryVisibility,
  World,
  WorldCanon,
  WorldCastMember,
} from "@/lib/types";
import { createId, slugify } from "@/lib/utils";

const RECENT_TURN_LIMIT = 10;

const worldInclude = {
  playerCharacters: {
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.WorldInclude;

// Real path: Story setup/template records live in Prisma Story.
const storySelect = {
  id: true,
  worldId: true,
  visibility: true,
  slug: true,
  publishedAt: true,
  coverImageUrl: true,
  tags: true,
  title: true,
  summary: true,
  background: true,
  runtimeBackground: true,
  firstAction: true,
  objective: true,
  pov: true,
  instructions: true,
  toneStyle: true,
  authorStyle: true,
  storyCards: true,
  victoryCondition: true,
  victoryEnabled: true,
  defeatCondition: true,
  defeatEnabled: true,
  playerCharacters: {
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      strengths: true,
      weaknesses: true,
    },
  },
} satisfies Prisma.StorySelect;

const recentTurnsInclude = {
  turns: {
    orderBy: {
      turnNumber: "desc",
    },
    take: RECENT_TURN_LIMIT,
  },
} satisfies Prisma.SessionInclude;

const sessionBundleInclude = {
  ...recentTurnsInclude,
  world: {
    include: worldInclude,
  },
  story: {
    select: storySelect,
  },
  character: true,
  storyCharacter: true,
} satisfies Prisma.SessionInclude;

type DbWorld = Prisma.WorldGetPayload<{
  include: typeof worldInclude;
}>;

type DbStoryRecord = Prisma.StoryGetPayload<{
  select: typeof storySelect;
}>;

type DbWorldCanon = Prisma.WorldGetPayload<Record<string, never>>;

type DbSession = Prisma.SessionGetPayload<{
  include: typeof recentTurnsInclude;
}>;

type DbSessionBundle = Prisma.SessionGetPayload<{
  include: typeof sessionBundleInclude;
}>;

// Session start prefers Story-backed setups. World-backed setups remain as legacy/sample fallback.
type PlayableSourceRecord =
  | {
      source: "story";
      story: Story;
      playable: World;
    }
  | {
      source: "world";
      world: World;
      playable: World;
    };

export type UserWorldListItem = {
  id: string;
  source: "story" | "world";
  title: string;
  summary: string;
  updatedAt: Date;
};

export type UserWorldCanonListItem = {
  id: string;
  title: string;
  shortSummary: string;
  updatedAt: Date;
};

export type UserStoryListItem = {
  id: string;
  source: "story" | "world";
  title: string;
  summary: string;
  visibility?: StoryVisibility;
  publishedAt?: Date | null;
  updatedAt: Date;
};

export type UserSessionListItem = {
  id: string;
  worldId: string;
  worldTitle: string;
  characterName: string;
  turnCount: number;
  updatedAt: Date;
};

export type PublicStoryListItem = {
  id: string;
  title: string;
  summary: string;
  authorName: string;
  authorUsername: string;
  publishedAt: Date | null;
  coverImageUrl: string | null;
  tags: string[];
};

export type StoryProfileRecord = {
  story: Story;
  authorName: string | null;
  isOwner: boolean;
};

export type PublicUserProfileRecord = {
  username: string;
  bio: string | null;
  stories: PublicStoryListItem[];
};

// Internal shared mapping helpers

function getStoryAuthorLabel(record: {
  user: {
    username: string;
    displayName: string | null;
    name: string | null;
    email: string | null;
  } | null;
}) {
  const username = record.user?.username?.trim();
  const name = record.user?.name?.trim();
  const email = record.user?.email?.trim();

  return username || name || email || "Unknown author";
}

function normalizePov(value: string | StoryPov | null | undefined): StoryPov {
  if (value === "first_person" || value === "third_person") {
    return value;
  }

  return "second_person";
}

function readStringArray(value: Prisma.JsonValue, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function readCastMembers(value: Prisma.JsonValue): WorldCastMember[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const members: WorldCastMember[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const name = typeof item.name === "string" ? item.name.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const role = typeof item.role === "string" ? item.role.trim() : "";

    if (!name || !description) {
      continue;
    }

    members.push({ name, description, role });
  }

  return members;
}

function isStoryCardType(value: string): value is StoryCardType {
  return (
    value === "character" ||
    value === "location" ||
    value === "faction" ||
    value === "story_event"
  );
}

function readStoryCards(value: Prisma.JsonValue): StoryCard[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const cards: StoryCard[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const id = typeof item.id === "string" ? item.id.trim() : "";
    const type = typeof item.type === "string" ? item.type.trim() : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const role = typeof item.role === "string" ? item.role.trim() : "";
    const triggerKeywords = readStringArray(
      "triggerKeywords" in item ? (item.triggerKeywords as Prisma.JsonValue) : [],
    );

    if (!id || !isStoryCardType(type) || !title || !description) {
      continue;
    }

    cards.push({
      id,
      type,
      title,
      description,
      role,
      triggerKeywords,
    });
  }

  return cards;
}

function mapCharacter(record: {
  id: string;
  name: string;
  description: string;
  strengths: Prisma.JsonValue;
  weaknesses: Prisma.JsonValue;
}): PlayerCharacter {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    strengths: readStringArray(record.strengths),
    weaknesses: readStringArray(record.weaknesses),
  };
}

function mapWorld(record: DbWorld): World {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    background: record.background,
    runtimeBackground: record.runtimeBackground,
    firstAction: record.firstAction,
    objective: record.objective,
    pov: normalizePov(record.pov),
    instructions: record.instructions,
    toneStyle: record.toneStyle || record.authorStyle,
    authorStyle: record.authorStyle || record.toneStyle || "",
    storyCards: readStoryCards(record.storyCards ?? []),
    victoryCondition: record.victoryCondition,
    victoryEnabled: record.victoryEnabled,
    defeatCondition: record.defeatCondition,
    defeatEnabled: record.defeatEnabled,
    playerCharacters: record.playerCharacters.map(mapCharacter),
  };
}

function mapStoryRecord(record: DbStoryRecord): Story {
  return {
    id: record.id,
    worldId: record.worldId,
    visibility: record.visibility as StoryVisibility,
    slug: record.slug,
    publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
    coverImageUrl: record.coverImageUrl,
    tags: normalizeStoryTags(record.tags),
    title: record.title,
    summary: record.summary,
    background: record.background,
    runtimeBackground: record.runtimeBackground,
    firstAction: record.firstAction,
    objective: record.objective,
    pov: normalizePov(record.pov),
    instructions: record.instructions,
    toneStyle: record.toneStyle || record.authorStyle,
    authorStyle: record.authorStyle || record.toneStyle || "",
    storyCards: readStoryCards(record.storyCards ?? []),
    victoryCondition: record.victoryCondition,
    victoryEnabled: record.victoryEnabled,
    defeatCondition: record.defeatCondition,
    defeatEnabled: record.defeatEnabled,
    playerCharacters: record.playerCharacters.map(mapCharacter),
  };
}

function getStoryPublishValidationError(story: Story) {
  if (!story.title.trim()) return "A title is required before publishing.";
  if (!story.summary.trim()) return "A summary is required before publishing.";
  if (!story.background.trim()) return "Background is required before publishing.";
  if (!story.firstAction.trim()) return "A first action is required before publishing.";
  if (!story.objective.trim()) return "An objective is required before publishing.";
  if (!story.toneStyle.trim()) return "Tone style is required before publishing.";
  if (story.playerCharacters.length === 0) {
    return "Add at least one playable character before publishing.";
  }

  if (
    story.playerCharacters.some(
      (character) => !character.name.trim() || !character.description.trim(),
    )
  ) {
    return "Each playable character needs a name and description before publishing.";
  }

  return null;
}

async function ensureUniqueStorySlug(
  tx: Prisma.TransactionClient,
  title: string,
  storyId: string,
  currentSlug: string | null,
) {
  if (currentSlug) {
    return currentSlug;
  }

  const baseSlug = slugify(title);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existingStory = await tx.story.findFirst({
      where: {
        slug: candidate,
        NOT: {
          id: storyId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existingStory) {
      return candidate;
    }
  }

  return `${baseSlug}-${createId("slug").replace("slug-", "")}`;
}

function mapWorldCanon(record: DbWorldCanon): WorldCanon {
  return {
    id: record.id,
    title: record.title,
    shortSummary: record.summary,
    longDescription: record.longDescription ?? "",
    setting: record.setting ?? "",
    lore: record.lore ?? "",
    history: record.history ?? "",
    rules: record.rules ?? "",
    cast: readCastMembers(record.cast ?? []),
  };
}

function mapTurn(record: {
  turnNumber: number;
  playerAction: string;
  storyText: string;
  suggestedActions: Prisma.JsonValue;
}): SessionTurn {
  return {
    turnNumber: record.turnNumber,
    playerAction: record.playerAction,
    storyText: record.storyText,
    suggestedActions: readStringArray(record.suggestedActions),
  };
}

function mapSession(record: DbSession): Session {
  return {
    id: record.id,
    worldId: record.worldId ?? null,
    storyId: record.storyId ?? null,
    characterId: record.storyCharacterId ?? record.characterId ?? "",
    turnCount: record.turnCount,
    objective: record.storyObjective ?? record.objective,
    pov: normalizePov(record.storyPov ?? record.pov),
    summary: record.summary ?? "",
    inactiveStoryCardIds: readStringArray(record.inactiveStoryCardIds ?? [], []),
    lastSentStoryCardIds: readStringArray(record.lastSentStoryCardIds ?? [], []),
    storyTitle: record.storyTitle ?? null,
    storySummary: record.storySummary ?? null,
    storyBackground: record.storyBackground ?? null,
    storyRuntimeBackground: record.storyRuntimeBackground ?? null,
    storyFirstAction: record.storyFirstAction ?? null,
    storyObjective: record.storyObjective ?? null,
    storyInstructions: record.storyInstructions ?? null,
    storyAuthorStyle: record.storyAuthorStyle ?? null,
    storyPov: record.storyPov ? normalizePov(record.storyPov) : null,
    victoryCondition: record.victoryCondition ?? null,
    victoryEnabled: record.victoryEnabled ?? null,
    defeatCondition: record.defeatCondition ?? null,
    defeatEnabled: record.defeatEnabled ?? null,
    characterName: record.characterName ?? null,
    characterDescription: record.characterDescription ?? null,
    characterStrengths: readStringArray(record.characterStrengths ?? [], []),
    characterWeaknesses: readStringArray(record.characterWeaknesses ?? [], []),
    previousResponseId: record.previousResponseId ?? "",
    turns: [...record.turns].reverse().map(mapTurn),
  };
}

function buildSessionSnapshot(playable: World, character: PlayerCharacter) {
  return {
    storyTitle: sanitizeTextForDatabase(playable.title),
    storySummary: sanitizeTextForDatabase(playable.summary),
    storyBackground: sanitizeTextForDatabase(playable.background),
    storyRuntimeBackground: sanitizeTextForDatabase(playable.runtimeBackground || playable.background),
    storyFirstAction: sanitizeTextForDatabase(playable.firstAction),
    storyObjective: sanitizeTextForDatabase(playable.objective),
    storyInstructions: sanitizeTextForDatabase(playable.instructions),
    storyAuthorStyle: sanitizeTextForDatabase(playable.authorStyle || playable.toneStyle),
    storyPov: playable.pov,
    victoryCondition: sanitizeTextForDatabase(playable.victoryCondition),
    victoryEnabled: playable.victoryEnabled,
    defeatCondition: sanitizeTextForDatabase(playable.defeatCondition),
    defeatEnabled: playable.defeatEnabled,
    characterName: sanitizeTextForDatabase(character.name),
    characterDescription: sanitizeTextForDatabase(character.description),
    characterStrengths: sanitizeTextArrayForDatabase(character.strengths),
    characterWeaknesses: sanitizeTextArrayForDatabase(character.weaknesses),
  };
}

function buildPlayableSnapshotWorld(record: DbSessionBundle): { world: World; character: PlayerCharacter } | null {
  if (
    !record.storyTitle ||
    !record.storySummary ||
    !record.storyBackground ||
    !record.storyFirstAction ||
    !record.storyObjective ||
    !record.storyPov ||
    !record.characterName ||
    !record.characterDescription
  ) {
    return null;
  }

  const characterStrengths = readStringArray(record.characterStrengths ?? [], []);
  const characterWeaknesses = readStringArray(record.characterWeaknesses ?? [], []);
  const snapshotStoryCards = record.story
    ? readStoryCards(record.story.storyCards ?? [])
    : record.world
      ? readStoryCards(record.world.storyCards ?? [])
      : [];

  return {
    world: {
      id: record.storyId ?? record.worldId ?? record.id,
      title: record.storyTitle,
      summary: record.storySummary,
      background: record.storyBackground,
      runtimeBackground: record.storyRuntimeBackground ?? record.storyBackground,
      firstAction: record.storyFirstAction,
      objective: record.storyObjective,
      pov: normalizePov(record.storyPov),
      instructions: record.storyInstructions ?? "",
      toneStyle: record.storyAuthorStyle ?? "",
      authorStyle: record.storyAuthorStyle ?? "",
      // Snapshot-backed sessions predate frozen story-card storage, so use the linked
      // Story/World cards as a compatibility fallback until cards are snapshot-backed too.
      storyCards: snapshotStoryCards,
      victoryCondition: record.victoryCondition ?? "",
      victoryEnabled: record.victoryEnabled ?? true,
      defeatCondition: record.defeatCondition ?? "",
      defeatEnabled: record.defeatEnabled ?? true,
      playerCharacters: [
        {
          id: record.storyCharacterId ?? record.characterId ?? "",
          name: record.characterName,
          description: record.characterDescription,
          strengths: characterStrengths,
          weaknesses: characterWeaknesses,
        },
      ],
    },
    character: {
      id: record.storyCharacterId ?? record.characterId ?? "",
      name: record.characterName,
      description: record.characterDescription,
      strengths: characterStrengths,
      weaknesses: characterWeaknesses,
    },
  };
}

function worldPersistenceData(world: World) {
  return {
    kind: "legacy_playable" as const,
    title: sanitizeTextForDatabase(world.title),
    summary: sanitizeTextForDatabase(world.summary),
    background: sanitizeTextForDatabase(world.background),
    runtimeBackground: sanitizeTextForDatabase(world.runtimeBackground || world.background),
    firstAction: sanitizeTextForDatabase(world.firstAction),
    objective: sanitizeTextForDatabase(world.objective),
    pov: world.pov,
    instructions: sanitizeTextForDatabase(world.instructions),
    toneStyle: sanitizeTextForDatabase(world.toneStyle),
    authorStyle: sanitizeTextForDatabase(world.authorStyle || world.toneStyle),
    storyCards: world.storyCards.map((card) => ({
      id: sanitizeTextForDatabase(card.id),
      type: card.type,
      title: sanitizeTextForDatabase(card.title),
      description: sanitizeTextForDatabase(card.description),
      role: sanitizeTextForDatabase(card.role ?? ""),
      triggerKeywords: sanitizeTextArrayForDatabase(card.triggerKeywords),
    })),
    victoryCondition: sanitizeTextForDatabase(world.victoryCondition),
    victoryEnabled: world.victoryEnabled,
    defeatCondition: sanitizeTextForDatabase(world.defeatCondition),
    defeatEnabled: world.defeatEnabled,
  };
}

function worldCanonPersistenceData(world: WorldCanon) {
  return {
    kind: "canon" as const,
    title: sanitizeTextForDatabase(world.title),
    summary: sanitizeTextForDatabase(world.shortSummary),
    longDescription: sanitizeTextForDatabase(world.longDescription),
    setting: sanitizeTextForDatabase(world.setting),
    lore: sanitizeTextForDatabase(world.lore),
    history: sanitizeTextForDatabase(world.history),
    rules: sanitizeTextForDatabase(world.rules),
    cast: world.cast.map((member) => ({
      name: sanitizeTextForDatabase(member.name),
      description: sanitizeTextForDatabase(member.description),
      role: sanitizeTextForDatabase(member.role ?? ""),
    })),
    // Legacy standalone-story fields stay empty for canon-only World records.
    background: "",
    runtimeBackground: "",
    firstAction: "",
    objective: "",
    pov: "second_person" as const,
    instructions: "",
    toneStyle: "",
    authorStyle: "",
    storyCards: [],
    victoryCondition: "",
    victoryEnabled: true,
    defeatCondition: "",
    defeatEnabled: true,
  };
}

function storyPersistenceData(story: Story) {
  return {
    worldId: story.worldId ?? null,
    coverImageUrl: story.coverImageUrl ?? null,
    tags: sanitizeTextArrayForDatabase(normalizeStoryTags(story.tags)),
    title: sanitizeTextForDatabase(story.title),
    summary: sanitizeTextForDatabase(story.summary),
    background: sanitizeTextForDatabase(story.background),
    runtimeBackground: sanitizeTextForDatabase(story.runtimeBackground || story.background),
    firstAction: sanitizeTextForDatabase(story.firstAction),
    objective: sanitizeTextForDatabase(story.objective),
    pov: story.pov,
    instructions: sanitizeTextForDatabase(story.instructions),
    toneStyle: sanitizeTextForDatabase(story.toneStyle),
    authorStyle: sanitizeTextForDatabase(story.authorStyle || story.toneStyle),
    storyCards: story.storyCards.map((card) => ({
      id: sanitizeTextForDatabase(card.id),
      type: card.type,
      title: sanitizeTextForDatabase(card.title),
      description: sanitizeTextForDatabase(card.description),
      role: sanitizeTextForDatabase(card.role ?? ""),
      triggerKeywords: sanitizeTextArrayForDatabase(card.triggerKeywords),
    })),
    victoryCondition: sanitizeTextForDatabase(story.victoryCondition),
    victoryEnabled: story.victoryEnabled,
    defeatCondition: sanitizeTextForDatabase(story.defeatCondition),
    defeatEnabled: story.defeatEnabled,
  };
}

function storyFromPlayableInput(world: World, worldId: string | null = null): Story {
  return {
    id: world.id,
    worldId,
    tags: [],
    title: world.title,
    summary: world.summary,
    background: world.background,
    runtimeBackground: world.runtimeBackground,
    firstAction: world.firstAction,
    objective: world.objective,
    pov: world.pov,
    instructions: world.instructions,
    toneStyle: world.toneStyle,
    authorStyle: world.authorStyle,
    storyCards: world.storyCards,
    victoryCondition: world.victoryCondition,
    victoryEnabled: world.victoryEnabled,
    defeatCondition: world.defeatCondition,
    defeatEnabled: world.defeatEnabled,
    playerCharacters: world.playerCharacters,
  };
}

function isSampleWorld(id: string) {
  return Boolean(getSampleWorldById(id));
}

function cloneWorldForOwner(world: World): World {
  return {
    ...world,
    id: createId("world"),
    playerCharacters: world.playerCharacters.map((character) => ({
      ...character,
      id: createId("pc"),
    })),
  };
}

function cloneStoryForOwner(world: World): Story {
  return {
    ...storyFromPlayableInput(world),
    id: createId("story"),
  };
}

function buildStoryCharacterRows(storyId: string, characters: World["playerCharacters"]) {
  return characters.map((character) => ({
    // Incoming playable setup ids are not safe to reuse for StoryCharacter rows because
    // they can come from legacy/sample payloads or a different Story.
    id: createId("sc"),
    storyId,
    name: sanitizeTextForDatabase(character.name),
    description: sanitizeTextForDatabase(character.description),
    strengths: sanitizeTextArrayForDatabase(character.strengths),
    weaknesses: sanitizeTextArrayForDatabase(character.weaknesses),
  }));
}

async function persistWorldRecord(world: World, userId: string | null) {
  await prisma.$transaction(async (tx) => {
    await tx.world.upsert({
      where: { id: world.id },
      create: {
        id: world.id,
        userId,
        ...worldPersistenceData(world),
      },
      update: {
        userId,
        ...worldPersistenceData(world),
      },
    });

    await tx.playerCharacter.deleteMany({
      where: {
        worldId: world.id,
      },
    });

    if (world.playerCharacters.length > 0) {
      await tx.playerCharacter.createMany({
        data: world.playerCharacters.map((character) => ({
          id: character.id,
          worldId: world.id,
          name: sanitizeTextForDatabase(character.name),
          description: sanitizeTextForDatabase(character.description),
          strengths: sanitizeTextArrayForDatabase(character.strengths),
          weaknesses: sanitizeTextArrayForDatabase(character.weaknesses),
        })),
      });
    }
  });

  const savedWorld = await prisma.world.findUnique({
    where: { id: world.id },
    include: worldInclude,
  });

  return savedWorld ? mapWorld(savedWorld) : null;
}

// Real path: user-facing Story setup/template persistence.
async function persistStoryRecord(story: Story, userId: string | null) {
  await prisma.$transaction(async (tx) => {
    await tx.story.upsert({
      where: { id: story.id },
      create: {
        id: story.id,
        userId,
        ...storyPersistenceData(story),
      },
      update: {
        userId,
        ...storyPersistenceData(story),
      },
    });

    await tx.storyCharacter.deleteMany({
      where: {
        storyId: story.id,
      },
    });

    if (story.playerCharacters.length > 0) {
      await tx.storyCharacter.createMany({
        data: buildStoryCharacterRows(story.id, story.playerCharacters),
      });
    }
  });

  const savedStory = await prisma.story.findUnique({
    where: { id: story.id },
    select: storySelect,
  });

  return savedStory ? mapStoryRecord(savedStory) : null;
}

async function persistWorldCanonRecord(world: WorldCanon, userId: string | null) {
  const savedWorld = await prisma.world.upsert({
    where: { id: world.id },
    create: {
      id: world.id,
      userId,
      ...worldCanonPersistenceData(world),
    },
    update: {
      userId,
      ...worldCanonPersistenceData(world),
    },
  });

  return mapWorldCanon(savedWorld);
}

// World helpers

export async function createWorld(world: World, userId: string) {
  return persistWorldRecord(world, userId);
}

export async function createWorldCanon(world: WorldCanon, userId: string) {
  return persistWorldCanonRecord(world, userId);
}

export async function updateWorldCanonForUser(world: WorldCanon, userId: string) {
  const existingWorld = await prisma.world.findFirst({
    where: {
      id: world.id,
      userId,
      kind: "canon",
    },
    select: {
      id: true,
    },
  });

  if (!existingWorld) {
    return null;
  }

  return persistWorldCanonRecord(world, userId);
}

export async function cloneWorldCanonForUser(worldId: string, userId: string) {
  const world = await getOwnedWorldCanonById(worldId, userId);

  if (!world) {
    return null;
  }

  const clonedWorld: WorldCanon = {
    ...world,
    id: createId("world"),
    title: `Copy of ${world.title}`,
    cast: world.cast.map((member) => ({
      name: member.name,
      description: member.description,
      role: member.role ?? "",
    })),
  };

  return persistWorldCanonRecord(clonedWorld, userId);
}

export async function deleteWorldCanonForUser(worldId: string, userId: string) {
  const existingWorld = await prisma.world.findFirst({
    where: {
      id: worldId,
      userId,
      kind: "canon",
    },
    select: {
      id: true,
    },
  });

  if (!existingWorld) {
    return false;
  }

  await prisma.world.delete({
    where: {
      id: worldId,
    },
  });

  return true;
}

export async function createStory(story: Story, userId: string) {
  return persistStoryRecord(story, userId);
}

export async function createSampleWorldRecord(id: string) {
  const sampleWorld = getSampleWorldById(id);

  if (!sampleWorld) {
    return null;
  }

  const existingWorld = await prisma.world.findFirst({
    where: {
      id,
      userId: null,
      kind: "legacy_playable",
    },
    include: worldInclude,
  });

  if (existingWorld) {
    return mapWorld(existingWorld);
  }

  return persistWorldRecord(sampleWorld, null);
}

export async function updateWorldForUser(world: World, userId: string) {
  const existingWorld = await prisma.world.findFirst({
    where: {
      id: world.id,
      userId,
      kind: "legacy_playable",
    },
    select: {
      id: true,
    },
  });

  if (!existingWorld) {
    return null;
  }

  return persistWorldRecord(world, userId);
}

export async function updateStoryForUser(story: Story, userId: string) {
  const existingStory = await prisma.story.findFirst({
    where: {
      id: story.id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingStory) {
    return null;
  }

  return persistStoryRecord(story, userId);
}

export async function updateStoryCoverImageForUser(
  storyId: string,
  userId: string,
  coverImageUrl: string | null,
) {
  const existingStory = await prisma.story.findFirst({
    where: {
      id: storyId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingStory) {
    return null;
  }

  const story = await prisma.story.update({
    where: {
      id: storyId,
    },
    data: {
      coverImageUrl,
    },
    select: storySelect,
  });

  return mapStoryRecord(story);
}

export async function createOwnedCopyFromWorld(world: World, userId: string) {
  const ownedWorld = cloneWorldForOwner(world);
  return createWorld(ownedWorld, userId);
}

export async function getOwnedWorldById(id: string, userId: string) {
  const world = await prisma.world.findFirst({
    where: {
      id,
      userId,
      kind: "legacy_playable",
    },
    include: worldInclude,
  });

  return world ? mapWorld(world) : null;
}

export async function getOwnedWorldCanonById(id: string, userId: string) {
  const world = await prisma.world.findFirst({
    where: {
      id,
      userId,
      kind: "canon",
    },
  });

  return world ? mapWorldCanon(world) : null;
}

export async function listWorldCanonsForUser(userId: string): Promise<UserWorldCanonListItem[]> {
  const worlds = await prisma.world.findMany({
    where: {
      userId,
      kind: "canon",
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      summary: true,
      updatedAt: true,
    },
  });

  return worlds.map((world) => ({
    id: world.id,
    title: world.title,
    shortSummary: world.summary,
    updatedAt: world.updatedAt,
  }));
}

// Story helpers

export async function getOwnedStoryById(id: string, userId: string) {
  const story = await prisma.story.findFirst({
    where: {
      id,
      userId,
    },
    select: storySelect,
  });

  return story ? mapStoryRecord(story) : null;
}

export async function getPlayableStoryById(id: string, userId: string) {
  const story = await prisma.story.findFirst({
    where: {
      id,
      OR: [
        {
          userId,
        },
        {
          visibility: "public",
        },
      ],
    },
    select: storySelect,
  });

  return story ? mapStoryRecord(story) : null;
}

export async function getStoryProfileById(
  id: string,
  userId?: string | null,
): Promise<StoryProfileRecord | null> {
  const story = await prisma.story.findFirst({
    where: {
      id,
      OR: userId
        ? [
            {
              userId,
            },
            {
              visibility: "public",
            },
          ]
        : [
            {
              visibility: "public",
            },
          ],
    },
    select: {
      ...storySelect,
      userId: true,
      user: {
        select: {
          username: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!story) {
    return null;
  }

  return {
    story: mapStoryRecord(story),
    authorName: story.user?.username ?? story.user?.name ?? story.user?.email ?? null,
    isOwner: Boolean(userId && story.userId === userId),
  };
}

export async function getPublicUserProfileByUsername(
  username: string,
): Promise<PublicUserProfileRecord | null> {
  const user = await prisma.user.findFirst({
    where: {
      username,
    },
    select: {
      username: true,
      bio: true,
      stories: {
        where: {
          visibility: "public",
        },
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          summary: true,
          publishedAt: true,
          coverImageUrl: true,
          tags: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    username: user.username,
    bio: user.bio,
    stories: user.stories.map((story) => ({
      id: story.id,
      title: story.title,
      summary: story.summary,
      authorName: user.username,
      authorUsername: user.username,
      publishedAt: story.publishedAt ?? null,
      coverImageUrl: story.coverImageUrl ?? null,
      tags: normalizeStoryTags(story.tags),
    })),
  };
}

export async function listPublishedStoriesForExplore(
  limit = 24,
): Promise<PublicStoryListItem[]> {
  const stories = await prisma.story.findMany({
    where: {
      visibility: "public",
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
    include: {
      user: {
        select: {
          username: true,
          displayName: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    summary: story.summary,
    authorName: getStoryAuthorLabel(story),
    authorUsername: story.user?.username ?? "unknown-author",
    publishedAt: story.publishedAt ?? null,
    coverImageUrl: story.coverImageUrl ?? null,
    tags: normalizeStoryTags(story.tags),
  }));
}

export async function publishStoryForUser(storyId: string, userId: string) {
  const existingStory = await getOwnedStoryById(storyId, userId);

  if (!existingStory) {
    return { story: null, error: "Story not found." };
  }

  const validationError = getStoryPublishValidationError(existingStory);

  if (validationError) {
    return { story: null, error: validationError };
  }

  await prisma.$transaction(async (tx) => {
    const story = await tx.story.findFirst({
      where: {
        id: storyId,
        userId,
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    });

    if (!story) {
      throw new Error("Story not found.");
    }

    const slug = await ensureUniqueStorySlug(tx, story.title, story.id, story.slug);

    await tx.story.update({
      where: {
        id: story.id,
      },
      data: {
        visibility: "public",
        slug,
        publishedAt: new Date(),
      },
    });
  });

  return {
    story: await getOwnedStoryById(storyId, userId),
    error: null,
  };
}

export async function unpublishStoryForUser(storyId: string, userId: string) {
  const existingStory = await prisma.story.findFirst({
    where: {
      id: storyId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingStory) {
    return null;
  }

  await prisma.story.update({
    where: {
      id: storyId,
    },
    data: {
      visibility: "private",
      publishedAt: null,
    },
  });

  return getOwnedStoryById(storyId, userId);
}

export async function listPlayableEntriesForUser(userId: string): Promise<UserWorldListItem[]> {
  const [stories, worlds] = await Promise.all([
    prisma.story.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        summary: true,
        updatedAt: true,
      },
    }),
    prisma.world.findMany({
      where: {
        userId,
        kind: "legacy_playable",
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        summary: true,
        updatedAt: true,
      },
    }),
  ]);

  return [
    ...stories.map((story) => ({
      ...story,
      source: "story" as const,
    })),
    ...worlds.map((world) => ({
      ...world,
      source: "world" as const,
    })),
  ]
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .map((item) => ({
      id: item.id,
      source: item.source,
      title: item.title,
      summary: item.summary,
      updatedAt: item.updatedAt,
    }));
}

export async function listWorldsForUser(userId: string): Promise<UserWorldListItem[]> {
  return listPlayableEntriesForUser(userId);
}

export async function getPlayableByIdOrSample(id: string, userId?: string | null) {
  if (isSampleWorld(id)) {
    return getSampleWorldById(id);
  }

  if (!userId) {
    return null;
  }

  // Compatibility path for /worlds/[id] loaders:
  // prefer a real Story setup first, then fall back to legacy playable World rows.
  const story = await getOwnedStoryById(id, userId);

  if (story) {
    return createWorldFromStory(story);
  }

  return getOwnedWorldById(id, userId);
}

export async function getStoryPlayableById(id: string, userId: string) {
  return getPlayableStoryById(id, userId);
}

export async function getWorldByIdOrSample(id: string, userId?: string | null) {
  return getPlayableByIdOrSample(id, userId);
}

export async function resolvePlayableSourceForSessionStart(
  id: string,
  userId: string,
): Promise<PlayableSourceRecord | null> {
  // Real path: new runs start from Story. Everything below Story is legacy/sample fallback.
  const story = await getPlayableStoryById(id, userId);

  if (story) {
    return {
      source: "story",
      story,
      playable: createWorldFromStory(story),
    };
  }

  if (isSampleWorld(id)) {
    const world = await createSampleWorldRecord(id);

    if (!world) {
      return null;
    }

    return {
      source: "world",
      world,
      playable: world,
    };
  }

  const world = await getOwnedWorldById(id, userId);

  if (!world) {
    return null;
  }

  return {
    source: "world",
    world,
    playable: world,
  };
}

export async function getPlayableSetupForSession(id: string, userId: string) {
  return resolvePlayableSourceForSessionStart(id, userId);
}

// Session helpers

export async function createSessionFromLegacyWorld(params: {
  worldId: string;
  characterId?: string | null;
  customCharacter?: CustomSessionCharacter | null;
  userId: string;
}) {
  const world = await prisma.world.findFirst({
    where: {
      id: params.worldId,
      kind: "legacy_playable",
      OR: [{ userId: params.userId }, { userId: null }],
    },
  });

  if (!world) {
    return null;
  }

  let selectedCharacter: PlayerCharacter | null = null;
  let characterId: string | null = null;

  if (params.customCharacter) {
    selectedCharacter = {
      id: "",
      name: params.customCharacter.name,
      description: params.customCharacter.description,
      strengths: params.customCharacter.strengths,
      weaknesses: params.customCharacter.weaknesses,
    };
  } else if (params.characterId) {
    const characterRecord = await prisma.playerCharacter.findFirst({
      where: {
        id: params.characterId,
        worldId: params.worldId,
      },
    });

    if (!characterRecord) {
      return null;
    }

    selectedCharacter = mapCharacter(characterRecord);
    characterId = params.characterId;
  }

  if (!selectedCharacter) {
    return null;
  }

  const playable = mapWorld({
    ...world,
    playerCharacters: characterId
      ? [
          {
            id: characterId,
            name: selectedCharacter.name,
            description: selectedCharacter.description,
            strengths: selectedCharacter.strengths,
            weaknesses: selectedCharacter.weaknesses,
          },
        ]
      : [],
  } as DbWorld);

  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      worldId: params.worldId,
      characterId,
      storyId: null,
      storyCharacterId: null,
      turnCount: 0,
      objective: sanitizeTextForDatabase(world.objective),
      currentObjective: sanitizeTextForDatabase(world.objective),
      pov: world.pov,
      ...buildSessionSnapshot(playable, selectedCharacter),
      previousResponseId: "",
    },
    include: recentTurnsInclude,
  });

  return mapSession(session);
}

export async function createSession(params: {
  worldId: string;
  characterId: string;
  userId: string;
}) {
  // Compatibility wrapper for older world-backed callers.
  return createSessionFromLegacyWorld(params);
}

// Real path: Start Game from a Story creates a Session from Story.
export async function createSessionFromStory(params: {
  storyId: string;
  characterId?: string | null;
  customCharacter?: CustomSessionCharacter | null;
  userId: string;
}) {
  const story = await prisma.story.findFirst({
    where: {
      id: params.storyId,
      OR: [
        {
          userId: params.userId,
        },
        {
          visibility: "public",
        },
      ],
    },
    select: storySelect,
  });

  if (!story) {
    return null;
  }

  let selectedCharacter: PlayerCharacter | null = null;
  let storyCharacterId: string | null = null;

  if (params.customCharacter) {
    selectedCharacter = {
      id: "",
      name: params.customCharacter.name,
      description: params.customCharacter.description,
      strengths: params.customCharacter.strengths,
      weaknesses: params.customCharacter.weaknesses,
    };
  } else if (params.characterId) {
    const existingCharacter = story.playerCharacters.find(
      (character) => character.id === params.characterId,
    );

    if (!existingCharacter) {
      return null;
    }

    selectedCharacter = mapCharacter(existingCharacter);
    storyCharacterId = existingCharacter.id;
  }

  if (!selectedCharacter) {
    return null;
  }

  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      worldId: story.worldId ?? null,
      storyId: story.id,
      characterId: null,
      storyCharacterId,
      turnCount: 0,
      objective: sanitizeTextForDatabase(story.objective),
      currentObjective: sanitizeTextForDatabase(story.objective),
      pov: story.pov,
      ...buildSessionSnapshot(mapStoryRecord(story), mapCharacter(selectedCharacter)),
      previousResponseId: "",
    },
    include: recentTurnsInclude,
  });

  return mapSession(session);
}

export async function getSessionById(id: string, userId: string) {
  const session = await prisma.session.findFirst({
    where: {
      id,
      userId,
    },
    include: recentTurnsInclude,
  });

  return session ? mapSession(session) : null;
}

export async function getSessionBundle(id: string, userId: string) {
  const session = await prisma.session.findFirst({
    where: {
      id,
      userId,
    },
    include: sessionBundleInclude,
  });

  if (!session) {
    return null;
  }

  // Real runtime path: frozen session snapshot takes priority so later story edits
  // do not mutate prior runs. Story/World reads below are compatibility fallback.
  const snapshot = buildPlayableSnapshotWorld(session);
  const story = session.story ? mapStoryRecord(session.story) : null;
  const worldRecord = session.world ? mapWorld(session.world) : null;
  const playable = snapshot?.world ?? (story ? createWorldFromStory(story) : worldRecord);

  if (!playable) {
    return null;
  }

  const storyCharacter = session.storyCharacter ? mapCharacter(session.storyCharacter) : null;
  const worldCharacter = session.character ? mapCharacter(session.character) : null;
  const fallbackCharacter =
    snapshot?.character ??
    storyCharacter ??
    worldCharacter ??
    playable.playerCharacters.find((item) => item.id === session.storyCharacterId || item.id === session.characterId) ??
    null;

  return {
    session: mapSession(session),
    world: playable,
    character: fallbackCharacter,
  };
}

export async function listStoriesForUser(userId: string): Promise<UserStoryListItem[]> {
  const [stories, worlds] = await Promise.all([
    prisma.story.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        summary: true,
        visibility: true,
        publishedAt: true,
        updatedAt: true,
      },
    }),
    prisma.world.findMany({
      where: {
        userId,
        kind: "legacy_playable",
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        summary: true,
        updatedAt: true,
      },
    }),
  ]);

  return [
    ...stories.map((story) => ({
      ...story,
      source: "story" as const,
    })),
    ...worlds.map((world) => ({
      ...world,
      source: "world" as const,
    })),
  ]
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .map((item) => ({
      id: item.id,
      source: item.source,
      title: item.title,
      summary: item.summary,
      visibility: "visibility" in item ? item.visibility : undefined,
      publishedAt: "publishedAt" in item ? item.publishedAt : undefined,
      updatedAt: item.updatedAt,
    }));
}

export async function listSessionsForUser(userId: string): Promise<UserSessionListItem[]> {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      worldId: true,
      storyId: true,
      storyTitle: true,
      characterName: true,
      turnCount: true,
      updatedAt: true,
      world: {
        select: {
          title: true,
        },
      },
      story: {
        select: {
          title: true,
        },
      },
      character: {
        select: {
          name: true,
        },
      },
      storyCharacter: {
        select: {
          name: true,
        },
      },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    worldId: session.storyId ?? session.worldId ?? session.id,
    worldTitle: session.storyTitle ?? session.story?.title ?? session.world?.title ?? "Untitled Story",
    characterName:
      session.characterName ?? session.storyCharacter?.name ?? session.character?.name ?? "",
    turnCount: session.turnCount,
    updatedAt: session.updatedAt,
  }));
}

export async function savePlayableSetupForUser(world: World, userId: string) {
  // Compatibility entry point for world-shaped editor payloads. The real persistence
  // target is Story when the id belongs to a Story-backed setup.
  const existingStory = await getOwnedStoryById(world.id, userId);

  if (getSampleWorldById(world.id)) {
    const savedStory = await createStory(cloneStoryForOwner(world), userId);
    return savedStory ? createWorldFromStory(savedStory) : null;
  }

  if (existingStory) {
    const savedStory = await updateStoryForUser(
      storyFromPlayableInput(world, existingStory.worldId ?? null),
      userId,
    );

    return savedStory ? createWorldFromStory(savedStory) : null;
  }

  return updateWorldForUser(world, userId);
}

export async function saveStoryPlayableForUser(story: Story, userId: string) {
  const existingStory = await getOwnedStoryById(story.id, userId);

  if (!existingStory) {
    return null;
  }

  const savedStory = await updateStoryForUser(
    {
      ...story,
      worldId: existingStory.worldId ?? story.worldId ?? null,
    },
    userId,
  );

  return savedStory ? createWorldFromStory(savedStory) : null;
}

export async function deleteStoryForUser(storyId: string, userId: string) {
  const existingStory = await prisma.story.findFirst({
    where: {
      id: storyId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingStory) {
    return false;
  }

  await prisma.story.delete({
    where: {
      id: storyId,
    },
  });

  return true;
}

export async function deleteWorldForUser(worldId: string, userId: string) {
  const existingWorld = await prisma.world.findFirst({
    where: {
      id: worldId,
      userId,
      kind: "legacy_playable",
    },
    select: {
      id: true,
    },
  });

  if (!existingWorld) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.session.updateMany({
      where: {
        worldId,
        userId,
      },
      data: {
        worldId: null,
      },
    });

    await tx.world.delete({
      where: {
        id: worldId,
      },
    });
  });

  return true;
}

export async function deleteSessionForUser(sessionId: string, userId: string) {
  const existingSession = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingSession) {
    return false;
  }

  await prisma.session.delete({
    where: {
      id: sessionId,
    },
  });

  return true;
}

export async function saveTurn(params: {
  sessionId: string;
  turn: SessionTurn;
  previousResponseId: string;
  sentStoryCardIds?: string[];
}) {
  // Postgres text columns reject embedded null characters, so strip them before writes.
  await prisma.$transaction(async (tx) => {
    await tx.turn.create({
      data: {
        sessionId: params.sessionId,
        turnNumber: params.turn.turnNumber,
        playerAction: sanitizeTextForDatabase(params.turn.playerAction),
        storyText: sanitizeTextForDatabase(params.turn.storyText),
        suggestedActions: sanitizeTextArrayForDatabase(params.turn.suggestedActions),
        summaryAfterTurn: "",
      },
    });

    await tx.session.update({
      where: { id: params.sessionId },
      data: {
        turnCount: params.turn.turnNumber,
        previousResponseId: params.previousResponseId,
        lastSentStoryCardIds: sanitizeTextArrayForDatabase(params.sentStoryCardIds ?? []),
      },
    });
  });

  const savedSession = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: recentTurnsInclude,
  });

  return savedSession ? mapSession(savedSession) : null;
}

export async function getSessionTurnBlock(params: {
  sessionId: string;
  userId: string;
  startTurnNumber: number;
  endTurnNumber: number;
}) {
  const session = await prisma.session.findFirst({
    where: {
      id: params.sessionId,
      userId: params.userId,
    },
    select: {
      turns: {
        where: {
          turnNumber: {
            gte: params.startTurnNumber,
            lte: params.endTurnNumber,
          },
        },
        orderBy: {
          turnNumber: "asc",
        },
        select: {
          turnNumber: true,
          playerAction: true,
          storyText: true,
          suggestedActions: true,
        },
      },
    },
  });

  return session?.turns.map(mapTurn) ?? null;
}

export async function updateSessionSummary(params: {
  sessionId: string;
  userId: string;
  summary: string;
}) {
  const existingSession = await prisma.session.findFirst({
    where: {
      id: params.sessionId,
      userId: params.userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingSession) {
    return null;
  }

  const savedSession = await prisma.session.update({
    where: {
      id: params.sessionId,
    },
    data: {
      summary: sanitizeTextForDatabase(params.summary),
    },
    include: recentTurnsInclude,
  });

  return mapSession(savedSession);
}

export async function updateSessionInactiveStoryCardIds(params: {
  sessionId: string;
  userId: string;
  inactiveStoryCardIds: string[];
}) {
  const existingSession = await prisma.session.findFirst({
    where: {
      id: params.sessionId,
      userId: params.userId,
    },
    include: recentTurnsInclude,
  });

  if (!existingSession) {
    return null;
  }

  const savedSession = await prisma.session.update({
    where: {
      id: params.sessionId,
    },
    data: {
      inactiveStoryCardIds: sanitizeTextArrayForDatabase(params.inactiveStoryCardIds),
    },
    include: recentTurnsInclude,
  });

  return mapSession(savedSession);
}

export async function updateTurnSuggestedActions(params: {
  sessionId: string;
  userId: string;
  turnNumber: number;
  suggestedActions: string[];
}) {
  const existingSession = await prisma.session.findFirst({
    where: {
      id: params.sessionId,
      userId: params.userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingSession) {
    return null;
  }

  await prisma.turn.updateMany({
    where: {
      sessionId: params.sessionId,
      turnNumber: params.turnNumber,
    },
    data: {
      suggestedActions: sanitizeTextArrayForDatabase(params.suggestedActions),
    },
  });

  const savedSession = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: recentTurnsInclude,
  });

  return savedSession ? mapSession(savedSession) : null;
}

// Compatibility helpers
// These remain because the app still supports:
// - sample worlds
// - legacy playable World records
// - /worlds/[id] compatibility wrappers that can resolve Story first, then fall back
