import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createWorldCanon } from "@/lib/db";
import { createStructuredOutput } from "@/lib/openai";
import {
  compiledWorldCanonJsonSchema,
  compiledWorldCanonSchema,
  compileWorldCanonRequestSchema,
} from "@/lib/schemas";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureDatabaseUser } from "@/lib/user-sync";
import {
  buildWorldCompilerUserPrompt,
  normalizeCompiledWorldCanon,
  WORLD_COMPILER_DEVELOPER_PROMPT,
  WORLD_COMPILER_SYSTEM_PROMPT,
} from "@/lib/world-compiler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  console.info("[world-compile] start");

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to compile and save a world." }, { status: 401 });
    }

    await ensureDatabaseUser(user);

    const body = await request.json();
    const input = compileWorldCanonRequestSchema.parse(body);
    const rawWorld = await createStructuredOutput<unknown>({
      schemaName: "world_canon",
      schema: compiledWorldCanonJsonSchema,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: WORLD_COMPILER_SYSTEM_PROMPT }],
        },
        {
          role: "developer",
          content: [{ type: "input_text", text: WORLD_COMPILER_DEVELOPER_PROMPT }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: buildWorldCompilerUserPrompt(input) }],
        },
      ],
    });
    let compiledWorld;

    try {
      compiledWorld = compiledWorldCanonSchema.parse(rawWorld);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: "The world compiler returned data that did not match the expected world schema.",
            details: error.flatten(),
          },
          { status: 502 },
        );
      }

      throw error;
    }

    const normalizedWorld = normalizeCompiledWorldCanon(compiledWorld);
    const world = await createWorldCanon(normalizedWorld, user.id);

    if (!world) {
      throw new Error("The compiled world could not be saved.");
    }

    console.info("[world-compile] success", {
      worldId: world.id,
      castCount: world.cast.length,
    });

    return NextResponse.json({ world });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "The world compile request did not match the expected input schema.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unable to compile world.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
