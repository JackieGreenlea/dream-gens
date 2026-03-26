"use client";

import { useEffect, useRef, useState } from "react";
import { DiscoveryStoryCard } from "@/components/story/discovery-story-card";

const genreTabs = [
  "FOR YOU",
  "TRENDING",
  "NEW",
  "FANTASY",
  "MAGIC",
  "ROMANCE",
  "FILM & TV",
  "ADVENTURE",
  "SLICE OF LIFE",
  "SCI-FI",
  "SUPERHERO",
  "HISTORICAL",
  "MYSTERY",
  "SUPERNATURAL",
  "COMEDY",
] as const;

const tabsWithoutSorter = new Set(["FOR YOU", "TRENDING", "NEW"]);

type PublishedExploreStory = {
  id: string;
  title: string;
  summary: string;
  authorName: string;
  publishedLabel: string;
  coverImageUrl?: string | null;
};

export function ExploreBrowser({
  publishedStories = [],
}: {
  publishedStories?: PublishedExploreStory[];
}) {
  const [selectedTab, setSelectedTab] = useState<(typeof genreTabs)[number]>("FOR YOU");
  const tabsScrollerRef = useRef<HTMLDivElement | null>(null);
  const [isTabsHovered, setIsTabsHovered] = useState(false);
  const [tabsHaveOverflow, setTabsHaveOverflow] = useState(false);
  const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false);
  const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);

  useEffect(() => {
    const scroller = tabsScrollerRef.current;

    if (!scroller) {
      return;
    }

    function updateTabScrollState() {
      const currentScroller = tabsScrollerRef.current;

      if (!currentScroller) {
        return;
      }

      const overflow = currentScroller.scrollWidth > currentScroller.clientWidth + 1;

      setTabsHaveOverflow(overflow);
      setCanScrollTabsLeft(currentScroller.scrollLeft > 1);
      setCanScrollTabsRight(
        currentScroller.scrollLeft + currentScroller.clientWidth < currentScroller.scrollWidth - 1,
      );
    }

    updateTabScrollState();

    const resizeObserver = new ResizeObserver(updateTabScrollState);
    resizeObserver.observe(scroller);
    scroller.addEventListener("scroll", updateTabScrollState, { passive: true });
    window.addEventListener("resize", updateTabScrollState);

    return () => {
      resizeObserver.disconnect();
      scroller.removeEventListener("scroll", updateTabScrollState);
      window.removeEventListener("resize", updateTabScrollState);
    };
  }, []);

  function scrollTabs(direction: "left" | "right") {
    const scroller = tabsScrollerRef.current;

    if (!scroller) {
      return;
    }

    const amount = Math.max(scroller.clientWidth * 0.6, 220);
    scroller.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div
          className="relative"
          onMouseEnter={() => setIsTabsHovered(true)}
          onMouseLeave={() => setIsTabsHovered(false)}
        >
          <div
            ref={tabsScrollerRef}
            className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {genreTabs.map((tab) => {
              const isActive = tab === selectedTab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={`shrink-0 border-b px-1 pb-2 pt-1 text-sm font-medium tracking-[0.08em] transition ${
                    isActive
                      ? "border-accent text-foreground"
                      : "border-transparent text-muted hover:border-line hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {tabsHaveOverflow ? (
            <>
              <button
                type="button"
                onClick={() => scrollTabs("left")}
                className={`absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-line bg-night/90 text-foreground shadow-glow transition hover:border-fieldBorder hover:bg-surface ${
                  isTabsHovered && canScrollTabsLeft ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                aria-label="Scroll genres left"
              >
                <span className="text-xl leading-none">‹</span>
              </button>

              <button
                type="button"
                onClick={() => scrollTabs("right")}
                className={`absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-line bg-night/90 text-foreground shadow-glow transition hover:border-fieldBorder hover:bg-surface ${
                  isTabsHovered && canScrollTabsRight ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                aria-label="Scroll genres right"
              >
                <span className="text-xl leading-none">›</span>
              </button>
            </>
          ) : null}
        </div>

        {!tabsWithoutSorter.has(selectedTab) ? (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="border-b border-line px-0 py-1 text-sm font-medium text-secondary transition hover:border-fieldBorder hover:text-foreground"
            >
              Sort: Most Played
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {publishedStories.length > 0 ? (
          <div className="space-y-4">
            {publishedStories.map((story) => (
              <DiscoveryStoryCard
                key={story.id}
                title={story.title}
                description={story.summary}
                accent="from-[#0091AD] via-[#00768D] to-slate-950"
                imageUrl={story.coverImageUrl}
                metadata={[story.authorName, story.publishedLabel, "Published"]}
                imageAspectClassName="aspect-[16/10] md:h-full md:min-h-[16rem]"
                variant="feed"
              />
            ))}
          </div>
        ) : (
          <div className="border-t border-line pt-6">
            <p className="text-lg font-medium text-foreground">No published stories yet</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">
              Published stories will appear here once authors choose to share them in Explore.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
