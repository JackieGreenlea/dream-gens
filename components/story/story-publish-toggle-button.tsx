"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type StoryPublishToggleButtonProps = {
  storyId: string;
  visibility: "private" | "public";
};

export function StoryPublishToggleButton({
  storyId,
  visibility,
}: StoryPublishToggleButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(`/api/stories/${storyId}/publish`, {
        method: visibility === "public" ? "DELETE" : "POST",
      });

      if (response.status === 401) {
        router.push("/auth/sign-in?message=Sign%20in%20to%20manage%20your%20story.");
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to update story visibility.");
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
