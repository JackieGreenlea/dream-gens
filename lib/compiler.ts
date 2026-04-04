import { CompiledWorldOutput, CompileRequest } from "@/lib/schemas";
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

Your job is to turn a rough story idea into a structured, interactive fiction world.



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

Objective:
- Concrete, actionable, and tied to the main tension.
- Avoid vague or purely thematic objectives.
- The player should understand what they are trying to do.
- If there is exactly one playable character, Objective may be specific to that protagonist.
- If there are two or more playable characters, Objective must stay general enough to make sense for any listed playable character.

Instructions:
- Write this field as a hidden story brief for the runtime model.
- Explain the context of the story, describing the setting, what the story is about, and what part the user will play.
- Describe the central characters, their personalities, motivations, and dynamics.
- Describe the kinds of scenes, tensions, and consequences that belong in this story.
- Describe the tone and pacing.
- Keep it usable, not bloated.

AuthorStyle:
- Short description of the writing style/tone the runtime should emulate.
- Keep it concise and practical.

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


Compile the user's story premise into a structured World object.`;
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

export function buildCompilerUserPrompt(input: CompileRequest) {
  return [
    `Premise: ${input.premise.trim()}`,
    "",
    formatOptionalField("Tone", input.tone),
    formatOptionalField("Setting", input.setting),
    formatOptionalField("Themes", input.themes),
  ].join("\n");
}

export function normalizeCompiledWorld(output: CompiledWorldOutput): Story {
  const usedCharacterIds = new Set<string>();

  return {
    id: createId("story"),
    tags: normalizeStoryTags(output.tags),
    title: output.title.trim(),
    summary: output.summary.trim(),
    background: output.background.trim(),
    firstAction: output.firstAction.trim(),
    objective: output.objective.trim(),
    pov: "second_person",
    instructions: output.instructions.trim(),
    authorStyle: output.authorStyle.trim(),
    victoryCondition: output.victoryCondition.trim(),
    victoryEnabled: true,
    defeatCondition: output.defeatCondition.trim(),
    defeatEnabled: true,
    worldId: null,
    visibility: "private",
    slug: null,
    publishedAt: null,
    coverImageUrl: null,
    playerCharacters: output.playerCharacters.map((character) => {
      let nextId = normalizeCharacterId(character.id);

      while (usedCharacterIds.has(nextId)) {
        nextId = createId("pc");
      }

      usedCharacterIds.add(nextId);

      return {
        id: nextId,
        name: character.name.trim(),
        description: character.description.trim(),
        strengths: character.strengths.map((strength) => strength.trim()),
        weaknesses: character.weaknesses.map((weakness) => weakness.trim()),
      };
    }),
  };
}
