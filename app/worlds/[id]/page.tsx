import { notFound, redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorldCanonActions } from "@/components/world/world-canon-actions";
import { getOwnedWorldCanonById } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorldProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in?message=Sign%20in%20to%20open%20your%20saved%20worlds.");
  }

  const world = await getOwnedWorldCanonById(id, user.id);

  if (!world) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-warm">World Profile</p>
            <h1 className="text-4xl font-semibold text-foreground">{world.title}</h1>
            <p className="max-w-2xl text-lg leading-8 text-secondary">{world.shortSummary}</p>
          </div>

          <WorldCanonActions world={world} />
        </div>

        <Card className="space-y-5 p-6 sm:p-8">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.18em] text-warm">Canon Overview</p>
            <h2 className="text-2xl font-semibold text-foreground">Long Description</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-secondary sm:text-base">
            {world.longDescription
              .split(/\n+/)
              .map((paragraph) => paragraph.trim())
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={`${world.id}-paragraph-${index}`}>{paragraph}</p>
              ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm uppercase tracking-[0.18em] text-warm">Next</p>
          <p className="text-sm leading-6 text-secondary">
            You can now edit, clone, delete, or use this world as canon for a new Story. Further world-to-story controls can come later.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/worlds/create" variant="ghost">
              Create another world
            </ButtonLink>
            <ButtonLink href="/" variant="ghost">
              Back home
            </ButtonLink>
          </div>
        </Card>
      </div>
    </main>
  );
}
