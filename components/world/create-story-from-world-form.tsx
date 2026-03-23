"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { WorldCanon } from "@/lib/types";

type CreateStoryFromWorldFormProps = {
  world: WorldCanon;
};

export function CreateStoryFromWorldForm({ world }: CreateStoryFromWorldFormProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("");
  const [themes, setThemes] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCompiling) {
      return;
    }

    setError("");
    setIsCompiling(true);

    try {
      const response = await fetch(`/api/worlds/${world.id}/create-story`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          tone,
          themes,
        }),
      });

      const data = (await response.json()) as {
        story?: { id: string };
        error?: string;
      };

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20create%20a%20story%20from%20this%20world.");
        return;
      }

      if (!response.ok || !data.story) {
        throw new Error(data.error || "The story compiler could not finish this request.");
      }

      router.push(`/stories/${data.story.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while creating your story.",
      );
    } finally {
      setIsCompiling(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="space-y-4 p-6 sm:p-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.24em] text-gold">Create Story From World</p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">{world.title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-mist">
            Choose a story angle for this canon world, or leave it blank and let the compiler pick the strongest playable setup.
          </p>
        </div>
      </Card>

      <Card className="p-5 sm:p-8">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <fieldset disabled={isCompiling} className="space-y-6 disabled:opacity-100">
            <Field
              label="Story angle"
              hint="Optional. Describe the kind of story you want to launch inside this world."
            >
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="forbidden romance between rival heirs"
                className="min-h-36"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tone">
                <Input
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  placeholder="lush, intimate, dangerous"
                />
              </Field>
              <Field label="Themes">
                <Input
                  value={themes}
                  onChange={(event) => setThemes(event.target.value)}
                  placeholder="desire, betrayal, inheritance"
                />
              </Field>
            </div>
          </fieldset>

          {isCompiling ? (
            <div className="rounded-3xl border border-gold/20 bg-gold/10 p-4 sm:p-5">
              <p className="text-sm font-medium text-white">Compiling your story</p>
              <p className="mt-2 text-sm leading-6 text-amber-50/80">
                Turning this world canon into a playable Story with a specific setup, opening move, and characters.
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-3xl border border-rose-400/25 bg-rose-400/10 p-4 sm:p-5">
              <p className="text-sm font-medium text-white">Compilation failed</p>
              <p className="mt-2 text-sm leading-6 text-rose-100/90">{error}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isCompiling}>
              {isCompiling ? "Creating story..." : "Create story"}
            </Button>
            <ButtonLink href={`/worlds/${world.id}`} variant="ghost">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
