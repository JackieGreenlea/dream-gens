"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StoryReviewSkeletonScreen } from "@/components/ui/loading";
import { Story, StoryIntensityLevel } from "@/lib/types";

type CreateMode = "quick" | "advanced";

const INTENSITY_OPTIONS: Array<{ value: StoryIntensityLevel; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "explicit", label: "Explicit" },
];

const RELATIONSHIP_STRUCTURE_OPTIONS = [
  { value: "", label: "Choose a structure" },
  { value: "one_to_one", label: "One to one" },
  { value: "love_triangle", label: "Love triangle" },
  { value: "multiple_competitors", label: "Multiple competitors" },
  { value: "power_hierarchy", label: "Power hierarchy" },
  { value: "harem", label: "Harem" },
  { value: "reverse_harem", label: "Reverse harem" },
  { value: "polycule", label: "Polycule" },
] as const;

export function CreateStoryForm() {
  const router = useRouter();
  const [mode, setMode] = useState<CreateMode>("quick");
  const [prompt, setPrompt] = useState("");
  const [relationshipStructure, setRelationshipStructure] = useState("");
  const [intensityLevel, setIntensityLevel] = useState<StoryIntensityLevel>("medium");
  const [vibe, setVibe] = useState("");
  const [setting, setSetting] = useState("");
  const [playerRole, setPlayerRole] = useState("");
  const [include, setInclude] = useState("");
  const [avoid, setAvoid] = useState("");
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
          prompt,
          relationshipStructure,
          intensityLevel,
          vibe: mode === "advanced" ? vibe : "",
          setting: mode === "advanced" ? setting : "",
          playerRole: mode === "advanced" ? playerRole : "",
          include: mode === "advanced" ? include : "",
          avoid: mode === "advanced" ? avoid : "",
        }),
      });

      const data = (await response.json()) as {
        story?: Story;
        error?: string;
      };
      const compiledStory = data.story;

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

  return isCompiling ? (
    <StoryReviewSkeletonScreen message="Compiling your story..." />
  ) : (
    <Card className="p-5 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setMode("quick")}
          aria-pressed={mode === "quick"}
          className={`rounded-full px-4 py-2 text-sm transition ${
            mode === "quick"
              ? "bg-foreground text-background"
              : "border border-line text-secondary hover:border-fieldBorder hover:text-foreground"
          }`}
        >
          Quick Prompt
        </button>
        <button
          type="button"
          onClick={() => setMode("advanced")}
          aria-pressed={mode === "advanced"}
          className={`rounded-full px-4 py-2 text-sm transition ${
            mode === "advanced"
              ? "bg-foreground text-background"
              : "border border-line text-secondary hover:border-fieldBorder hover:text-foreground"
          }`}
        >
          Advanced Prompt
        </button>
        <p className="text-sm text-secondary">
          {mode === "quick"
            ? "Start fast with a core prompt and a couple strong constraints."
            : "Add a little more structure before generation without turning this into a giant form."}
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <fieldset disabled={isCompiling} className="space-y-6 disabled:opacity-100">
          <Field
            label="Prompt"
            hint="Describe the fantasy, dynamic, or opening situation you want. The compiler will turn it into a structured story profile."
          >
            <Textarea
              required
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="My brother's best friend comes to stay at the lake house after years away, and the tension between us was never resolved."
              className="min-h-48"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Relationship Structure">
              <Select
                value={relationshipStructure}
                onChange={(event) => setRelationshipStructure(event.target.value)}
              >
                {RELATIONSHIP_STRUCTURE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Intensity Level">
              <Select
                value={intensityLevel}
                onChange={(event) => setIntensityLevel(event.target.value as StoryIntensityLevel)}
              >
                {INTENSITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {mode === "advanced" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Vibe" hint="Mood, aesthetic, or flavor you want the story to carry.">
                <Input
                  value={vibe}
                  onChange={(event) => setVibe(event.target.value)}
                  placeholder="lush, forbidden, decadent"
                />
              </Field>
              <Field label="Setting" hint="Time period, place, or social world.">
                <Input
                  value={setting}
                  onChange={(event) => setSetting(event.target.value)}
                  placeholder="old-money beach town in late summer"
                />
              </Field>
              <Field label="Player Role" hint="Who the player is inside the fantasy.">
                <Input
                  value={playerRole}
                  onChange={(event) => setPlayerRole(event.target.value)}
                  placeholder="the younger woman everyone underestimates"
                />
              </Field>
              <div />
              <Field
                label="Include"
                hint="Specific dynamics, details, tones, or content you want preserved."
                className="md:col-span-2"
              >
                <Textarea
                  value={include}
                  onChange={(event) => setInclude(event.target.value)}
                  placeholder="obsessive tension, possessiveness, late-night confessions, expensive old house, lots of eye contact"
                  className="min-h-28"
                />
              </Field>
              <Field
                label="Avoid"
                hint="Anything you do not want the compiler to lean into."
                className="md:col-span-2"
              >
                <Textarea
                  value={avoid}
                  onChange={(event) => setAvoid(event.target.value)}
                  placeholder="comedic tone, generic fantasy filler, softening the jealousy into bland romance"
                  className="min-h-28"
                />
              </Field>
            </div>
          ) : null}
        </fieldset>

        {error ? (
          <div className="border-l border-danger/45 pl-4">
            <p className="text-sm font-medium text-foreground">Compilation failed</p>
            <p className="mt-2 text-sm leading-6 text-secondary">{error}</p>
          </div>
        ) : null}

        <Button type="submit" disabled={isCompiling}>
          {isCompiling ? "Compiling story..." : "Compile story setup"}
        </Button>
      </form>
    </Card>
  );
}
