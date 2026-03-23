import { ButtonLink } from "@/components/ui/button";
import { CreateCanonWorldForm } from "@/components/world/create-canon-world-form";

export default function CreateCanonWorldPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-gold">World Compiler</p>
            <h1 className="text-4xl font-semibold text-white">Create a world</h1>
            <p className="max-w-2xl text-sm leading-6 text-mist">
              Build a reusable canon container for future stories. This flow creates world lore and structure, not a playable setup.
            </p>
          </div>
          <ButtonLink href="/" variant="ghost">
            Back home
          </ButtonLink>
        </div>

        <CreateCanonWorldForm />
      </div>
    </main>
  );
}
