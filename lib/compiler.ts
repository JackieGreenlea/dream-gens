import { CompiledStoryOutput, CompileRequest } from "@/lib/schemas";
import { COMPILER_GENRE_TAG_OPTIONS, normalizeStoryTags } from "@/lib/story-tags";
import { Story } from "@/lib/types";
import { createId } from "@/lib/utils";



//- It should have a hook.
//- Write the summary as immersive, consumer-facing story copy.
//- Lead with the player’s role and the central tension, then make it dramatic.
//- Avoid sounding like generic back-cover copy or a detached overview.
//- Avoid bland synopsis language like "must respond", "very different", "work against", "navigate", or "find themselves".

//Ground it in specifics of the story, while building urgency and making the stakes known

//PERFECT
//Summary:
//Write an enticing, punchy story summary with a strong hook.Prefer leading with the player character's role.Make it clear, specific, and emotionally compelling. Focus on the player character, the core conflict, and what makes the story feel exciting or irresistible. Keep it concise. Avoid clichés, vagueness, overexplaining, and generic epic language.Prefer second person ("you", "your") when it fits the premise.

export const COMPILER_SYSTEM_PROMPT = `You are Everplot's story compiler.

Your job is to turn a rough story idea into a structured, playable story setup.



Core priorities:
- Preserve the user's specific non-negotiables, named people, relationships, factions, settings, and emotional dynamics.



Field guidance:

Tags:
- Return exactly 1 relevant genre tag.
- Choose from this list only: ${COMPILER_GENRE_TAG_OPTIONS.join(", ")}.
- Pick the single best-fit genre tag for browsing and discovery.

Title:
- Compelling and genre-appropriate.

Summary:
Write an enticing story premise with a strong hook.
The premise should make the user eager to select this story.
It should read like back cover copy.
Make it clear, specific, and emotionally compelling. 

Avoid clichés, vagueness, overexplaining, and generic epic language.


Background:
Write an attention-grabbing setup that immediately pulls the reader in.
Provide specific details about the setting and time period where possible.
Explain what led up to the present situation.
Provide specifics about the situation without giving away plot details.
Be specific and concise.
Naturally build toward the story’s starting pressure, leaving room for the reader to act.
Prefer second person when grounding the player character and their situation.
Prefer 3-5 paragraphs.
Avoid dry exposition, excessive lore, and generic epic phrasing.

RuntimeBackground:
- Write a compact version of the background for the runtime model, not for the reader.
- Keep it short, direct, and factual.
- Use neutral reference language instead of directly addressing the player as "you."
- Use placeholders when needed, such as {{userCharacterName}}, {{userCharacter}}, or {{userCharacterPossessive}}.
- Preserve the key setup, relationships, and the starting pressure.
- Prefer 1-3 short paragraphs.

Objective:
- Concrete, actionable, and tied to the main tension.
- Avoid vague or purely thematic objectives.
- The player should understand what they are trying to do.
- If there is exactly one playable character, Objective may be specific to that protagonist.
- If there are two or more playable characters, Objective must stay general enough to make sense for any listed playable character.

ToneStyle:
- Short description of the story's tone and writing style.
- Keep it concise, practical, and usable by downstream systems.

StoryCards:
- Return a compact set of persistent story cards for the most important recurring elements.
- Use only these card types: character, location, faction, story_event.
- Include cards only for elements that are likely to matter again during play.
- Include exactly 3 to 5 cards of type story_event.
- story_event cards should represent major turning points, revelations, incidents, or looming developments that may recur or echo during play.
- Each card needs a clear title, a concise description, and useful trigger keywords.
- Character cards may also include an optional short role field, such as MMC, love interest, rival, best friend, mentor, or antagonist.
- Always return the role field. Use an empty string when no role label applies.
- Keep trigger keywords short and searchable.

PlayerCharacters:
- Aim for 1-3 distinct playable characters by default.
- If the user's premise clearly centers one protagonist, return only that character, and preserve them faithfully.
- Do not make love interests, rivals, antagonists, or major side characters playable unless the premise clearly calls for it.
- Character descriptions should be written in 3rd person.
- Character description should be a meaningful background story and include the character's life story and motive.
- Each player character should include exactly 2 strengths and exactly 2 weaknesses.
- Strengths and weaknesses should feel story-relevant, character-specific, and dramatically useful.


VictoryCondition / DefeatCondition:
- Keep them concrete and game-relevant.
- They should reflect the actual stakes of the premise, not generic success/failure language.
- Prefer 1 short sentence each.

General rules:
- Keep the writing specific and compelling.
- Preserve the spirit and details of the user's story idea.
- Do not sanitize tension, possessiveness, danger, mystery, or unusual dynamics if they are clearly part of the concept.
- Do not drift into generic filler language that could fit any setting.
- Keep the response strictly inside the requested schema.
- Prefer enticing narrative setup over explanatory exposition.
- Write to hook curiosity, not to fully explain everything.`;

