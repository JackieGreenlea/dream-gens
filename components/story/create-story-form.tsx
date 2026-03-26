"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { StoryReviewSkeletonScreen } from "@/components/ui/loading";
import { Story } from "@/lib/types";

export function CreateStoryForm() {
  const router = useRouter();
  const [premise, setPremise] = useState("");
  const [tone, setTone] = useState("");
  const [setting, setSetting] = useState("");
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
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          premise,
          tone,
          setting,
          themes,
        }),
      });

      const data = (await response.json()) as {
        world?: Story;
        error?: string;
      };
      const compiledStory = data.world;

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20compile%20and%20save%20a%20story.");
        return;
      }

      if (!response.ok || !compiledStory) {
        throw new Error(data.error || "The story compiler could not finish this request.");
      }

      router.push(`/stories/${compiledStory.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while compiling your story.",
      );
    } finally {
      setIsCompiling(false);
    }
  }

  return (
    isCompiling ? (
      <StoryReviewSkeletonScreen message="Compiling your story..." />
    ) : (
    <Card className="p-5 sm:p-8">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <fieldset disabled={isCompiling} className="space-y-6 disabled:opacity-100">
          <Field
            label="Story premise"
            hint="Start messy. The compiler will turn it into a structured, editable story setup."
          >
            <Textarea
              required
              value={premise}
              onChange={(event) => setPremise(event.target.value)}
              placeholder="A fallen sky city keeps drifting over rival kingdoms while the only map to its engine room is hidden in a musician's memory..."
              className="min-h-48"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Tone">
              <Input
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                placeholder="elegant, tense, mythic"
              />
            </Field>
            <Field label="Setting">
              <Input
                value={setting}
                onChange={(event) => setSetting(event.target.value)}
                placeholder="floating city-state"
              />
            </Field>
            <Field label="Themes">
              <Input
                value={themes}
                onChange={(event) => setThemes(event.target.value)}
                placeholder="memory, loyalty, ambition"
              />
            </Field>
          </div>
        </fieldset>
        {error ? (
          <div className="border-l border-danger/45 pl-4">
            <p className="text-sm font-medium text-foreground">Compilation failed</p>
            <p className="mt-2 text-sm leading-6 text-secondary">{error}</p>
          </div>
        ) : null}
        <Button type="submit" disabled={isCompiling}>
          {isCompiling ? "Compiling story..." : "Compile story"}
        </Button>
      </form>
    </Card>
    )
  );
}
