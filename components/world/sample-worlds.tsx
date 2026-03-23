import { sampleWorlds } from "@/lib/sampleData";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export function SampleWorlds() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.28em] text-gold">Sample Stories</p>
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">
          Browse the shape of the experience before you build your own.
        </h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {sampleWorlds.map((world) => (
          <Card key={world.id} className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-mist">Story Sample</p>
                <h3 className="text-xl font-semibold text-white">{world.title}</h3>
              </div>
              <p className="text-sm leading-6 text-mist">{world.summary}</p>
            </div>
            <ButtonLink href={`/worlds/${world.id}/edit`} variant="ghost" className="w-fit">
              Open sample story
            </ButtonLink>
          </Card>
        ))}
      </div>
    </section>
  );
}
