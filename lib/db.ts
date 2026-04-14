import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CustomSessionCharacter } from "@/lib/schemas";
import { toPlayableStory } from "@/lib/story";
import { normalizeStoryTags } from "@/lib/story-tags";
import { sanitizeTextArrayForDatabase, sanitizeTextForDatabase } from "@/lib/text-sanitize";
import {
  PlayableStory,
  PlayerCharacter,
  Session,
  SessionTurn,
  Story,
  StoryCard,
  StoryCardType,
  StoryPov,
  StoryVisibility,
} from "@/lib/types";
import { createId, slugify } from "@/lib/utils";

const RECENT_TURN_LIMIT = 10;

const storySelect = {
  id: true,
  visibility: true,
  slug: true,
  publishedAt: true,
  coverImageUrl: true,
  tags: true,
  title: true,
  summary: true,
  background: true,
  runtimeBackground: true,
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
  story: {
    select: storySelect,
  },
  storyCharacter: true,
} satisfies Prisma.SessionInclude;

type DbStoryRecord = Prisma.StoryGetPayload<{
  select: typeof storySelect;
}>;

type DbSession = Prisma.SessionGetPayload<{
  include: typeof recentTurnsInclude;
}>;

type DbSessionBundle = Prisma.SessionGetPayload<{
  include: typeof sessionBundleInclude;
}>;

export type UserStoryListItem = {
  id: string;
  source: "story";
  title: string;
  summary: string;
  visibility?: StoryVisibility;
  publishedAt?: Date | null;
  updatedAt: Date;
};

export type UserSessionListItem = {
  id: string;
  storyId: string | null;
  storyTitle: string;
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
}): PlayerCharacter {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
  };
}

function mapStoryRecord(record: DbStoryRecord): Story {
  return {
    id: record.id,
    visibility: record.visibility as StoryVisibility,
    slug: record.slug,
    publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
    coverImageUrl: record.coverImageUrl,
    tags: normalizeStoryTags(record.tags),
    title: record.title,
    summary: record.summary,
    background: record.background,
    runtimeBackground: record.runtimeBackground,
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
    storyId: record.storyId ?? null,
    characterId: record.storyCharacterId ?? "",
    turnCount: record.turnCount,
    pov: normalizePov(record.storyPov ?? record.pov),
    summary: record.summary ?? "",
    inactiveStoryCardIds: readStringArray(record.inactiveStoryCardIds ?? [], []),
    lastSentStoryCardIds: readStringArray(record.lastSentStoryCardIds ?? [], []),
    storyTitle: record.storyTitle ?? null,
    storySummary: record.storySummary ?? null,
    storyBackground: record.storyBackground ?? null,
    storyRuntimeBackground: record.storyRuntimeBackground ?? null,
    storyInstructions: record.storyInstructions ?? null,
    storyAuthorStyle: record.storyAuthorStyle ?? null,
    storyPov: record.storyPov ? normalizePov(record.storyPov) : null,
    victoryCondition: record.victoryCondition ?? null,
    victoryEnabled: record.victoryEnabled ?? null,
    defeatCondition: record.defeatCondition ?? null,
    defeatEnabled: record.defeatEnabled ?? null,
    characterName: record.characterName ?? null,
    characterDescription: record.characterDescription ?? null,
    previousResponseId: record.previousResponseId ?? "",
    turns: [...record.turns].reverse().map(mapTurn),
  };
}

