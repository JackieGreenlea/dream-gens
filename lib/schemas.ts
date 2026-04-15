import { z } from "zod";
import { COMPILER_GENRE_TAG_OPTIONS, normalizeStoryTags } from "@/lib/story-tags";

const povSchema = z.enum(["second_person", "first_person", "third_person"]);
const optionalCompilerFieldSchema = z.string().trim().max(400).optional().default("");
const optionalCompilerPreferenceFieldSchema = z.string().trim().max(800).optional().default("");
const optionalStoryLinkSchema = z.string().trim().min(1).nullable().optional();
const storyTagSchema = z.string().trim().min(1);
const compilerGenreTagSchema = z.enum(COMPILER_GENRE_TAG_OPTIONS);
const storyCardTypeSchema = z.enum(["character", "location", "faction", "story_event"]);
const scenarioBlueprintIntensitySchema = z.enum(["low", "medium", "high", "explicit"]);
const scenarioBlueprintCharacterRoleSchema = z.enum([
  "primary_counterpart",
  "secondary_counterpart",
  "rival",
  "authority_figure",
  "spouse",
  "observer",
  "protector",
  "threat",
  "supporting",
]);

export const compileRequestSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required."),
  relationshipStructure: optionalCompilerFieldSchema,
  intensityLevel: scenarioBlueprintIntensitySchema.optional().default("medium"),
  vibe: optionalCompilerFieldSchema,
  setting: optionalCompilerFieldSchema,
  playerRole: optionalCompilerFieldSchema,
  include: optionalCompilerPreferenceFieldSchema,
  avoid: optionalCompilerPreferenceFieldSchema,
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
  storyOpeningScene: z.string().trim().nullable().optional(),
  storyRelationshipStructure: z.string().trim().nullable().optional(),
  storyIntensityLevel: scenarioBlueprintIntensitySchema.nullable().optional(),
  storyInstructions: z.string().trim().nullable().optional(),
  storyAuthorStyle: z.string().trim().nullable().optional(),
  storyPov: povSchema.nullable().optional(),
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

const scenarioBlueprintCharacterSchema = z.object({
  id: z.string().trim().min(1),
  role: scenarioBlueprintCharacterRoleSchema,
  archetype: z.string().trim().min(1),
  persona: z.string().trim().min(1),
  dominanceStyle: z.string().trim().min(1),
  emotionalHook: z.string().trim().min(1),
  functionInFantasy: z.string().trim().min(1),
});

const scenarioBlueprintRelationshipDynamicSchema = z.object({
  type: z.string().trim().min(1),
  charactersInvolved: z.array(z.string().trim().min(1)).min(1).max(6),
  description: z.string().trim().min(1),
});

const SCENARIO_BLUEPRINT_SPECIAL_CHARACTER_IDS = new Set(["player"]);

export const scenarioBlueprintSchema = z
  .object({
    coreFantasy: z.string().trim().min(1),
    playerRole: z.string().trim().min(1),
    setting: z.string().trim().min(1),
    startingPressure: z.string().trim().min(1),
    storyPromise: z.string().trim().min(1),
    eroticTone: z.string().trim().min(1),
    intensityLevel: scenarioBlueprintIntensitySchema,
    relationshipStructure: z.string().trim().min(1),
    kinkIncludes: z.array(z.string().trim().min(1)).max(12).default([]),
    hardLimits: z.array(z.string().trim().min(1)).max(12).default([]),
    openingHook: z.string().trim().min(1),
    primaryEroticFocus: z.string().trim().min(1),
    characters: z.array(scenarioBlueprintCharacterSchema).min(1).max(8),
    relationshipDynamics: z
      .array(scenarioBlueprintRelationshipDynamicSchema)
      .min(1)
      .max(12),
    recurringElements: z.object({
      characters: z.array(z.string().trim().min(1)).max(8).default([]),
      locations: z.array(z.string().trim().min(1)).max(8).default([]),
      factions: z.array(z.string().trim().min(1)).max(8).default([]),
      storyEvents: z.array(z.string().trim().min(1)).min(3).max(6),
    }),
  })
  .superRefine((blueprint, context) => {
    const characterIds = new Set([
      ...blueprint.characters.map((character) => character.id),
      ...SCENARIO_BLUEPRINT_SPECIAL_CHARACTER_IDS,
    ]);

    for (const [index, dynamic] of blueprint.relationshipDynamics.entries()) {
      for (const characterId of dynamic.charactersInvolved) {
        if (!characterIds.has(characterId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["relationshipDynamics", index, "charactersInvolved"],
            message: `Relationship dynamics must reference defined character ids. Unknown id: ${characterId}`,
          });
        }
      }
    }

    for (const [index, characterId] of blueprint.recurringElements.characters.entries()) {
      if (!characterIds.has(characterId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recurringElements", "characters", index],
          message: `Recurring character references must use defined character ids. Unknown id: ${characterId}`,
        });
      }
    }
  });

