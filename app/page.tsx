import Image from "next/image";
import { ExploreStoriesCarousel } from "@/components/home/explore-stories-carousel";
import homeBanner from "@/components/home/everplot-home-banner.png";
import { listPublishedStoriesForExplore } from "@/lib/db";
import { storyHasTag } from "@/lib/story-tags";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  await searchParams;
  const publishedStories = await listPublishedStoriesForExplore(24);

  function toCardStories(stories: typeof publishedStories) {
    return stories.map((story) => ({
      id: story.id,
      title: story.title,
      summary: story.summary,
      accent: "from-[#0091AD] via-[#00768D] to-slate-950",
      authorName: story.authorUsername,
      authorHref: `/u/${story.authorUsername}`,
      imageUrl: story.coverImageUrl,
      actionHref: `/stories/${story.id}/characters`,
      profileHref: `/stories/${story.id}`,
    }));
  }

  const homeRows = [
    {
      title: "New Stories",
      description: "Recently published stories available to play now.",
      stories: toCardStories(publishedStories),
    },
    {
      title: "Fantasy",
      description: "Published stories tagged fantasy.",
      stories: toCardStories(publishedStories.filter((story) => storyHasTag(story.tags, "fantasy"))),
    },
    {
      title: "Romance",
      description: "Published stories tagged romance.",
      stories: toCardStories(publishedStories.filter((story) => storyHasTag(story.tags, "romance"))),
    },
    {
      title: "SCI-FI",
      description: "Published stories tagged sci-fi.",
      stories: toCardStories(publishedStories.filter((story) => storyHasTag(story.tags, "sci-fi"))),
    },
  ];

  return (
    <main className="min-h-screen bg-page">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] py-2 sm:py-4 lg:py-6">
          <div className="flex min-h-[320px] w-full items-center justify-center sm:min-h-[420px] lg:min-h-[560px]">
            <div
              className="w-full"
              style={{
                WebkitMaskImage:
                  "radial-gradient(ellipse at center, black 86%, transparent 100%), linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 10%, black 86%, transparent 100%)",
                maskImage:
                  "radial-gradient(ellipse at center, black 86%, transparent 100%), linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 10%, black 86%, transparent 100%)",
                WebkitMaskComposite: "source-in",
                maskComposite: "intersect",
              }}
            >
              <Image
                src={homeBanner}
                alt="Everplot banner artwork"
                priority
                className="h-auto w-full object-contain"
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 90vw, 1680px"
              />
            </div>
          </div>
        </section>

        <div className="space-y-8">
          {homeRows.map((row) => (
            <section key={row.title} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-foreground">{row.title}</h2>
                <p className="text-sm text-secondary">{row.description}</p>
              </div>

              {row.stories.length > 0 ? (
                <ExploreStoriesCarousel stories={row.stories} />
              ) : (
                <div className="border-t border-line pt-6">
                  <p className="text-sm leading-6 text-secondary">
                    No published stories match this row yet.
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
