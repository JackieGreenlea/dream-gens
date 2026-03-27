const TAG_ALIAS_MAP: Record<string, string> = {
  fantasy: "fantasy",
  magic: "magic",
  romance: "romance",
  "film & tv": "film & tv",
  "film and tv": "film & tv",
  "film/tv": "film & tv",
  adventure: "adventure",
  "slice of life": "slice of life",
  "slice-of-life": "slice of life",
  "sci-fi": "sci-fi",
  "sci fi": "sci-fi",
  scifi: "sci-fi",
  "science fiction": "sci-fi",
  superhero: "superhero",
  historical: "historical",
  mystery: "mystery",
  supernatural: "supernatural",
  comedy: "comedy",
};

export const STORY_GENRE_TABS = [
  "ALL",
  "NEW",
  "FANTASY",
  "MAGIC",
  "ROMANCE",
  "FILM & TV",
  "ADVENTURE",
  "SLICE OF LIFE",
  "SCI-FI",
  "SUPERHERO",
  "HISTORICAL",
  "MYSTERY",
  "SUPERNATURAL",
  "COMEDY",
] as const;

export const COMPILER_GENRE_TAG_OPTIONS = [
  "fantasy",
  "magic",
  "romance",
  "film & tv",
  "adventure",
  "slice of life",
  "sci-fi",
  "superhero",
  "historical",
  "mystery",
  "supernatural",
  "comedy",
] as const;

export type StoryGenreTab = (typeof STORY_GENRE_TABS)[number];

function toLooseTag(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/&/g, " & ")
    .replace(/\s+/g, " ");
}

export function normalizeStoryTag(value: string) {
  const normalized = toLooseTag(value);
  return TAG_ALIAS_MAP[normalized] ?? normalized;
}

export function normalizeStoryTags(values: string[], limit = 8) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeStoryTag(value);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

export function storyHasTag(tags: string[] | null | undefined, target: string) {
  const normalizedTarget = normalizeStoryTag(target);
  return normalizeStoryTags(tags ?? []).includes(normalizedTarget);
}

export function formatStoryTagLabel(tag: string) {
  const normalized = normalizeStoryTag(tag);

  switch (normalized) {
    case "film & tv":
      return "FILM & TV";
    case "sci-fi":
      return "SCI-FI";
    default:
      return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
