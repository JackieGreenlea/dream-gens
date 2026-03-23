import { notFound, redirect } from "next/navigation";
import { WorldEditor } from "@/components/world/world-editor";
import { getStoryPlayableById } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in?message=Sign%20in%20to%20open%20your%20saved%20stories.");
  }

  const story = await getStoryPlayableById(id, user.id);

  if (!story) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <WorldEditor
        worldId={id}
        initialWorld={story}
        basePath="/stories"
        apiBasePath="/api/stories"
      />
    </main>
  );
}
