import { z } from "zod";
import { COMPILER_GENRE_TAG_OPTIONS, normalizeStoryTags } from "@/lib/story-tags";

const povSchema = z.enum(["second_person", "first_person", "third_person"]);
const optionalCompilerFieldSchema = z.string().trim().max(400).optional().default("");
const optionalStoryLinkSchema = z.string().trim().min(1).nullable().optional();
const storyTagSchema = z.string().trim().min(1);
const compilerGenreTagSchema = z.enum(COMPILER_GENRE_TAG_OPTIONS);
const storyCardTypeSchema = z.enum(["character", "location", "faction", "story_event"]);

export const compileRequestSchema = z.object({
  premise: z.string().trim().min(1, "Premise is required."),
  tone: optionalCompilerFieldSchema,
  setting: optionalCompilerFieldSchema,
  themes: optionalCompilerFieldSchema,
});

export const sessionTurnSchema = z.object({
  turnNumber: z.number().int().min(1),
  playerAction: z.string().trim(),
  storyText: z.string().trim().min(1),
  suggestedActions: z.array(z.string().trim().min(1)).max(3).default([]),
});

export const sessionSchema = z.object({
  id: z.string().trim().min(1),
  storyId: optionalStoryLinkSchema,
  characterId: z.string().trim().min(1),
  turnCount: z.number().int().min(0),
  pov: povSchema.default("second_person"),
  summary: z.string().default(""),
  storyTitle: z.string().trim().nullable().optional(),
  storySummary: z.string().trim().nullable().optional(),
  storyBackground: z.string().trim().nullable().optional(),
  storyRuntimeBackground: z.string().trim().nullable().optional(),
  storyInstructions: z.string().trim().nullable().optional(),
  storyAuthorStyle: z.string().trim().nullable().optional(),
  storyPov: povSchema.nullable().optional(),
  victoryCondition: z.string().trim().nullable().optional(),
  victoryEnabled: z.boolean().nullable().optional(),
  defeatCondition: z.string().trim().nullable().optional(),
  defeatEnabled: z.boolean().nullable().optional(),
  characterName: z.string().trim().nullable().optional(),
  characterDescription: z.string().trim().nullable().optional(),
  previousResponseId: z.string().default(""),
  turns: z.array(sessionTurnSchema),
});

export const playerCharacterSchema = z.object({
  id: z.string().trim().optional().default(""),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

export const storyCardSchema = z.object({
  id: z.string().trim().min(1),
  type: storyCardTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  triggerKeywords: z.array(z.string().trim().min(1)).max(12).default([]),
  role: z.string().trim().optional().default(""),
});

const compiledStorySchemaBase = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1).max(600),
  background: z.string().trim().min(1),
  runtimeBackground: z.string().trim().min(1),
  toneStyle: z.string().trim().min(1),
  storyCards: z.array(storyCardSchema).default([]),
  victoryCondition: z.string().trim().min(1),
  defeatCondition: z.string().trim().min(1),
  playerCharacters: z.array(playerCharacterSchema).min(1).max(6),
});

export type CompileRequest = z.infer<typeof compileRequestSchema>;
export const compiledStorySchema = compiledStorySchemaBase.extend({
  tags: z.array(compilerGenreTagSchema).length(1),
}).superRefine((output, context) => {
  const storyEventCount = output.storyCards.filter((card) => card.type === "story_event").length;

  if (storyEventCount < 3 || storyEventCount > 5) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storyCards"],
      message: "Compiler output must include between 3 and 5 story_event cards.",
    });
  }
});

export type CompiledStoryOutput = z.infer<typeof compiledStorySchema>;
export type StoredSession = z.infer<typeof sessionSchema>;

export const runtimeTurnOutputSchema = z.object({
  storyText: z.string().trim().min(1),
});

export type RuntimeTurnOutput = z.infer<typeof runtimeTurnOutputSchema>;

export const runtimeTurnFinalizationOutputSchema = z.object({
  suggestedActions: z.array(z.string().trim().min(1)).min(2).max(3),
});

export type RuntimeTurnFinalizationOutput = z.infer<typeof runtimeTurnFinalizationOutputSchema>;

export const runtimeTurnRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
  playerAction: z.string().trim().min(1),
});

export const sessionSuggestedActionsRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
});

export const persistedStorySchema = compiledStorySchemaBase.extend({
  id: z.string().trim().min(1),
  pov: povSchema.default("second_person"),
  instructions: z.string().trim().default(""),
  toneStyle: z.string().trim().default(""),
  authorStyle: z.string().trim().default(""),
  storyCards: z.array(storyCardSchema).default([]),
  victoryEnabled: z.boolean().default(true),
  defeatEnabled: z.boolean().default(true),
});

export const storySchema = persistedStorySchema.extend({
  coverImageUrl: z.string().trim().url().nullable().optional(),
  tags: z.array(storyTagSchema).max(8).default([]).transform((tags) => normalizeStoryTags(tags)),
});

export const customSessionCharacterSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  description: z.string().trim().min(1, "Description is required."),
});

export type CustomSessionCharacter = z.infer<typeof customSessionCharacterSchema>;

export const sessionStartRequestSchema = z
  .object({
    storyId: z.string().trim().min(1),
    characterId: z.string().trim().min(1).optional(),
    customCharacter: customSessionCharacterSchema.optional(),
  })
  .superRefine((input, context) => {
    if (input.characterId && input.customCharacter) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose either a generated character or a custom character, not both.",
        path: ["characterId"],
      });
    }

    if (!input.characterId && !input.customCharacter) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A character selection is required.",
        path: ["characterId"],
      });
    }
  });

export const compiledStoryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "summary",
    "background",
    "tags",
    "runtimeBackground",
    "toneStyle",
    "storyCards",
    "victoryCondition",
    "defeatCondition",
    "playerCharacters",
  ],
  properties: {
    title: { type: "string" },
    summary: { type: "string", maxLength: 600 },
    background: { type: "string" },
    runtimeBackground: { type: "string" },
    tags: {
      type: "array",
      minItems: 1,
      maxItems: 1,
      items: {
        type: "string",
        enum: [...COMPILER_GENRE_TAG_OPTIONS],
      },
    },
    toneStyle: { type: "string" },
    storyCards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "title", "description", "role", "triggerKeywords"],
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: ["character", "location", "faction", "story_event"],
          },
          title: { type: "string" },
          description: { type: "string" },
          role: { type: "string" },
          triggerKeywords: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      },
    },
    victoryCondition: { type: "string" },
    defeatCondition: { type: "string" },
    playerCharacters: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "description"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
        },
      },
    },
  },
} as const;

export const runtimeTurnJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["storyText"],
  properties: {
    storyText: { type: "string" },
  },
} as const;

export const runtimeTurnFinalizationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["suggestedActions"],
  properties: {
    suggestedActions: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "string",
      },
    },
  },
} as const;
