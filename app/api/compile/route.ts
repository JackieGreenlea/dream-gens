import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createStory } from "@/lib/db";
import {
  buildCompilerUserPrompt,
  COMPILER_DEVELOPER_PROMPT,
  COMPILER_SYSTEM_PROMPT,
  normalizeCompiledStory,
} from "@/lib/compiler";
import { createStructuredOutput } from "@/lib/openai";
import {
  compiledStoryJsonSchema,
  compiledStorySchema,
  compileRequestSchema,
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
    const rawStory = await createStructuredOutput<unknown>({
      schemaName: "story",
      schema: compiledStoryJsonSchema,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: COMPILER_SYSTEM_PROMPT }],
        },
        {
          role: "developer",
          content: [{ type: "input_text", text: COMPILER_DEVELOPER_PROMPT }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: buildCompilerUserPrompt(input) }],
        },
      ],
    });
    let compiledStory;

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
    const status = message.includes("OPENAI_API_KEY") ? 500 : 502;
    console.error("[compile] api failure", { message, status });

    return NextResponse.json({ error: message }, { status });
  }
}
