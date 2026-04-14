export type StoryPov = "second_person" | "first_person" | "third_person";
export type StoryVisibility = "private" | "public";
export type StoryCardType = "character" | "location" | "faction" | "story_event";

export type PlayerCharacter = {
  id: string;
  name: string;
  description: string;
};

export type StoryCard = {
  id: string;
  type: StoryCardType;
  title: string;
  description: string;
  triggerKeywords: string[];
  role?: string;
};

type PlayableStoryFields = {
  id: string;
  title: string;
  summary: string;
  background: string;
  runtimeBackground: string;
  pov: StoryPov;
  instructions: string;
  toneStyle: string;
  authorStyle: string;
  storyCards: StoryCard[];
  victoryCondition: string;
  victoryEnabled: boolean;
  defeatCondition: string;
  defeatEnabled: boolean;
  playerCharacters: PlayerCharacter[];
};

export type Story = PlayableStoryFields & {
  visibility?: StoryVisibility;
  slug?: string | null;
  publishedAt?: string | null;
  coverImageUrl?: string | null;
  tags: string[];
};

export type PlayableStory = PlayableStoryFields;

export type Session = {
  id: string;
  storyId?: string | null;
  characterId: string;
  turnCount: number;
  pov: StoryPov;
  summary: string;
  inactiveStoryCardIds: string[];
  lastSentStoryCardIds: string[];
  storyTitle?: string | null;
  storySummary?: string | null;
  storyBackground?: string | null;
  storyRuntimeBackground?: string | null;
  storyInstructions?: string | null;
  storyAuthorStyle?: string | null;
  storyPov?: StoryPov | null;
  victoryCondition?: string | null;
  victoryEnabled?: boolean | null;
  defeatCondition?: string | null;
  defeatEnabled?: boolean | null;
  characterName?: string | null;
  characterDescription?: string | null;
  previousResponseId: string;
  turns: SessionTurn[];
};

export type SessionTurn = {
  turnNumber: number;
  playerAction: string;
  storyText: string;
  suggestedActions: string[];
};
