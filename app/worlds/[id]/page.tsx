import { notFound } from "next/navigation";
import { DeleteEntryButton } from "@/components/ui/delete-entry-button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorldPublishToggleButton } from "@/components/world/world-publish-toggle-button";
import { getWorldProfileById } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function renderParagraphs(text: string, className = "text-sm leading-7 text-secondary") {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return <p className={className}>None yet.</p>;
  }

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p key={`${paragraph.slice(0, 24)}-${index}`} className={className}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export default async function WorldProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const profile = await getWorldProfileById(id, user?.id ?? null);

  if (!profile) {
    notFound();
  }

  const { world, authorName, isOwner } = profile;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="grid gap-8 border-b border-line pb-8 lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.24em] text-warm">World</p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                {world.title}
              </h1>
              <div className="space-y-1 text-sm text-secondary">
                {authorName ? <p>by @{authorName}</p> : null}
                {isOwner ? (
                  <p>{world.visibility === "public" ? "Published world" : "Private world"}</p>
                ) : null}
              </div>
            </div>

            {world.shortSummary.trim() ? (
              <div className="space-y-3">
                <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">Summary</h2>
                {renderParagraphs(world.shortSummary)}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-4">
              {isOwner ? (
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <ButtonLink href={`/worlds/${world.id}/create-story`}>Create Story</ButtonLink>
                  <ButtonLink href={`/worlds/${world.id}/edit`} variant="ghost">
                    Edit
                  </ButtonLink>
                  <WorldPublishToggleButton
                    worldId={world.id}
                    visibility={world.visibility === "public" ? "public" : "private"}
                  />
                  <DeleteEntryButton
                    endpoint={`/api/worlds/${world.id}/canon`}
                    label="Delete"
                    signInMessage="Sign in to delete this world."
                    confirmMessage={`Delete "${world.title}"? Any stories created from it will remain, but this world will be removed from My Worlds.`}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {world.coverImageUrl ? (
            <div className="overflow-hidden rounded-xl lg:mt-10 lg:sticky lg:top-10">
              <img
                src={world.coverImageUrl}
                alt={`${world.title} cover`}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          ) : null}
        </section>

        <section className="space-y-3 border-b border-line pb-8">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">
            Long Description
          </h2>
          {renderParagraphs(world.longDescription)}
        </section>

        {world.setting.trim() ? (
          <section className="space-y-3 border-b border-line pb-8">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">Setting</h2>
            {renderParagraphs(world.setting)}
          </section>
        ) : null}

        {world.lore.trim() ? (
          <section className="space-y-3 border-b border-line pb-8">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">Lore</h2>
            {renderParagraphs(world.lore)}
          </section>
        ) : null}

        {world.history.trim() ? (
          <section className="space-y-3 border-b border-line pb-8">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">History</h2>
            {renderParagraphs(world.history)}
          </section>
        ) : null}

        {world.rules.trim() ? (
          <section className="space-y-3 border-b border-line pb-8">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">Rules</h2>
            {renderParagraphs(world.rules)}
          </section>
        ) : null}

        {world.cast.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">Cast</h2>
            <div className="divide-y divide-line">
              {world.cast.map((member, index) => (
                <div
                  key={`${world.id}-cast-${member.name}-${index}`}
                  className="space-y-2 py-4 first:pt-0"
                >
                  <p className="text-lg font-medium text-foreground">
                    {member.name}
                    {member.role?.trim() ? ` (${member.role.trim()})` : ""}
                  </p>
                  <p className="max-w-3xl text-sm leading-7 text-secondary">{member.description}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {!isOwner ? (
          <Card className="space-y-3">
            <p className="text-sm uppercase tracking-[0.18em] text-warm">World Profile</p>
            <p className="text-sm leading-6 text-secondary">
              This is a published world profile. Sign in to create and manage worlds of your own.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/worlds/create" variant="ghost">
                Create a world
              </ButtonLink>
              <ButtonLink href="/" variant="ghost">
                Back home
              </ButtonLink>
            </div>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
