import { ExploreBrowser } from "@/components/explore/explore-browser";
import { listPublishedStoriesForExplore } from "@/lib/db";
import { formatLibraryDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const publishedStories = await listPublishedStoriesForExplore();

  return (
    <main className="min-h-screen bg-page">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <ExploreBrowser
          publishedStories={publishedStories.map((story) => ({
            id: story.id,
            title: story.title,
            summary: story.summary,
            authorName: story.authorName,
            publishedLabel: story.publishedAt ? formatLibraryDate(story.publishedAt) : "Published",
            coverImageUrl: story.coverImageUrl,
          }))}
        />
      </div>
    </main>
  );
}
