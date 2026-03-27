import "server-only";

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 32;

const USERNAME_ADJECTIVES = [
  "amber",
  "brisk",
  "cinder",
  "clear",
  "dusky",
  "ember",
  "ivory",
  "lunar",
  "mossy",
  "quiet",
  "silver",
  "velvet",
  "wild",
];

const USERNAME_NOUNS = [
  "atlas",
  "canvas",
  "comet",
  "grove",
  "harbor",
  "lantern",
  "meadow",
  "orbit",
  "quill",
  "signal",
  "studio",
  "thread",
  "vale",
];

export type UserIdentityRecord = {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
};

export function normalizeUsername(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
}

export function isValidUsername(username: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(username);
}

export function getUsernameValidationError(value: string) {
  const normalized = normalizeUsername(value);

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return "Username must be at least 3 characters.";
  }

  if (!isValidUsername(normalized)) {
    return "Username can use lowercase letters, numbers, and single hyphens only.";
  }

  return null;
}

export function buildDisplayNameFromUsername(username: string) {
  return username
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function randomItem<T>(values: readonly T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

function createReadableUsernameBase() {
  return `${randomItem(USERNAME_ADJECTIVES)}-${randomItem(USERNAME_NOUNS)}`;
}

export async function ensureUniqueUsername(
  baseInput?: string | null,
  excludeUserId?: string,
): Promise<string> {
  const preferredBase = normalizeUsername(baseInput ?? "");
  const candidates = new Set<string>();

  if (preferredBase.length >= USERNAME_MIN_LENGTH) {
    candidates.add(preferredBase);
  }

  while (candidates.size < 12) {
    const generatedBase = createReadableUsernameBase();
    candidates.add(generatedBase);
    candidates.add(`${generatedBase}-${Math.floor(Math.random() * 90) + 10}`);
  }

  for (const candidate of candidates) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username: candidate,
        NOT: excludeUserId
          ? {
              id: excludeUserId,
            }
          : undefined,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return candidate;
    }
  }

  return `${createReadableUsernameBase()}-${Math.floor(Math.random() * 9000) + 1000}`;
}

export function isUniqueConstraintError(error: unknown) {
  return error instanceof PrismaClientKnownRequestError && error.code === "P2002";
}
