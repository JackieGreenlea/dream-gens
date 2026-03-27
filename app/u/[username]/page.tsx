import { notFound } from "next/navigation";
import { updatePublicProfileBio } from "@/app/u/[username]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { DiscoveryStoryCard } from "@/components/story/discovery-story-card";
import { getPublicUserProfileByUsername } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureDatabaseUser } from "@/lib/user-sync";
import { formatLibraryDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PublicUserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { username } = await params;
  const currentUser = await getCurrentUser();
  const currentIdentity = currentUser ? await ensureDatabaseUser(currentUser) : null;
  const profile = await getPublicUserProfileByUsername(username);
  const query = await searchParams;

  if (!profile) {
    notFound();
  }

  const isOwner = currentIdentity?.username === profile.username;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="space-y-8">
        <section className="space-y-3 border-b border-line pb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-warm">Profile</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
            @{profile.username}
          </h1>
          {profile.bio ? (
            <p className="max-w-3xl text-sm leading-7 text-secondary">{profile.bio}</p>
          ) : null}
          {query.error ? <p className="text-sm text-danger">{query.error}</p> : null}
          {query.message ? <p className="text-sm text-secondary">{query.message}</p> : null}
          {isOwner ? (
            <form action={updatePublicProfileBio} className="max-w-3xl space-y-3 pt-3">
              <input type="hidden" name="username" value={profile.username} />
              <Textarea
                name="bio"
                defaultValue={profile.bio ?? ""}
                placeholder="Add a short bio."
                className="min-h-28"
                maxLength={400}
              />
              <div className="flex justify-start">
                <Button type="submit">Save bio</Button>
              </div>
            </form>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-secondary">
              Published Stories
            </h2>
            <p className="text-sm text-secondary">
              Public stories by @{profile.username}.
            </p>
          </div>

          {profile.stories.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {profile.stories.map((story) => (
                <DiscoveryStoryCard
                  key={story.id}
                  title={story.title}
                  description={story.summary}
                  accent="from-[#0091AD] via-[#00768D] to-slate-950"
                  authorName={story.authorUsername}
                  authorHref={`/u/${story.authorUsername}`}
                  metadata={[
                    story.publishedAt ? formatLibraryDate(story.publishedAt) : "Published",
                    "Published",
                  ]}
                  imageUrl={story.coverImageUrl}
                  actionHref={`/stories/${story.id}/characters`}
                  profileHref={`/stories/${story.id}`}
                  imageAspectClassName="aspect-[4/4.35]"
                />
              ))}
            </div>
          ) : (
            <div className="border-t border-line pt-6">
              <p className="text-lg font-medium text-foreground">No published stories yet</p>
              <p className="mt-2 text-sm leading-6 text-secondary">
                This profile will show public stories once they are published.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