export const COMPILER_DEVELOPER_PROMPT = `Design notes:
- Preserve specific details from the premise whenever possible.
- Favor scenes, pressure, and player agency over encyclopedia-style lore.


Compile the user's story premise into a structured Story object.`;
//LOOK INTO THE ABOVE LINE


//- firstAction is the player's hidden first move, not assistant narration or an opening cutscene.
//- Keep the summary tight, vivid, and specific, but do not clip it so hard that the hook feels cut off.

function formatOptionalField(label: string, value: string) {
  return value.trim() ? `${label}: ${value.trim()}` : `${label}: none provided`;
}

function normalizeCharacterId(id: string) {
  const normalized = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    return createId("pc");
  }

  return normalized.startsWith("pc-") ? normalized : `pc-${normalized}`;
}

function normalizeStoryCardId(id: string) {
  const normalized = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    return createId("card");
  }

  return normalized.startsWith("card-") ? normalized : `card-${normalized}`;
}

export function buildCompilerUserPrompt(input: CompileRequest) {
  return [
    `Premise: ${input.premise.trim()}`,
    "",
    formatOptionalField("Tone", input.tone),
    formatOptionalField("Setting", input.setting),
    formatOptionalField("Themes", input.themes),
  ].join("\n");
}

export function normalizeCompiledStory(output: CompiledStoryOutput): Story {
  const usedCharacterIds = new Set<string>();
  const usedCardIds = new Set<string>();
  const toneStyle = output.toneStyle.trim();

  return {
    id: createId("story"),
    tags: normalizeStoryTags(output.tags),
    title: output.title.trim(),
    summary: output.summary.trim(),
    background: output.background.trim(),
    runtimeBackground: output.runtimeBackground.trim(),
    firstAction: output.firstAction.trim(),
    objective: output.objective.trim(),
    pov: "second_person",
    instructions: "",
    toneStyle,
    authorStyle: toneStyle,
    storyCards: output.storyCards.map((card: CompiledStoryOutput["storyCards"][number]) => {
      let nextId = normalizeStoryCardId(card.id);

      while (usedCardIds.has(nextId)) {
        nextId = createId("card");
      }

      usedCardIds.add(nextId);

      return {
        id: nextId,
        type: card.type,
        title: card.title.trim(),
        description: card.description.trim(),
        role: card.type === "character" ? (card.role ?? "").trim() : "",
        triggerKeywords: [
          ...new Set(
            card.triggerKeywords
              .map((keyword: string) => keyword.trim())
              .filter(Boolean),
          ),
        ],
      };
    }),
    victoryCondition: output.victoryCondition.trim(),
    victoryEnabled: true,
    defeatCondition: output.defeatCondition.trim(),
    defeatEnabled: true,
    visibility: "private",
    slug: null,
    publishedAt: null,
    coverImageUrl: null,
    playerCharacters: output.playerCharacters.map(
      (character: CompiledStoryOutput["playerCharacters"][number]) => {
      let nextId = normalizeCharacterId(character.id);

      while (usedCharacterIds.has(nextId)) {
        nextId = createId("pc");
      }

      usedCharacterIds.add(nextId);

      return {
        id: nextId,
        name: character.name.trim(),
        description: character.description.trim(),
        strengths: character.strengths.map((strength: string) => strength.trim()),
        weaknesses: character.weaknesses.map((weakness: string) => weakness.trim()),
      };
      },
    ),
  };
}
