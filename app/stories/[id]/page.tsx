import { notFound, redirect } from "next/navigation";
import { StoryEditor } from "@/components/story/story-editor";
import { getStoryProfileById } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StorySetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const profile = await getStoryProfileById(id, user?.id ?? null);

  if (!profile) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <StoryEditor
        storyId={id}
        initialStory={profile.story}
        authorName={profile.authorName}
        isOwner={profile.isOwner}
        basePath="/stories"
        apiBasePath="/api/stories"
      />
    </main>
  );
}
