import { StoryCard } from "@/lib/types";

export const NON_CHARACTER_ACTIVE_STORY_CARD_LIMIT = 4;
const OPENING_LOCATION_CORE_CARD_LIMIT = 2;
const OPENING_STORY_EVENT_CORE_CARD_LIMIT = 1;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function countKeywordMatches(keywords: string[], haystack: string) {
  return keywords.reduce((count, keyword) => {
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword) {
      return count;
    }

    return haystack.includes(normalizedKeyword) ? count + 1 : count;
  }, 0);
}

function buildCardMatchHaystack(params: {
  playerAction: string;
  rollingSummary: string;
  recentTurns: Array<{
    playerAction: string;
    storyText: string;
  }>;
}) {
  return normalizeText(
    [
      params.playerAction,
      params.rollingSummary,
      ...params.recentTurns.flatMap((turn) => [turn.playerAction, turn.storyText]),
    ].join("\n"),
  );
}

export function selectActiveStoryCards(params: {
  storyCards: StoryCard[];
  playerAction: string;
  rollingSummary: string;
  recentTurns: Array<{
    playerAction: string;
    storyText: string;
  }>;
}) {
  const haystack = buildCardMatchHaystack({
    playerAction: params.playerAction,
    rollingSummary: params.rollingSummary,
    recentTurns: params.recentTurns,
  });

  const characterCards = params.storyCards.filter((card) => card.type === "character");
  const matchingNonCharacterCards = params.storyCards
    .map((card, index) => ({
      card,
      index,
      score:
        card.type === "character" ? 0 : countKeywordMatches(card.triggerKeywords, haystack),
    }))
    .filter((entry) => entry.card.type !== "character" && entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    })
    .slice(0, NON_CHARACTER_ACTIVE_STORY_CARD_LIMIT)
    .map((entry) => entry.card);

  return [...characterCards, ...matchingNonCharacterCards];
}

export function selectCoreStoryCards(storyCards: StoryCard[]) {
  const characterCards = storyCards.filter((card) => card.type === "character");
  const locationCards = storyCards
    .filter((card) => card.type === "location")
    .slice(0, OPENING_LOCATION_CORE_CARD_LIMIT);
  const storyEventCards = storyCards
    .filter((card) => card.type === "story_event")
    .slice(0, OPENING_STORY_EVENT_CORE_CARD_LIMIT);

  return [...characterCards, ...locationCards, ...storyEventCards];
}
