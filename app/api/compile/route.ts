import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createStory } from "@/lib/db";
import {
  buildFinalStoryCompilerUserPrompt,
  buildScenarioBlueprintUserPrompt,
  FINAL_STORY_COMPILER_DEVELOPER_PROMPT,
  FINAL_STORY_COMPILER_SYSTEM_PROMPT,
  normalizeCompiledStory,
  SCENARIO_BLUEPRINT_DEVELOPER_PROMPT,
  SCENARIO_BLUEPRINT_SYSTEM_PROMPT,
} from "@/lib/compiler";
import { createStructuredOutput as createMistralStructuredOutput } from "@/lib/mistral";
import { createStructuredOutput as createOpenAIStructuredOutput } from "@/lib/openai";
import {
  CompiledStoryOutput,
  compiledStoryJsonSchema,
  compiledStorySchema,
  compileRequestSchema,
  ScenarioBlueprintOutput,
  scenarioBlueprintJsonSchema,
  scenarioBlueprintSchema,
} from "@/lib/schemas";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureDatabaseUser } from "@/lib/user-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  console.info("[compile] start");

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign in to compile and save a story." },
        { status: 401 },
      );
    }

    await ensureDatabaseUser(user);

    const body = await request.json();
    const input = compileRequestSchema.parse(body);
    // Job 1: hidden blueprint generation stays on OpenAI.
    const rawBlueprint = await createOpenAIStructuredOutput<unknown>({
      schemaName: "scenario_blueprint",
      schema: scenarioBlueprintJsonSchema,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: SCENARIO_BLUEPRINT_SYSTEM_PROMPT }],
        },
        {
          role: "developer",
          content: [{ type: "input_text", text: SCENARIO_BLUEPRINT_DEVELOPER_PROMPT }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: buildScenarioBlueprintUserPrompt(input) }],
        },
      ],
    });
    let blueprint: ScenarioBlueprintOutput;

    try {
      blueprint = scenarioBlueprintSchema.parse(rawBlueprint);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[compile] blueprint schema failure", error.flatten());

        return NextResponse.json(
          {
            error: "The compiler returned data that did not match the expected scenario blueprint schema.",
            details: error.flatten(),
          },
          { status: 502 },
        );
      }

      throw error;
    }

    // Job 2: final saved story profile generation runs on Mistral.
    const rawStory = await createMistralStructuredOutput<unknown>({
      schemaName: "story",
      schema: compiledStoryJsonSchema,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: FINAL_STORY_COMPILER_SYSTEM_PROMPT }],
        },
        {
          role: "developer",
          content: [{ type: "input_text", text: FINAL_STORY_COMPILER_DEVELOPER_PROMPT }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildFinalStoryCompilerUserPrompt(input, blueprint),
            },
          ],
        },
      ],
    });
    let compiledStory: CompiledStoryOutput;

    try {
      compiledStory = compiledStorySchema.parse(rawStory);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("[compile] schema failure", error.flatten());

        return NextResponse.json(
          {
            error: "The compiler returned data that did not match the expected story schema.",
            details: error.flatten(),
          },
          { status: 502 },
        );
      }

      throw error;
    }

    const normalizedStory = normalizeCompiledStory(compiledStory);
    const story = await createStory(normalizedStory, user.id);

    if (!story) {
      throw new Error("The compiled story could not be saved.");
    }

    console.info("[compile] success", {
      storyId: story.id,
      characterCount: story.playerCharacters.length,
    });

    return NextResponse.json({ story });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("[compile] request schema failure", error.flatten());

      return NextResponse.json(
        {
          error: "The compile request did not match the expected input schema.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to compile story.";
    const status =
      message.includes("OPENAI_API_KEY") || message.includes("MISTRAL_API_KEY") ? 500 : 502;
    console.error("[compile] api failure", { message, status });

    return NextResponse.json({ error: message }, { status });
  }
}
