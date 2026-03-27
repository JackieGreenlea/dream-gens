export type StoryPov = "second_person" | "first_person" | "third_person";
export type StoryVisibility = "private" | "public";

export type PlayerCharacter = {
  id: string;
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
};

export type WorldCastMember = {
  name: string;
  description: string;
  role?: string;
};

export type WorldCanon = {
  id: string;
  title: string;
  shortSummary: string;
  longDescription: string;
  setting: string;
  lore: string;
  history: string;
  rules: string;
  cast: WorldCastMember[];
};

// Real product model:
// - WorldCanon = reusable canon container
// - Story = user-facing setup/template
// - Session = user-facing run/play state
type PlayableStoryFields = {
  id: string;
  title: string;
  summary: string;
  background: string;
  firstAction: string;
  objective: string;
  pov: StoryPov;
  instructions: string;
  authorStyle: string;
  victoryCondition: string;
  victoryEnabled: boolean;
  defeatCondition: string;
  defeatEnabled: boolean;
  playerCharacters: PlayerCharacter[];
};

export type Story = PlayableStoryFields & {
  worldId?: string | null;
  visibility?: StoryVisibility;
  slug?: string | null;
  publishedAt?: string | null;
  coverImageUrl?: string | null;
  tags: string[];
};

// Compatibility shape for routes/components that still expect a world-shaped playable setup.
// The real setup record is Story; World remains only for sample and legacy playable records.
export type World = PlayableStoryFields;

export type Session = {
  id: string;
  worldId?: string | null;
  storyId?: string | null;
  characterId: string;
  turnCount: number;
  objective: string;
  pov: StoryPov;
  storyTitle?: string | null;
  storySummary?: string | null;
  storyBackground?: string | null;
  storyFirstAction?: string | null;
  storyObjective?: string | null;
  storyInstructions?: string | null;
  storyAuthorStyle?: string | null;
  storyPov?: StoryPov | null;
  victoryCondition?: string | null;
  victoryEnabled?: boolean | null;
  defeatCondition?: string | null;
  defeatEnabled?: boolean | null;
  characterName?: string | null;
  characterDescription?: string | null;
  characterStrengths?: string[] | null;
  characterWeaknesses?: string[] | null;
  previousResponseId: string;
  summary: string;
  turns: SessionTurn[];
};

export type CreateWorldInput = {
  premise: string;
  tone?: string;
  setting?: string;
  themes?: string;
};

export type SessionTurn = {
  turnNumber: number;
  playerAction: string;
  storyText: string;
  suggestedActions: string[];
  summaryAfterTurn: string;
};
