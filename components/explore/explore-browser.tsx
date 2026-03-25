"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

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

const placeholderStories = [
  {
    title: "Anthology",
    creator: "everplot",
    age: "8 months ago",
    description:
      "Thirty connected prompts across six genres, built as a clean starting point for readers who want variety.",
    accent: "from-amber-200 via-orange-500 to-stone-900",
    stats: ["368 likes", "2.1M plays", "2.6k saves", "70 comments"],
  },
  {
    title: "Dude, Do I Look Pretty?",
    creator: "ZestiusMaximus",
    age: "2 months ago",
    description:
      "A social comedy setup about friendship, embarrassment, and trying to survive one very cursed public outing.",
    accent: "from-rose-300 via-fuchsia-500 to-stone-800",
    stats: ["195 likes", "16k plays", "1.8k saves", "16 comments"],
  },
  {
    title: "Random Isekai!",
    creator: "YukikoHonomiko",
    age: "8 months ago",
    description:
      "Every restart drops you into a different world with different rules, enemies, and one absurd chance at survival.",
    accent: "from-sky-300 via-indigo-500 to-slate-900",
    stats: ["692 likes", "70k plays", "5.4k saves", "107 comments"],
  },
  {
    title: "Her First Victim",
    creator: "Rivaldragon",
    age: "2 months ago",
    description:
      "A dark mystery setup built around escalating suspicion, strange intimacy, and the first mistake nobody can undo.",
    accent: "from-zinc-300 via-violet-700 to-black",
    stats: ["244 likes", "21k plays", "1.1k saves", "38 comments"],
  },
];

export function ExploreBrowser() {
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
                  className={`shrink-0 rounded-2xl border px-5 py-3 text-md font-bold tracking-[0.08em] transition ${
                    isActive
                      ? "border-warm bg-warm text-page"
                      : "border-line bg-surface text-foreground hover:border-fieldBorder hover:bg-elevated"
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
                className={`absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/95 text-foreground shadow-glow transition hover:border-fieldBorder hover:bg-elevated ${
                  isTabsHovered && canScrollTabsLeft ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                aria-label="Scroll genres left"
              >
                <span className="text-xl leading-none">‹</span>
              </button>

              <button
                type="button"
                onClick={() => scrollTabs("right")}
                className={`absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/95 text-foreground shadow-glow transition hover:border-fieldBorder hover:bg-elevated ${
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
              className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-secondary transition hover:border-fieldBorder hover:bg-elevated hover:text-foreground"
            >
              Sort: Most Played
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        {placeholderStories.map((story) => (
          <Card
            key={story.title}
            className="overflow-hidden rounded-[1.6rem] border-white/[0.06] p-0 shadow-[0_24px_50px_rgba(0,0,0,0.24)]"
          >
            <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="relative min-h-[260px] overflow-hidden lg:min-h-full">
                <div className={`absolute inset-0 bg-gradient-to-br ${story.accent}`} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(243,245,248,0.08),transparent_42%),linear-gradient(180deg,rgba(14,18,24,0.06)_0%,rgba(14,18,24,0.16)_45%,rgba(14,18,24,0.55)_100%)]" />
                <div className="absolute left-5 right-5 top-5 flex items-center justify-between text-[0.7rem] font-medium uppercase tracking-[0.22em] text-secondary">
                  <span className="rounded-full border border-white/[0.08] bg-page/35 px-3 py-1 backdrop-blur-sm">
                    {selectedTab}
                  </span>
                  <span>{story.age}</span>
                </div>
              </div>

              <div className="flex flex-col justify-between bg-[linear-gradient(180deg,rgba(42,47,58,0.97)_0%,rgba(33,38,48,1)_100%)] px-5 py-5 sm:px-6 sm:py-5">
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-secondary">
                      <span className="font-medium text-cool">{story.creator}</span>
                      <span className="h-1 w-1 rounded-full bg-line/70" />
                      <span>{story.age}</span>
                    </div>
                    <h2 className="text-[2.1rem] font-semibold tracking-[-0.035em] text-foreground sm:text-[2.35rem]">
                      {story.title}
                    </h2>
                    <p className="line-clamp-3 max-w-3xl text-[0.98rem] leading-7 text-muted">
                      {story.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-white/[0.05] pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-[0.78rem] uppercase tracking-[0.08em] text-muted">
                    {story.stats.map((stat) => (
                      <span key={stat}>{stat}</span>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="rounded-2xl border border-fieldBorder/55 bg-page/16 px-5 py-2.5 text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-foreground transition hover:border-warm/80 hover:bg-page/24 hover:text-warm"
                  >
                    Play
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
