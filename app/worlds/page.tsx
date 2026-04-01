import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listWorldCanonsForUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import { formatLibraryDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MyWorldsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in?message=Sign%20in%20to%20view%20your%20worlds.");
  }

  const worlds = await listWorldCanonsForUser(user.id);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="space-y-6">
        <Card className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-warm">My Worlds</p>
          <h1 className="text-3xl font-semibold text-foreground">Your saved worlds</h1>
          <p className="max-w-3xl text-sm leading-6 text-secondary">
            Reopen a canon world profile or compile a new reusable setting container.
          </p>
        </Card>

        {worlds.length === 0 ? (
          <Card className="space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">No worlds yet</h2>
              <p className="text-sm leading-6 text-secondary">
                Compile your first canon world to start building a reusable setting library.
              </p>
            </div>
            <div className="flex justify-center">
              <ButtonLink href="/worlds/create">Create a world</ButtonLink>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {worlds.map((world) => (
              <Card
                key={world.id}
                className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-secondary">
                    <span>Updated {formatLibraryDate(world.updatedAt)}</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">{world.title}</h2>
                  <p className="max-w-3xl text-sm leading-6 text-secondary">{world.shortSummary}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href={`/worlds/${world.id}`} variant="ghost">
                    Open
                  </ButtonLink>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
