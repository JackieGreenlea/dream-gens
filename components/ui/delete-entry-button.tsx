"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type DeleteEntryButtonProps = {
  endpoint: string;
  confirmMessage: string;
  signInMessage: string;
  label: string;
};

export function DeleteEntryButton({
  endpoint,
  confirmMessage,
  signInMessage,
  label,
}: DeleteEntryButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting || !window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (response.status === 401) {
        router.push(`/auth/sign-in?message=${encodeURIComponent(signInMessage)}`);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Delete failed.");
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Delete failed.");
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleDelete}
      disabled={isDeleting}
      className="border-danger/35 bg-danger/12 text-foreground hover:bg-danger/18 hover:text-foreground"
    >
      {isDeleting ? "Deleting..." : label}
    </Button>
  );
}
