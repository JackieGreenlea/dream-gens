import Image from "next/image";
import { ExploreStoriesCarousel } from "@/components/home/explore-stories-carousel";
import homeBanner from "@/components/home/everplot-home-banner.png";

const placeholderStories = [
  {
    title: "Kedar",
    summary: "Storm-wracked ruins, buried gods, and one story waiting to be disturbed.",
    accent: "from-slate-600 via-slate-700 to-slate-900",
  },
  {
    title: "The Debugger",
    summary: "A fast-moving thriller where one impossible bug starts rewriting the city around you.",
    accent: "from-cyan-500 via-emerald-500 to-slate-900",
  },
  {
    title: "Xaxas",
    summary: "A quiet kingdom built on old bargains, now beginning to crack under pressure.",
    accent: "from-amber-500 via-stone-700 to-slate-900",
  },
  {
    title: "Procavia",
    summary: "A neon district, a sealed gate, and a night that keeps revealing the wrong future.",
    accent: "from-sky-400 via-indigo-700 to-slate-950",
  },
];

const storyRows = ["Trending", "Placeholder 2", "Placeholder 3", "Placeholder 4"];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  await searchParams;

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
          {storyRows.map((rowTitle) => (
            <section key={rowTitle} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold text-foreground">{rowTitle}</h2>
                <p className="text-sm text-secondary">Placeholder cards for featured stories.</p>
              </div>

              <ExploreStoriesCarousel stories={placeholderStories} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
