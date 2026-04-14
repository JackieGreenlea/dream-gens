import Image from "next/image";
import Link from "next/link";
import { ExploreStoriesCarousel } from "@/components/home/explore-stories-carousel";
import { DiscoveryStoryCard } from "@/components/story/discovery-story-card";
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
  const featuredSource = publishedStories[0] ?? null;

  function toCardStories(stories: typeof publishedStories) {
    return stories.map((story) => ({
      id: story.id,
      title: story.title,
      summary: story.summary,
      accent: storyHasTag(story.tags, "romance")
        ? "from-[#b55d62] via-[#5f2c36] to-[#0d1117]"
        : storyHasTag(story.tags, "sci-fi")
          ? "from-[#6ba7b8] via-[#24495b] to-[#0d1117]"
          : storyHasTag(story.tags, "fantasy")
            ? "from-[#d8a46a] via-[#6a4630] to-[#0d1117]"
            : "from-[#d6ab72] via-[#5b4531] to-[#0d1117]",
      authorName: story.authorUsername,
      authorHref: `/u/${story.authorUsername}`,
      imageUrl: story.coverImageUrl,
      actionHref: `/stories/${story.id}/characters`,
      profileHref: `/stories/${story.id}`,
    }));
  }

  const cardStories = toCardStories(publishedStories);
  const spotlightStories = cardStories.slice(1, 4);
  const homeRows = [
    {
      title: "Fresh Stories",
      description: "Recently published stories ready to jump into.",
      stories: cardStories,
    },
    {
      title: "Fantasy Shelf",
      description: "Mythic, sweeping, strange, and just a little dangerous.",
      stories: toCardStories(publishedStories.filter((story) => storyHasTag(story.tags, "fantasy"))),
    },
    {
      title: "Romance Shelf",
      description: "Intimate stakes, sharp chemistry, and messy hearts.",
      stories: toCardStories(publishedStories.filter((story) => storyHasTag(story.tags, "romance"))),
    },
    {
      title: "Sci-Fi Shelf",
      description: "Cold futures, bright tech, and the stories hiding underneath.",
      stories: toCardStories(publishedStories.filter((story) => storyHasTag(story.tags, "sci-fi"))),
    },
  ].filter((row) => row.stories.length > 0);

  return (
    <main className="min-h-screen bg-page">
      <div className="mx-auto max-w-[1500px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="space-y-8">
            <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.5fr)_320px]">
              <article className="studio-panel relative overflow-hidden rounded-[2rem] border border-line/80">
                <div className="absolute inset-0">
                  {featuredSource?.coverImageUrl ? (
                    <img
                      src={featuredSource.coverImageUrl}
                      alt={`${featuredSource.title} cover art`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={homeBanner}
                      alt="Everplot banner artwork"
                      priority
                      className="h-full w-full object-cover"
                      sizes="(max-width: 1536px) 100vw, 900px"
                    />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,12,0.92)_0%,rgba(8,9,12,0.7)_44%,rgba(8,9,12,0.34)_100%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,171,114,0.22),transparent_34%)]" />
                </div>

                <div className="relative z-10 flex min-h-[430px] flex-col justify-end px-6 py-6 sm:min-h-[520px] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
                  <div className="max-w-2xl rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,9,12,0.74)_0%,rgba(8,9,12,0.52)_100%)] p-6 backdrop-blur-sm sm:p-7">
                    <p className="text-[0.74rem] uppercase tracking-[0.24em] text-[rgba(214,171,114,0.92)]">
                      Featured Story
                    </p>
                    <h1 className="mt-4 font-serif text-[2.5rem] leading-[0.95] tracking-[-0.035em] text-foreground sm:text-[3.25rem] lg:text-[4rem]">
                      {featuredSource?.title ?? "Turn a spark into a playable story."}
                    </h1>
                    <p className="mt-4 max-w-xl text-base leading-7 text-secondary sm:text-lg">
                      {featuredSource?.summary ??
                        "Start from a prompt, compile a structured setup, shape the details, and move into play without carrying around extra product weight."}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link
                        href={featuredSource ? `/stories/${featuredSource.id}/characters` : "/create"}
                        className="inline-flex items-center rounded-full border border-[rgba(214,171,114,0.38)] bg-[rgba(214,171,114,0.14)] px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-[rgba(214,171,114,0.22)]"
                      >
                        {featuredSource ? "Play Featured Story" : "Start a Story"}
                      </Link>
                      <Link
                        href={featuredSource ? `/stories/${featuredSource.id}` : "/explore"}
                        className="inline-flex items-center rounded-full border border-line/80 px-5 py-3 text-sm font-medium text-secondary transition hover:border-[rgba(214,171,114,0.34)] hover:text-foreground"
                      >
                        {featuredSource ? "View Story Setup" : "Explore Published Stories"}
                      </Link>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.22em] text-muted">
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        Prompt first
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        Structured editor
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1">
                        Publish when ready
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              <div className="grid gap-4 sm:grid-cols-3 2xl:grid-cols-1">
                <div className="studio-panel rounded-[1.7rem] border border-line/80 p-5">
                  <p className="text-[0.72rem] uppercase tracking-[0.24em] text-muted">Create</p>
                  <h2 className="mt-3 text-xl font-medium text-foreground">Prompt into draft</h2>
                  <p className="mt-2 text-sm leading-6 text-secondary">
                    Treat the compiler as your first thoughtful pass, not the final answer.
                  </p>
                </div>
                <div className="studio-panel rounded-[1.7rem] border border-line/80 p-5">
                  <p className="text-[0.72rem] uppercase tracking-[0.24em] text-muted">Refine</p>
                  <h2 className="mt-3 text-xl font-medium text-foreground">Shape the setup</h2>
                  <p className="mt-2 text-sm leading-6 text-secondary">
                    Tune tone, characters, and story cards until the scenario feels usable.
                  </p>
                </div>
                <div className="studio-panel rounded-[1.7rem] border border-line/80 p-5">
                  <p className="text-[0.72rem] uppercase tracking-[0.24em] text-muted">Play</p>
                  <h2 className="mt-3 text-xl font-medium text-foreground">Launch the session</h2>
                  <p className="mt-2 text-sm leading-6 text-secondary">
                    Move straight from setup to the playable thread without extra world management.
                  </p>
                </div>
              </div>
            </section>

            {spotlightStories.length > 0 ? (
              <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[0.72rem] uppercase tracking-[0.24em] text-[rgba(214,171,114,0.88)]">
                      Spotlight
                    </p>
                    <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-foreground">
                      A few strong places to start.
                    </h2>
                  </div>
                  <Link
                    href="/explore"
                    className="text-sm font-medium text-secondary transition hover:text-foreground"
                  >
                    Open full library
                  </Link>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  {spotlightStories.map((story) => (
                    <DiscoveryStoryCard
                      key={story.id}
                      title={story.title}
                      description={story.summary}
                      accent={story.accent}
                      authorName={story.authorName}
                      authorHref={story.authorHref}
                      imageUrl={story.imageUrl}
                      metadata={["Published", "Curated", "Ready to play"]}
                      actionHref={story.actionHref}
                      profileHref={story.profileHref}
                      imageAspectClassName="aspect-[4/3.3]"
                      className="studio-panel rounded-[1.45rem] border-line/80"
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <div className="space-y-8">
              {homeRows.map((row) => (
                <section key={row.title} className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                        {row.title}
                      </h2>
                      <p className="text-sm text-secondary">{row.description}</p>
                    </div>
                  </div>

                  <ExploreStoriesCarousel stories={row.stories} />
                </section>
              ))}
            </div>
        </div>
      </div>
    </main>
  );
}
