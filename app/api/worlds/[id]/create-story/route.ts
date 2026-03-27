import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { normalizeCompiledWorld } from "@/lib/compiler";
import { createStory, getOwnedWorldCanonById } from "@/lib/db";
import { createStructuredOutput } from "@/lib/openai";
import {
  compiledStoryJsonSchema,
  compiledStorySchema,
  createStoryFromWorldRequestSchema,
} from "@/lib/schemas";
import { createStoryFromWorld } from "@/lib/story";
import {
  buildStoryFromWorldUserPrompt,
  STORY_FROM_WORLD_DEVELOPER_PROMPT,
  STORY_FROM_WORLD_SYSTEM_PROMPT,
} from "@/lib/story-from-world-compiler";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureDatabaseUser } from "@/lib/user-sync";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign in to create a story from this world." },
        { status: 401 },
      );
    }

    await ensureDatabaseUser(user);

    const world = await getOwnedWorldCanonById(id, user.id);

    if (!world) {
      return NextResponse.json({ error: "World not found." }, { status: 404 });
    }

    const body = await request.json();
    const input = createStoryFromWorldRequestSchema.parse(body);
    const rawStory = await createStructuredOutput<unknown>({
      schemaName: "story_from_world",
      schema: compiledStoryJsonSchema,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: STORY_FROM_WORLD_SYSTEM_PROMPT }],
        },
        {
          role: "developer",
          content: [{ type: "input_text", text: STORY_FROM_WORLD_DEVELOPER_PROMPT }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: buildStoryFromWorldUserPrompt(world, input) }],
        },
      ],
    });

    let compiledStory;

    try {
      compiledStory = compiledStorySchema.parse(rawStory);
    } catch (error) {
      if (error instanceof ZodError) {
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

    const normalizedStory = normalizeCompiledWorld(compiledStory);
    const story = await createStory(createStoryFromWorld(normalizedStory, world.id), user.id);

    if (!story) {
      throw new Error("The story could not be saved.");
    }

    return NextResponse.json({ story });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "The create-story request did not match the expected input schema.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to create story.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
