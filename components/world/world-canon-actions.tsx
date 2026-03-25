"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { WorldCanon } from "@/lib/types";

type WorldCanonActionsProps = {
  world: WorldCanon;
};

export function WorldCanonActions({ world }: WorldCanonActionsProps) {
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleClone() {
    if (isCloning) {
      return;
    }

    setIsCloning(true);

    try {
      const response = await fetch(`/api/worlds/${world.id}/clone`, {
        method: "POST",
      });

      const data = (await response.json()) as {
        world?: WorldCanon;
        error?: string;
      };

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20clone%20this%20world.");
        return;
      }

      if (!response.ok || !data.world) {
        throw new Error(data.error || "Clone failed.");
      }

      router.push(`/worlds/${data.world.id}`);
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Clone failed.");
    } finally {
      setIsCloning(false);
    }
  }

  async function handleDelete() {
    if (isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${world.title}"? This permanently removes the world from your library.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/worlds/${world.id}/canon`, {
        method: "DELETE",
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20delete%20this%20world.");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Delete failed.");
      }

      router.push("/worlds");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Delete failed.");
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <ButtonLink href={`/worlds/${world.id}/edit`} variant="ghost">
        Edit
      </ButtonLink>
      <Button type="button" variant="ghost" onClick={handleClone} disabled={isCloning}>
        {isCloning ? "Cloning..." : "Clone"}
      </Button>
      <ButtonLink href={`/worlds/${world.id}/create-story`}>
        Create Story
      </ButtonLink>
      <Button
        type="button"
        variant="ghost"
        onClick={handleDelete}
        disabled={isDeleting}
        className="border-danger/35 bg-danger/12 text-foreground hover:bg-danger/18 hover:text-foreground"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </Button>
    </div>
  );
}
