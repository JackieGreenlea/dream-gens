import { StoryCard } from "@/lib/types";

export const NON_CHARACTER_ACTIVE_STORY_CARD_LIMIT = 4;
const OPENING_CHARACTER_CORE_CARD_LIMIT = 2;
const OPENING_LOCATION_CORE_CARD_LIMIT = 1;
const OPENING_STORY_EVENT_CORE_CARD_LIMIT = 1;
const ACTIVE_CHARACTER_CARD_LIMIT = 2;
const ACTIVE_LOCATION_CARD_LIMIT = 1;
const ACTIVE_FACTION_CARD_LIMIT = 1;
const ACTIVE_STORY_EVENT_CARD_LIMIT = 2;

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

function buildSearchTerms(card: StoryCard) {
  return [
    card.title,
    card.role ?? "",
    ...card.triggerKeywords,
  ];
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

  const scoredCards = params.storyCards
    .map((card, index) => ({
      card,
      index,
      score: countKeywordMatches(buildSearchTerms(card), haystack),
    }));

  const matchingCharacterCards = scoredCards
    .filter((entry) => entry.card.type === "character" && entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    })
    .slice(0, ACTIVE_CHARACTER_CARD_LIMIT)
    .map((entry) => entry.card);
  const fallbackCharacterCards =
    matchingCharacterCards.length > 0
      ? []
      : params.storyCards
          .filter((card) => card.type === "character")
          .slice(0, 1);
  const matchingNonCharacterCards = scoredCards
    .filter((entry) => entry.card.type !== "character" && entry.score > 0)
    .sort((left, right) => {
      const leftPriorityBonus = left.card.type === "story_event" ? 1 : 0;
      const rightPriorityBonus = right.card.type === "story_event" ? 1 : 0;

      if (right.score + rightPriorityBonus !== left.score + leftPriorityBonus) {
        return (right.score + rightPriorityBonus) - (left.score + leftPriorityBonus);
      }

      return left.index - right.index;
    })
    .map((entry) => entry.card);
  const selectedLocations = matchingNonCharacterCards
    .filter((card) => card.type === "location")
    .slice(0, ACTIVE_LOCATION_CARD_LIMIT);
  const selectedFactions = matchingNonCharacterCards
    .filter((card) => card.type === "faction")
    .slice(0, ACTIVE_FACTION_CARD_LIMIT);
  const selectedStoryEvents = matchingNonCharacterCards
    .filter((card) => card.type === "story_event")
    .slice(0, ACTIVE_STORY_EVENT_CARD_LIMIT);
  const activeNonCharacterCards = [
    ...selectedLocations,
    ...selectedFactions,
    ...selectedStoryEvents,
  ].slice(0, NON_CHARACTER_ACTIVE_STORY_CARD_LIMIT);

  return [...matchingCharacterCards, ...fallbackCharacterCards, ...activeNonCharacterCards];
}

export function selectCoreStoryCards(storyCards: StoryCard[]) {
  const characterCards = storyCards
    .filter((card) => card.type === "character")
    .slice(0, OPENING_CHARACTER_CORE_CARD_LIMIT);
  const locationCards = storyCards
    .filter((card) => card.type === "location")
    .slice(0, OPENING_LOCATION_CORE_CARD_LIMIT);
  const storyEventCards = storyCards
    .filter((card) => card.type === "story_event")
    .slice(0, OPENING_STORY_EVENT_CORE_CARD_LIMIT);

  return [...characterCards, ...locationCards, ...storyEventCards];
}
