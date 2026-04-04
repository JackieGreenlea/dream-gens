"use client";

import { useEffect, useRef, useState } from "react";
import { DiscoveryStoryCard } from "@/components/story/discovery-story-card";

type PlaceholderStory = {
  id?: string;
  title: string;
  summary: string;
  accent: string;
  authorName?: string;
  authorHref?: string;
  imageUrl?: string | null;
  actionHref?: string;
  profileHref?: string;
};

type ExploreStoriesCarouselProps = {
  stories: PlaceholderStory[];
};

export function ExploreStoriesCarousel({ stories }: ExploreStoriesCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    function updateScrollState() {
      const currentScroller = scrollerRef.current;

      if (!currentScroller) {
        return;
      }

      const overflow = currentScroller.scrollWidth > currentScroller.clientWidth + 1;

      setHasOverflow(overflow);
      setCanScrollLeft(currentScroller.scrollLeft > 1);
      setCanScrollRight(
        currentScroller.scrollLeft + currentScroller.clientWidth < currentScroller.scrollWidth - 1,
      );
    }

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scroller);
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      resizeObserver.disconnect();
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [stories]);

  function scrollByCards(direction: "left" | "right") {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const amount = Math.max(scroller.clientWidth * 0.72, 280);
    scroller.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {stories.map((story) => (
          <div
            key={story.id ?? story.title}
            className="min-w-0 flex-none basis-[85%] sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-3rem)/4)]"
          >
            <DiscoveryStoryCard
              title={story.title}
              description={story.summary}
              accent={story.accent}
              authorName={story.authorName}
              authorHref={story.authorHref}
              imageUrl={story.imageUrl}
              metadata={story.authorName ? ["Published", "Editorial pick"] : ["Featured", "Curated", "4.8 rating"]}
              actionHref={story.actionHref}
              profileHref={story.profileHref}
              imageAspectClassName="aspect-[4/3.7]"
            />
          </div>
        ))}
      </div>

      {hasOverflow ? (
        <>
          <button
            type="button"
            onClick={() => scrollByCards("left")}
            className={`absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-line bg-night/90 text-foreground shadow-glow transition hover:border-fieldBorder hover:bg-surface ${
              canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-label="Scroll stories left"
          >
            <span className="text-xl leading-none">‹</span>
          </button>

          <button
            type="button"
            onClick={() => scrollByCards("right")}
            className={`absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-line bg-night/90 text-foreground shadow-glow transition hover:border-fieldBorder hover:bg-surface ${
              canScrollRight ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-label="Scroll stories right"
          >
            <span className="text-xl leading-none">›</span>
          </button>
        </>
      ) : null}
    </div>
  );
}
