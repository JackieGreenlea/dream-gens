import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteEntryButton } from "@/components/ui/delete-entry-button";
import { listSessionsForUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import { formatLibraryDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MySessionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in?message=Sign%20in%20to%20view%20your%20sessions.");
  }

  const sessions = await listSessionsForUser(user.id);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="space-y-6">
        <Card className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-warm">My Sessions</p>
          <h1 className="text-3xl font-semibold text-foreground">Your active stories</h1>
          <p className="max-w-3xl text-sm leading-6 text-secondary">
            Resume recent sessions and continue from the last saved turn.
          </p>
        </Card>

        {sessions.length === 0 ? (
          <Card className="space-y-3 text-center">
            <h2 className="text-2xl font-semibold text-foreground">No sessions yet</h2>
            <p className="text-sm leading-6 text-secondary">
              Start a game from one of your stories and it will show up here.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-secondary">
                    <span>Updated {formatLibraryDate(session.updatedAt)}</span>
                    <span>Turn {session.turnCount}</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">{session.worldTitle}</h2>
                  <p className="text-sm leading-6 text-secondary">
                    {session.characterName
                      ? `Playing as ${session.characterName}`
                      : "No character selected"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href={`/sessions/${session.id}`}>Resume session</ButtonLink>
                  <DeleteEntryButton
                    endpoint={`/api/sessions/${session.id}`}
                    label="Delete"
                    signInMessage="Sign in to delete this session."
                    confirmMessage={`Delete this session for "${session.worldTitle}"? This permanently removes the run and its turn history.`}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
