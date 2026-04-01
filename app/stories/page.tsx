import { redirect } from "next/navigation";
import { StoryPublishToggleButton } from "@/components/story/story-publish-toggle-button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteEntryButton } from "@/components/ui/delete-entry-button";
import { listStoriesForUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import { formatLibraryDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MyStoriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in?message=Sign%20in%20to%20view%20your%20stories.");
  }

  const stories = await listStoriesForUser(user.id);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="space-y-6">
        <Card className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-warm">My Stories</p>
          <h1 className="text-3xl font-semibold text-foreground">Your saved stories</h1>
          <p className="max-w-3xl text-sm leading-6 text-secondary">
            Reopen a story to review, customize, or jump back into character selection.
          </p>
        </Card>

        {stories.length === 0 ? (
          <Card className="space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">No stories yet</h2>
              <p className="text-sm leading-6 text-secondary">
                Compile your first premise to start building a private story library.
              </p>
            </div>
            <div className="flex justify-center">
              <ButtonLink href="/create">Create a story</ButtonLink>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {stories.map((story) => (
              <Card
                key={story.id}
                className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-secondary">
                    <span>Updated {formatLibraryDate(story.updatedAt)}</span>
                    {story.source === "story" ? (
                      <span>{story.visibility === "public" ? "Published" : "Private"}</span>
                    ) : null}
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">{story.title}</h2>
                  <p className="max-w-3xl text-sm leading-6 text-secondary">{story.summary}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ButtonLink
                    href={story.source === "story" ? `/stories/${story.id}` : `/worlds/${story.id}/edit`}
                    variant="ghost"
                  >
                    Open
                  </ButtonLink>
                  <ButtonLink
                    href={
                      story.source === "story"
                        ? `/stories/${story.id}/characters`
                        : `/worlds/${story.id}/characters`
                    }
                  >
                    Play
                  </ButtonLink>
                  {story.source === "story" ? (
                    <StoryPublishToggleButton
                      storyId={story.id}
                      visibility={story.visibility === "public" ? "public" : "private"}
                    />
                  ) : null}
                  <DeleteEntryButton
                    endpoint={
                      story.source === "story" ? `/api/stories/${story.id}` : `/api/worlds/${story.id}`
                    }
                    label="Delete"
                    signInMessage="Sign in to delete this story."
                    confirmMessage={`Delete "${story.title}"? Existing sessions will remain playable, but this story will be removed from My Stories.`}
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
