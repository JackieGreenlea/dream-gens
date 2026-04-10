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
  worldId: z.string().trim().min(1).nullable().optional(),
  storyId: optionalStoryLinkSchema,
  characterId: z.string().trim().min(1),
  turnCount: z.number().int().min(0),
  objective: z.string().trim().min(1),
  pov: povSchema.default("second_person"),
  summary: z.string().default(""),
  storyTitle: z.string().trim().nullable().optional(),
  storySummary: z.string().trim().nullable().optional(),
  storyBackground: z.string().trim().nullable().optional(),
  storyFirstAction: z.string().trim().nullable().optional(),
  storyObjective: z.string().trim().nullable().optional(),
  storyInstructions: z.string().trim().nullable().optional(),
  storyAuthorStyle: z.string().trim().nullable().optional(),
  storyPov: povSchema.nullable().optional(),
  victoryCondition: z.string().trim().nullable().optional(),
  victoryEnabled: z.boolean().nullable().optional(),
  defeatCondition: z.string().trim().nullable().optional(),
  defeatEnabled: z.boolean().nullable().optional(),
  characterName: z.string().trim().nullable().optional(),
  characterDescription: z.string().trim().nullable().optional(),
  characterStrengths: z.array(z.string().trim().min(1)).nullable().optional(),
  characterWeaknesses: z.array(z.string().trim().min(1)).nullable().optional(),
  previousResponseId: z.string().default(""),
  turns: z.array(sessionTurnSchema),
});

export const playerCharacterSchema = z.object({
  id: z.string().trim().optional().default(""),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  strengths: z.array(z.string().trim().min(1)).length(2),
  weaknesses: z.array(z.string().trim().min(1)).length(2),
});

export const storyCardSchema = z.object({
  id: z.string().trim().min(1),
  type: storyCardTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  triggerKeywords: z.array(z.string().trim().min(1)).max(12).default([]),
});

const compiledWorldSchemaBase = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1).max(600),
  background: z.string().trim().min(1),
  firstAction: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  toneStyle: z.string().trim().min(1),
  storyCards: z.array(storyCardSchema).default([]),
  victoryCondition: z.string().trim().min(1),
  defeatCondition: z.string().trim().min(1),
  playerCharacters: z.array(playerCharacterSchema).min(1).max(6),
});

export const compiledWorldSchema = compiledWorldSchemaBase.superRefine((output, context) => {
  const storyEventCount = output.storyCards.filter((card) => card.type === "story_event").length;

  if (storyEventCount < 3 || storyEventCount > 5) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storyCards"],
      message: "Compiler output must include between 3 and 5 story_event cards.",
    });
  }
});

export type CompileRequest = z.infer<typeof compileRequestSchema>;
export const compiledStorySchema = compiledWorldSchemaBase.extend({
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

export type CompiledWorldOutput = z.infer<typeof compiledStorySchema>;
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

export const persistedWorldSchema = compiledWorldSchemaBase.extend({
  id: z.string().trim().min(1),
  pov: povSchema.default("second_person"),
  instructions: z.string().trim().default(""),
  toneStyle: z.string().trim().default(""),
  authorStyle: z.string().trim().default(""),
  storyCards: z.array(storyCardSchema).default([]),
  victoryEnabled: z.boolean().default(true),
  defeatEnabled: z.boolean().default(true),
});

export const storySchema = persistedWorldSchema.extend({
  worldId: optionalStoryLinkSchema,
  coverImageUrl: z.string().trim().url().nullable().optional(),
  tags: z.array(storyTagSchema).max(8).default([]).transform((tags) => normalizeStoryTags(tags)),
});

export const worldCastMemberSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  role: z.string().trim().optional().default(""),
});

export const worldCanonSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  shortSummary: z.string().trim().min(1),
  longDescription: z.string().trim().min(1),
  setting: z.string().trim().default(""),
  lore: z.string().trim().default(""),
  history: z.string().trim().default(""),
  rules: z.string().trim().default(""),
  cast: z.array(worldCastMemberSchema).default([]),
});

export const compileWorldCanonRequestSchema = compileRequestSchema;

export const createStoryFromWorldRequestSchema = z.object({
  prompt: z.string().trim().max(600).optional().default(""),
  tone: optionalCompilerFieldSchema,
  themes: optionalCompilerFieldSchema,
});

export const compiledWorldCanonSchema = z.object({
  title: z.string().trim().min(1),
  shortSummary: z.string().trim().min(1).max(400),
  longDescription: z.string().trim().min(1),
  setting: z.string().trim().min(1),
  lore: z.string().trim().min(1),
  history: z.string().trim().min(1),
  rules: z.string().trim().min(1),
  cast: z.array(worldCastMemberSchema).max(12).default([]),
});

export type CompiledWorldCanonOutput = z.infer<typeof compiledWorldCanonSchema>;
export type CreateStoryFromWorldRequest = z.infer<typeof createStoryFromWorldRequestSchema>;

export const customSessionCharacterSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  description: z.string().trim().min(1, "Description is required."),
  strengths: z.array(z.string().trim().min(1)).max(8).default([]),
  weaknesses: z.array(z.string().trim().min(1)).max(8).default([]),
});

export type CustomSessionCharacter = z.infer<typeof customSessionCharacterSchema>;

export const sessionStartRequestSchema = z
  .object({
    worldId: z.string().trim().min(1),
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

export const compiledWorldJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "summary",
    "background",
    "firstAction",
    "objective",
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
    firstAction: { type: "string" },
    objective: { type: "string" },
    toneStyle: { type: "string" },
    storyCards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "title", "description", "triggerKeywords"],
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: ["character", "location", "faction", "story_event"],
          },
          title: { type: "string" },
          description: { type: "string" },
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
        required: ["id", "name", "description", "strengths", "weaknesses"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          strengths: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: {
              type: "string",
            },
          },
          weaknesses: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: {
              type: "string",
            },
          },
        },
      },
    },
  },
} as const;

export const compiledStoryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "summary",
    "background",
    "tags",
    "firstAction",
    "objective",
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
    tags: {
      type: "array",
      minItems: 1,
      maxItems: 1,
      items: {
        type: "string",
        enum: [...COMPILER_GENRE_TAG_OPTIONS],
      },
    },
    firstAction: { type: "string" },
    objective: { type: "string" },
    toneStyle: { type: "string" },
    storyCards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "title", "description", "triggerKeywords"],
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: ["character", "location", "faction", "story_event"],
          },
          title: { type: "string" },
          description: { type: "string" },
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
        required: ["id", "name", "description", "strengths", "weaknesses"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          strengths: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: {
              type: "string",
            },
          },
          weaknesses: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: {
              type: "string",
            },
          },
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

export const compiledWorldCanonJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "shortSummary",
    "longDescription",
    "setting",
    "lore",
    "history",
    "rules",
    "cast",
  ],
  properties: {
    title: { type: "string" },
    shortSummary: { type: "string", maxLength: 400 },
    longDescription: { type: "string" },
    setting: { type: "string" },
    lore: { type: "string" },
    history: { type: "string" },
    rules: { type: "string" },
    cast: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "role"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          role: { type: "string" },
        },
      },
    },
  },
} as const;
