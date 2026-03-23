import { ButtonLink } from "@/components/ui/button";
import { CreateWorldForm } from "@/components/world/create-world-form";

export default function CreateWorldPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-gold">Story Compiler</p>
            <h1 className="text-4xl font-semibold text-white">Create a story</h1>
            <p className="max-w-2xl text-sm leading-6 text-mist">
              Capture a rough premise, add a little direction if you want, and compile it into an editable playable story.
            </p>
          </div>
          <ButtonLink href="/" variant="ghost">
            Back home
          </ButtonLink>
        </div>

        <CreateWorldForm />
      </div>
    </main>
  );
}
