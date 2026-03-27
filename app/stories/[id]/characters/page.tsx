import { notFound, redirect } from "next/navigation";
import { StoryCharacterSelect } from "@/components/story/character-select";
import { getStoryPlayableById } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StoryCharacterSelectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const returnPath = `/stories/${id}/characters`;

  if (!user) {
    redirect(
      `/auth/sign-in?message=${encodeURIComponent("Sign in to play this story.")}&next=${encodeURIComponent(returnPath)}`,
    );
  }

  const story = await getStoryPlayableById(id, user.id);

  if (!story) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 sm:px-8 lg:px-10">
      <StoryCharacterSelect initialStory={story} apiBasePath="/api/stories" />
    </main>
  );
}