const compiledStorySchemaBase = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1).max(600),
  background: z.string().trim().min(1),
  runtimeBackground: z.string().trim().min(1),
  openingScene: z.string().trim().min(1),
  toneStyle: z.string().trim().min(1),
  relationshipStructure: z.string().trim().min(1),
  intensityLevel: scenarioBlueprintIntensitySchema,
  storyCards: z.array(storyCardSchema).default([]),
  playerCharacters: z.array(playerCharacterSchema).min(1).max(6),
});

export type CompileRequest = z.infer<typeof compileRequestSchema>;
export type ScenarioBlueprintOutput = z.infer<typeof scenarioBlueprintSchema>;
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
    "openingScene",
    "toneStyle",
    "relationshipStructure",
    "intensityLevel",
    "storyCards",
    "playerCharacters",
  ],
  properties: {
    title: { type: "string" },
    summary: { type: "string", maxLength: 600 },
    background: { type: "string" },
    runtimeBackground: { type: "string" },
    openingScene: { type: "string" },
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
    relationshipStructure: { type: "string" },
    intensityLevel: {
      type: "string",
      enum: ["low", "medium", "high", "explicit"],
    },
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

export const scenarioBlueprintJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "coreFantasy",
    "playerRole",
    "setting",
    "startingPressure",
    "storyPromise",
    "eroticTone",
    "intensityLevel",
    "relationshipStructure",
    "kinkIncludes",
    "hardLimits",
    "openingHook",
    "primaryEroticFocus",
    "characters",
    "relationshipDynamics",
    "recurringElements",
  ],
  properties: {
    coreFantasy: { type: "string" },
    playerRole: { type: "string" },
    setting: { type: "string" },
    startingPressure: { type: "string" },
    storyPromise: { type: "string" },
    eroticTone: { type: "string" },
    intensityLevel: {
      type: "string",
      enum: ["low", "medium", "high", "explicit"],
    },
    relationshipStructure: { type: "string" },
    kinkIncludes: {
      type: "array",
      items: { type: "string" },
    },
    hardLimits: {
      type: "array",
      items: { type: "string" },
    },
    openingHook: { type: "string" },
    primaryEroticFocus: { type: "string" },
    characters: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "role",
          "archetype",
          "persona",
          "dominanceStyle",
          "emotionalHook",
          "functionInFantasy",
        ],
        properties: {
          id: { type: "string" },
          role: {
            type: "string",
            enum: [
              "primary_counterpart",
              "secondary_counterpart",
              "rival",
              "authority_figure",
              "spouse",
              "observer",
              "protector",
              "threat",
              "supporting",
            ],
          },
          archetype: { type: "string" },
          persona: { type: "string" },
          dominanceStyle: { type: "string" },
          emotionalHook: { type: "string" },
          functionInFantasy: { type: "string" },
        },
      },
    },
    relationshipDynamics: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "charactersInvolved", "description"],
        properties: {
          type: { type: "string" },
          charactersInvolved: {
            type: "array",
            minItems: 1,
            maxItems: 6,
            items: { type: "string" },
          },
          description: { type: "string" },
        },
      },
    },
    recurringElements: {
      type: "object",
      additionalProperties: false,
      required: ["characters", "locations", "factions", "storyEvents"],
      properties: {
        characters: {
          type: "array",
          items: { type: "string" },
        },
        locations: {
          type: "array",
          items: { type: "string" },
        },
        factions: {
          type: "array",
          items: { type: "string" },
        },
        storyEvents: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: { type: "string" },
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
