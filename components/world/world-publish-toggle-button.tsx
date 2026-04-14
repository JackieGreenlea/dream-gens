"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type WorldPublishToggleButtonProps = {
  worldId: string;
  visibility: "private" | "public";
};

export function WorldPublishToggleButton({
  worldId,
  visibility,
}: WorldPublishToggleButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(`/api/worlds/${worldId}/publish`, {
        method: visibility === "public" ? "DELETE" : "POST",
      });

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20manage%20your%20world.");
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to update world visibility.");
      }

      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button type="button" variant="ghost" onClick={handleToggle} disabled={isPending}>
      {isPending
        ? visibility === "public"
          ? "Unpublishing..."
          : "Publishing..."
        : visibility === "public"
          ? "Unpublish"
          : "Publish"}
    </Button>
  );
}
