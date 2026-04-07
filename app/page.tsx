import Image from "next/image";
import Link from "next/link";
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
      accent: "from-[#fdd835] via-[#c9a800] to-slate-950",
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
      <div className="mx-auto flex min-h-screen max-w-[1840px] flex-col gap-6 px-4 pb-8 pt-4 sm:px-6 sm:pb-8 sm:pt-5 lg:px-8 lg:pb-8 lg:pt-6">
        <section className="rounded-[2rem] py-0">
          <div className="relative flex min-h-[420px] w-full items-center sm:min-h-[520px] lg:min-h-[620px]">
            <div className="relative z-10 w-full px-0 sm:max-w-xl sm:px-4 lg:px-8">
              <div className="w-full rounded-[1.25rem] bg-[linear-gradient(90deg,rgba(13,16,20,0.82)_0%,rgba(13,16,20,0.62)_58%,rgba(13,16,20,0.08)_100%)] px-4 py-6 sm:max-w-lg sm:p-8">
                <div className="space-y-5">
                  <h1 className="max-w-none text-[2.65rem] font-semibold tracking-[-0.045em] text-foreground sm:max-w-md sm:text-5xl lg:text-6xl">
                    Step into a world of your own imagination.
                  </h1>
                  <p className="max-w-none text-base leading-7 text-secondary sm:max-w-2xl sm:text-lg">
                    Create your own worlds and play through immersive interactive fiction built
                    for romance, fantasy, sci-fi, adventure, and more.
                  </p>
                  <div className="space-y-4">
                    <Link
                      href="/create"
                      className="inline-flex items-center rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-night transition hover:bg-[#e6c600]"
                    >
                      Start your Story
                    </Link>
                    <div>
                      <Link
                        href="/explore"
                        className="text-sm font-medium text-foreground transition hover:text-accent"
                      >
                        Explore the Worlds &gt;
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 flex items-center justify-center"
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
