import { notFound, redirect } from "next/navigation";
import { StoryEditor } from "@/components/story/story-editor";
import { WorldCanonEditor } from "@/components/world/world-canon-editor";
import { getOwnedStoryById, getOwnedWorldCanonById, getPlayableByIdOrSample } from "@/lib/db";
import { getSampleWorldById } from "@/lib/sampleData";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Compatibility wrapper:
// - real canon World editing lives here when the id belongs to a canon World
// - real Story setup editing lives under /stories/[id]
// - legacy/sample playable World records still fall back to the old world-shaped editor
export default async function EditWorldPage({
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
    // Real path for setup/template editing.
    const storySetup = await getOwnedStoryById(id, user.id);

    if (storySetup) {
      redirect(`/stories/${id}`);
    }

    // Real path for canon World editing.
    const canonWorld = await getOwnedWorldCanonById(id, user.id);

    if (canonWorld) {
      return (
        <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
          <WorldCanonEditor world={canonWorld} />
        </main>
      );
    }
  }

  // Compatibility fallback only: sample worlds and older legacy playable World records.
  const legacyOrSamplePlayable = await getPlayableByIdOrSample(id, user?.id);

  if (!legacyOrSamplePlayable) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <StoryEditor storyId={id} initialStory={legacyOrSamplePlayable} />
    </main>
  );
}
