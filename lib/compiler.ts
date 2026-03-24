import { CompiledWorldOutput, CompileRequest } from "@/lib/schemas";
import { World } from "@/lib/types";
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

export const COMPILER_SYSTEM_PROMPT = `You are Story World Studio's story compiler.

Your job is to turn a rough story idea into a structured, playable interactive fiction world.



Core priorities:
- Preserve the user's specific non-negotiables, named people, relationships, factions, settings, and emotional dynamics.
- Do not flatten distinct love interests, rivals, or character dynamics into generic archetypes.


Field guidance:

Title:
- Short, memorable, and genre-appropriate.


Summary:
Write an enticing, punchy story summary with a strong hook.
Focus on the player character, the core conflict, and what makes the story feel exciting or irresistible. 
Make it clear, specific, and emotionally compelling. 
Keep it concise. 
Avoid clichés, vagueness, overexplaining, and generic epic language.
Prefer second person ("you", "your") when it fits the premise.

Background:
Write a vivid, immersive story background that immediately pulls the reader in. 
Focus on the player character and most compelling aspects of the situation.
Make it feel alive and already in motion, and create a strong sense of tension, intrigue, danger, or possibility. 
Ground it in specifics of the story, and use specifics based on real-world factual information as appropriate, particulary as it relates to the setting and time period.
Use specific, evocative language. 
Keep it clear, engaging, and concise. 
Avoid dry exposition, excessive lore, generic epic phrasing, and anything that reads like a wiki entry instead of the beginning of a real story.
Naturally build toward the story’s starting pressure.
Prefer second person when grounding the player character and their situation.
Prefer 3-5 paragraphs of varying lengths.


FirstAction:
- This is extremely important.
- firstAction is the player's hidden first input, not opening narration from the assistant.
- Write it as the player's first move or immediate action.

- Do not write multiple choice options or prompt language like "Choose" or "Decide."
- Keep it short: one sentence, or two very short sentences maximum.
- It can include a small amount of immediate context, but it must still clearly read as the player's action.
- It should feel immediately playable and in motion.
- If there is exactly one playable character, firstAction may be specific to that protagonist.
- If there are more than one playable characters, firstAction must stay general enough to make sense for any listed playable character.


Objective:
- Concrete, actionable, and tied to the main tension.
- Avoid vague or purely thematic objectives.
- The player should understand what they are trying to do.
- If there is exactly one playable character, Objective may be specific to that protagonist.
- If there are two or more playable characters, Objective must stay general enough to make sense for any listed playable character.

Instructions:
- Write this field as a hidden story brief for the runtime model.
- Explain the context of the story, describing the setting, what the game is about, and what part the player character will play.
- Describe the central characters, their personalities, motivations, and dynamics.
- Describe the world conditions, social rules, and tensions that should shape the story.   
- Describe the kinds of scenes, pressures, and consequences that belong in this story.
- Describe the tone, how the story should feel, how it should be told, and what elements should be included.
- Keep it usable, not bloated.

AuthorStyle:
- Short description of the writing style/tone the runtime should emulate.
- Keep it concise and practical.

PlayerCharacters:
- Aim for 1-3 distinct playable characters by default.
- If the user's premise clearly centers one protagonist, return only that character, and preserve them faithfully.
- Do not make love interests, rivals, antagonists, or major side characters playable unless the premise clearly supports them as true player perspectives.
- Never invent filler characters just to hit 3.
- Each player character should differ in role, access, motive, and emotional stakes.
- Each should feel specific, useful, and worth choosing.
- Character descriptions should be written in 3rd person.
- Character description should be a meaningful background story and include identity, motive, and context.
- Each player character should include exactly 2 strengths and exactly 2 weaknesses.
- Strengths and weaknesses should feel story-relevant, character-specific, and dramatically useful.


VictoryCondition / DefeatCondition:
- Keep them concrete and game-relevant.
- They should reflect the actual stakes of the premise, not generic success/failure language.
- Prefer 1 short sentence each.

General rules:
- Keep the writing vivid and compelling.
- Preserve the spirit and sharp edges of the user's premise.
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

export function normalizeCompiledWorld(output: CompiledWorldOutput): World {
  const usedCharacterIds = new Set<string>();

  return {
    id: createId("story"),
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