function getStoryPublishValidationError(story: Story) {
  if (!story.title.trim()) return "A title is required before publishing.";
  if (!story.summary.trim()) return "A summary is required before publishing.";
  if (!story.background.trim()) return "Background is required before publishing.";
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

function buildSessionSnapshot(playableStory: PlayableStory, character: PlayerCharacter) {
  return {
    storyTitle: sanitizeTextForDatabase(playableStory.title),
    storySummary: sanitizeTextForDatabase(playableStory.summary),
    storyBackground: sanitizeTextForDatabase(playableStory.background),
    storyRuntimeBackground: sanitizeTextForDatabase(
      playableStory.runtimeBackground || playableStory.background,
    ),
    storyInstructions: sanitizeTextForDatabase(playableStory.instructions),
    storyAuthorStyle: sanitizeTextForDatabase(playableStory.authorStyle || playableStory.toneStyle),
    storyPov: playableStory.pov,
    victoryCondition: sanitizeTextForDatabase(playableStory.victoryCondition),
    victoryEnabled: playableStory.victoryEnabled,
    defeatCondition: sanitizeTextForDatabase(playableStory.defeatCondition),
    defeatEnabled: playableStory.defeatEnabled,
    characterName: sanitizeTextForDatabase(character.name),
    characterDescription: sanitizeTextForDatabase(character.description),
  };
}

function buildSnapshotPlayable(
  record: DbSessionBundle,
): { playableStory: PlayableStory; character: PlayerCharacter } | null {
  if (
    !record.storyTitle ||
    !record.storySummary ||
    !record.storyBackground ||
    !record.storyPov ||
    !record.characterName ||
    !record.characterDescription
  ) {
    return null;
  }

  const snapshotStoryCards = record.story ? readStoryCards(record.story.storyCards ?? []) : [];

  return {
    playableStory: {
      id: record.storyId ?? record.id,
      title: record.storyTitle,
      summary: record.storySummary,
      background: record.storyBackground,
      runtimeBackground: record.storyRuntimeBackground ?? record.storyBackground,
      pov: normalizePov(record.storyPov),
      instructions: record.storyInstructions ?? "",
      toneStyle: record.storyAuthorStyle ?? "",
      authorStyle: record.storyAuthorStyle ?? "",
      storyCards: snapshotStoryCards,
      victoryCondition: record.victoryCondition ?? "",
      victoryEnabled: record.victoryEnabled ?? true,
      defeatCondition: record.defeatCondition ?? "",
      defeatEnabled: record.defeatEnabled ?? true,
      playerCharacters: [
        {
          id: record.storyCharacterId ?? "",
          name: record.characterName,
          description: record.characterDescription,
        },
      ],
    },
    character: {
      id: record.storyCharacterId ?? "",
      name: record.characterName,
      description: record.characterDescription,
    },
  };
}

function storyPersistenceData(story: Story) {
  return {
    coverImageUrl: story.coverImageUrl ?? null,
    tags: sanitizeTextArrayForDatabase(normalizeStoryTags(story.tags)),
    title: sanitizeTextForDatabase(story.title),
    summary: sanitizeTextForDatabase(story.summary),
    background: sanitizeTextForDatabase(story.background),
    runtimeBackground: sanitizeTextForDatabase(story.runtimeBackground || story.background),
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

function buildStoryCharacterRows(storyId: string, characters: Story["playerCharacters"]) {
  return characters.map((character) => ({
    // Incoming ids are compiler/editor ids, not stable DB row ids.
    id: createId("sc"),
    storyId,
    name: sanitizeTextForDatabase(character.name),
    description: sanitizeTextForDatabase(character.description),
  }));
}

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

async function updateStoryForUser(story: Story, userId: string) {
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

export async function createStory(story: Story, userId: string) {
  return persistStoryRecord(story, userId);
}

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
      OR: [{ userId }, { visibility: "public" }],
    },
    select: storySelect,
  });

  return story ? mapStoryRecord(story) : null;
}

export async function getStoryPlayableById(id: string, userId: string) {
  return getPlayableStoryById(id, userId);
}

export async function getStoryProfileById(
  id: string,
  userId?: string | null,
): Promise<StoryProfileRecord | null> {
  const story = await prisma.story.findFirst({
    where: {
      id,
      OR: userId ? [{ userId }, { visibility: "public" }] : [{ visibility: "public" }],
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

export async function listStoriesForUser(userId: string): Promise<UserStoryListItem[]> {
  const stories = await prisma.story.findMany({
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
  });

  return stories.map((story) => ({
    id: story.id,
    source: "story",
    title: story.title,
    summary: story.summary,
    visibility: story.visibility,
    publishedAt: story.publishedAt ?? null,
    updatedAt: story.updatedAt,
  }));
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

export async function saveStoryPlayableForUser(story: Story, userId: string) {
  const existingStory = await getOwnedStoryById(story.id, userId);

  if (!existingStory) {
    return null;
  }

  return updateStoryForUser(story, userId);
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

export async function createSessionFromStory(params: {
  storyId: string;
  characterId?: string | null;
  customCharacter?: CustomSessionCharacter | null;
  userId: string;
}) {
  const story = await prisma.story.findFirst({
    where: {
      id: params.storyId,
      OR: [{ userId: params.userId }, { visibility: "public" }],
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

  const playableStory = mapStoryRecord(story);
  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      storyId: story.id,
      storyCharacterId,
      turnCount: 0,
      pov: story.pov,
      ...buildSessionSnapshot(playableStory, selectedCharacter),
      previousResponseId: "",
    },
    include: recentTurnsInclude,
  });

  return mapSession(session);
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

  const snapshot = buildSnapshotPlayable(session);
  const story = session.story ? mapStoryRecord(session.story) : null;
  const playableStory = snapshot?.playableStory ?? (story ? toPlayableStory(story) : null);

  if (!playableStory) {
    return null;
  }

  const storyCharacter = session.storyCharacter ? mapCharacter(session.storyCharacter) : null;
  const fallbackCharacter =
    snapshot?.character ??
    storyCharacter ??
    playableStory.playerCharacters.find((item) => item.id === session.storyCharacterId) ??
    null;

  return {
    session: mapSession(session),
    playableStory,
    character: fallbackCharacter,
  };
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
      storyId: true,
      storyTitle: true,
      characterName: true,
      turnCount: true,
      updatedAt: true,
      story: {
        select: {
          title: true,
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
    storyId: session.storyId ?? null,
    storyTitle: session.storyTitle ?? session.story?.title ?? "Untitled Story",
    characterName: session.characterName ?? session.storyCharacter?.name ?? "",
    turnCount: session.turnCount,
    updatedAt: session.updatedAt,
  }));
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
