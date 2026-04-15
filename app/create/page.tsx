import { ButtonLink } from "@/components/ui/button";
import { CreateStoryForm } from "@/components/story/create-story-form";

export default function CreateStoryPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-warm">Story Compiler</p>
            <h1 className="text-4xl font-semibold text-foreground">Create a story</h1>
            <p className="max-w-2xl text-sm leading-6 text-secondary">
              Start fast with a quick prompt, or switch to advanced mode for a little more control
              before you compile a structured story setup.
            </p>
          </div>
          <ButtonLink href="/" variant="ghost">
            Back home
          </ButtonLink>
        </div>

        <CreateStoryForm />
      </div>
    </main>
  );
}
