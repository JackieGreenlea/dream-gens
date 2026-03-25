"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type PlaceholderStory = {
  title: string;
  summary: string;
  accent: string;
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
          <Link
            key={story.title}
            href="/"
            className="block min-w-0 flex-none basis-[85%] sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-3rem)/4)]"
          >
            <Card className="flex h-full flex-col overflow-hidden rounded-[1.6rem] border-white/[0.06] bg-surface/95 p-0 shadow-[0_24px_48px_rgba(0,0,0,0.26)] transition hover:border-white/[0.1] hover:bg-elevated">
              <div className="relative aspect-[4/5] overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${story.accent}`} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(243,245,248,0.08),transparent_42%),linear-gradient(180deg,rgba(14,18,24,0.08)_0%,rgba(14,18,24,0.18)_55%,rgba(14,18,24,0.52)_100%)]" />
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-page/70 via-page/18 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-page/90 via-page/30 to-transparent" />
                <div className="absolute left-4 right-4 top-4 flex items-center justify-between text-[0.65rem] font-medium uppercase tracking-[0.22em] text-secondary">
                  <span className="rounded-full border border-white/[0.08] bg-page/35 px-3 py-1 backdrop-blur-sm">
                    Featured
                  </span>
                  <span>Curated</span>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between bg-[linear-gradient(180deg,rgba(42,47,58,0.96)_0%,rgba(33,38,48,1)_100%)] px-4.5 py-4">
                <div className="space-y-2.5">
                  <h3 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-foreground">
                    {story.title}
                  </h3>
                  <p className="line-clamp-3 text-sm leading-6 text-muted">{story.summary}</p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.05] pt-3.5">
                  <div className="flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.08em] text-muted">
                    <span>4.8 rating</span>
                    <span className="h-1 w-1 rounded-full bg-line/70" />
                    <span>Editorial pick</span>
                  </div>
                  <span className="rounded-2xl border border-fieldBorder/55 bg-page/18 px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-foreground transition hover:border-warm/80 hover:bg-page/28 hover:text-warm">
                    Play
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {hasOverflow ? (
        <>
          <button
            type="button"
            onClick={() => scrollByCards("left")}
            className={`absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/95 text-foreground shadow-glow transition hover:border-fieldBorder hover:bg-elevated ${
              canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-label="Scroll stories left"
          >
            <span className="text-xl leading-none">‹</span>
          </button>

          <button
            type="button"
            onClick={() => scrollByCards("right")}
            className={`absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/95 text-foreground shadow-glow transition hover:border-fieldBorder hover:bg-elevated ${
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
