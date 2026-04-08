"use client";

import { sampleWorlds } from "@/lib/sampleData";
import { PlayerCharacter, Session, SessionTurn, StoryPov, World } from "@/lib/types";
import { createId } from "@/lib/utils";

const WORLDS_KEY = "story-world-studio.worlds";
const SESSIONS_KEY = "story-world-studio.sessions";
const MAX_SESSION_TURNS = 10;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  const value = window.localStorage.getItem(key);

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

type StoredWorld = Omit<World, "victoryEnabled" | "defeatEnabled"> &
  Partial<Pick<World, "victoryEnabled" | "defeatEnabled">>;

type LegacyStoredCharacter = Partial<PlayerCharacter>;

type LegacyStoredSession = Partial<Session> & {
  turns?: SessionTurn[];
};

function normalizePov(value: string | undefined): StoryPov {
  if (value === "first_person" || value === "third_person") {
    return value;
  }

  return "second_person";
}

function withLength(values: string[], fallback: string[]) {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);

  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2);
  }

  const nextValues = [...cleaned];

  for (const value of fallback) {
    if (nextValues.length >= 2) {
      break;
    }

    if (!nextValues.includes(value)) {
      nextValues.push(value);
    }
  }

  return nextValues.slice(0, 2);
}

function normalizeCharacter(character: LegacyStoredCharacter): PlayerCharacter {
  return {
    id: character.id ?? createId("pc"),
    name: character.name ?? "Unnamed Character",
    description: character.description ?? "No description provided.",
    strengths: withLength(character.strengths ?? [], [
      "Useful local leverage",
      "Keeps moving under pressure",
    ]),
    weaknesses: withLength(character.weaknesses ?? [], [
      "Keeps too much to themself",
      "Has a vulnerable pressure point",
    ]),
  };
}

function normalizeWorld(world: StoredWorld): World {
  return {
    ...world,
    pov: normalizePov(world.pov),
    victoryEnabled: world.victoryEnabled ?? true,
    defeatEnabled: world.defeatEnabled ?? true,
    playerCharacters: world.playerCharacters.map(normalizeCharacter),
  };
}

function normalizeSession(session: LegacyStoredSession): Session {
  const normalizedTurns =
    session.turns?.map((turn, index) => ({
      turnNumber: turn.turnNumber ?? index + 1,
      playerAction: turn.playerAction ?? "",
      storyText: turn.storyText ?? "",
      suggestedActions: (turn.suggestedActions ?? []).slice(0, 3),
    })) ?? [];

  return {
    id: session.id ?? createId("session"),
    worldId: session.worldId ?? "",
    characterId: session.characterId ?? "",
    turnCount: session.turnCount ?? normalizedTurns.length,
    objective: session.objective ?? "",
    pov: normalizePov(session.pov),
    previousResponseId: session.previousResponseId ?? "",
    turns: normalizedTurns.slice(-MAX_SESSION_TURNS),
  };
}

export function getWorlds(): World[] {
  const storedWorlds = readJson<StoredWorld[]>(WORLDS_KEY, []);

  if (storedWorlds.length === 0) {
    writeJson(WORLDS_KEY, sampleWorlds);
    return sampleWorlds;
  }

  return storedWorlds.map(normalizeWorld);
}

export function getWorldById(id: string) {
  return getWorlds().find((world) => world.id === id) ?? null;
}

export function saveWorld(world: World) {
  const worlds = getWorlds();
  const nextWorlds = worlds.some((item) => item.id === world.id)
    ? worlds.map((item) => (item.id === world.id ? world : item))
    : [world, ...worlds];

  writeJson(WORLDS_KEY, nextWorlds);
  return world;
}

export function createSession(worldId: string, characterId: string) {
  const sessions = readJson<LegacyStoredSession[]>(SESSIONS_KEY, []).map(normalizeSession);
  const world = getWorldById(worldId);
  const session: Session = {
    id: createId("session"),
    worldId,
    characterId,
    turnCount: 0,
    objective: world?.objective ?? "",
    pov: normalizePov(world?.pov),
    previousResponseId: "",
    turns: [],
  };

  writeJson(SESSIONS_KEY, [session, ...sessions]);
  return session;
}

export function getSessionById(id: string) {
  const sessions = readJson<LegacyStoredSession[]>(SESSIONS_KEY, []).map(normalizeSession);
  return sessions.find((session) => session.id === id) ?? null;
}

export function saveSession(session: Session) {
  const sessions = readJson<LegacyStoredSession[]>(SESSIONS_KEY, []).map(normalizeSession);
  const trimmedSession: Session = {
    ...session,
    turns: session.turns.slice(-MAX_SESSION_TURNS),
  };
  const nextSessions = sessions.some((item) => item.id === session.id)
    ? sessions.map((item) => (item.id === session.id ? trimmedSession : item))
    : [trimmedSession, ...sessions];

  writeJson(SESSIONS_KEY, nextSessions);
  return trimmedSession;
}
