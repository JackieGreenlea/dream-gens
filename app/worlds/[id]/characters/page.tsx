import { notFound, redirect } from "next/navigation";
import { StoryCharacterSelect } from "@/components/story/character-select";
import { getOwnedStoryById, getPlayableByIdOrSample } from "@/lib/db";
import { getSampleWorldById } from "@/lib/sampleData";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Compatibility wrapper:
// - real Story setup character select lives under /stories/[id]/characters
// - this route remains for sample and legacy playable World records
export default async function WorldCharactersCompatibilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isSample = Boolean(getSampleWorldById(id));
  const user = await getCurrentUser();

  if (!isSample && !user) {
    redirect("/auth/sign-in?message=Sign%20in%20to%20open%20your%20saved%20worlds.");
  }

  if (user && !isSample) {
    // Real path for Story setup character select.
    const storySetup = await getOwnedStoryById(id, user.id);

    if (storySetup) {
      redirect(`/stories/${id}/characters`);
    }
  }

  // Compatibility fallback only: sample worlds and older legacy playable World records.
  const legacyOrSampleStory = await getPlayableByIdOrSample(id, user?.id);

  if (!legacyOrSampleStory) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 sm:px-8 lg:px-10">
      <StoryCharacterSelect initialStory={legacyOrSampleStory} />
    </main>
  );
}
