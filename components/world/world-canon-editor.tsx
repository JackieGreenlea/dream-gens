"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { WorldCanon } from "@/lib/types";

type WorldCanonEditorProps = {
  world: WorldCanon;
};

export function WorldCanonEditor({ world: initialWorld }: WorldCanonEditorProps) {
  const router = useRouter();
  const [world, setWorld] = useState(initialWorld);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField<Key extends keyof WorldCanon>(key: Key, value: WorldCanon[Key]) {
    setWorld((current) => ({ ...current, [key]: value }));
  }

  function updateCastMember(
    index: number,
    key: "name" | "description" | "role",
    value: string,
  ) {
    setWorld((current) => ({
      ...current,
      cast: current.cast.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [key]: value } : member,
      ),
    }));
  }

  function addCastMember() {
    setWorld((current) => ({
      ...current,
      cast: [...current.cast, { name: "", description: "", role: "" }],
    }));
  }

  function removeCastMember(index: number) {
    setWorld((current) => ({
      ...current,
      cast: current.cast.filter((_, memberIndex) => memberIndex !== index),
    }));
  }

  async function handleSave() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError("");

    const sanitizedWorld: WorldCanon = {
      ...world,
      cast: world.cast
        .map((member) => ({
          name: member.name.trim(),
          description: member.description.trim(),
          role: member.role?.trim() ?? "",
        }))
        .filter((member) => member.name && member.description),
    };

    try {
      const response = await fetch(`/api/worlds/${sanitizedWorld.id}/canon`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedWorld),
      });

      const data = (await response.json()) as {
        world?: WorldCanon;
        error?: string;
      };

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20save%20this%20world.");
        return;
      }

      if (!response.ok || !data.world) {
        throw new Error(data.error || "The world could not be saved.");
      }

      router.push(`/worlds/${data.world.id}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The world could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {error ? (
        <Card className="border-danger/35 bg-danger/12 p-5">
          <p className="text-sm font-medium text-foreground">World save failed</p>
          <p className="mt-2 text-sm leading-6 text-secondary">{error}</p>
        </Card>
      ) : null}

      <Card className="space-y-6 p-6 sm:p-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.24em] text-warm">Edit World</p>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{world.title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-secondary">
            Refine the canon container directly. This page is only for reusable world material, not playable Story setup.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save world"}
          </Button>
          <ButtonLink href={`/worlds/${world.id}`} variant="ghost">
            Cancel
          </ButtonLink>
        </div>

        <div className="grid gap-5">
          <Field label="Title">
            <Input value={world.title} onChange={(event) => updateField("title", event.target.value)} />
          </Field>
          <Field label="Short Summary">
            <Textarea
              value={world.shortSummary}
              onChange={(event) => updateField("shortSummary", event.target.value)}
            />
          </Field>
          <Field label="Long Description">
            <Textarea
              value={world.longDescription}
              onChange={(event) => updateField("longDescription", event.target.value)}
              className="min-h-48"
            />
          </Field>
        </div>
      </Card>

      <Card className="space-y-6 p-6 sm:p-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.24em] text-warm">World Structure</p>
          <p className="text-sm leading-6 text-secondary">
            Keep these sections focused on reusable canon that future stories can draw from.
          </p>
        </div>

        <div className="grid gap-5">
          <Field label="Setting">
            <Textarea
              value={world.setting}
              onChange={(event) => updateField("setting", event.target.value)}
              className="min-h-32"
            />
          </Field>
          <Field label="Lore">
            <Textarea
              value={world.lore}
              onChange={(event) => updateField("lore", event.target.value)}
              className="min-h-32"
            />
          </Field>
          <Field label="History">
            <Textarea
              value={world.history}
              onChange={(event) => updateField("history", event.target.value)}
              className="min-h-32"
            />
          </Field>
          <Field label="Rules">
            <Textarea
              value={world.rules}
              onChange={(event) => updateField("rules", event.target.value)}
              className="min-h-32"
            />
          </Field>
        </div>
      </Card>

      <Card className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-warm">Cast</p>
            <p className="text-sm leading-6 text-secondary">
              Optional recurring world-level characters. Leave empty if this world does not need them.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={addCastMember}>
            Add cast member
          </Button>
        </div>

        {world.cast.length === 0 ? (
          <div className="rounded-3xl border border-line bg-elevated p-5 text-sm text-secondary">
            No cast members yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {world.cast.map((member, index) => (
              <div
                key={`${world.id}-cast-${index}`}
                className="rounded-3xl border border-line bg-elevated p-4 sm:p-5"
              >
                <div className="grid gap-4">
                  <Field label="Name">
                    <Input
                      value={member.name}
                      onChange={(event) => updateCastMember(index, "name", event.target.value)}
                    />
                  </Field>
                  <Field label="Role">
                    <Input
                      value={member.role ?? ""}
                      onChange={(event) => updateCastMember(index, "role", event.target.value)}
                      placeholder="optional"
                    />
                  </Field>
                  <Field label="Description">
                    <Textarea
                      value={member.description}
                      onChange={(event) =>
                        updateCastMember(index, "description", event.target.value)
                      }
                    />
                  </Field>
                  <div className="flex justify-end">
                    <Button type="button" variant="ghost" onClick={() => removeCastMember(index)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save world"}
        </Button>
        <ButtonLink href={`/worlds/${world.id}`} variant="ghost">
          Cancel
        </ButtonLink>
      </div>
    </div>
  );
}
