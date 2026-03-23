import { ButtonLink } from "@/components/ui/button";
import { SampleWorlds } from "@/components/world/sample-worlds";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="min-h-screen bg-celestial-glow">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-20 px-6 py-10 sm:px-8 lg:px-10">
        {message ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}
        <section className="flex flex-1 items-center">
          <div className="max-w-4xl space-y-8 py-8 lg:py-14">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.34em] text-gold">
                Structured Interactive Fiction
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                Everplot
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-mist">
                Turn a story idea into a playable interactive story, or compile a reusable world canon for future stories.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <ButtonLink href="/create">Create a story</ButtonLink>
              <ButtonLink href="/worlds/create" variant="ghost">
                Create a world
              </ButtonLink>
              <ButtonLink href="#samples" variant="ghost">
                Explore samples
              </ButtonLink>
            </div>
          </div>
        </section>

        <div id="samples">
          <SampleWorlds />
        </div>
      </div>
    </main>
  );
}
