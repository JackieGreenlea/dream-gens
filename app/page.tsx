import Link from "next/link";
import { Card } from "@/components/ui/card";

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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="min-h-screen bg-celestial-glow">
      <div className="mx-auto flex min-h-screen max-w-[1380px] flex-col gap-8 px-4 py-8 sm:px-8 lg:px-10">
        {message ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#1a29b8] px-6 py-20 shadow-glow sm:px-10 sm:py-24">
          <div className="mx-auto flex min-h-[230px] max-w-4xl items-center justify-center text-center">
            <div className="space-y-3">
              <h1 className="text-5xl font-semibold uppercase tracking-tight text-white sm:text-6xl lg:text-7xl">
                Everplot
              </h1>
              <p className="text-lg font-medium text-white/90 sm:text-xl">Create. Explore. Play.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-white">Explore Stories</h2>
            <p className="text-sm text-mist">Placeholder cards for featured stories.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {placeholderStories.map((story) => (
              <Link key={story.title} href="/" className="block">
                <Card className="flex h-full flex-col gap-4 overflow-hidden p-0 transition hover:border-white/20 hover:bg-white/[0.06]">
                  <div className={`h-40 bg-gradient-to-br ${story.accent}`} />
                  <div className="space-y-3 p-5">
                    <h3 className="text-xl font-semibold text-white">{story.title}</h3>
                    <p className="text-sm leading-6 text-mist">{story.summary}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
