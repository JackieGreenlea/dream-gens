import { redirect } from "next/navigation";
import { RoleplaySandbox } from "@/components/roleplay/roleplay-sandbox";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function RoleplayPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in?message=Sign%20in%20to%20use%20the%20roleplay%20sandbox.");
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-warm">Sandbox</p>
            <h1 className="text-4xl font-semibold text-foreground">Roleplay</h1>
            <p className="max-w-2xl text-sm leading-6 text-secondary">
              A walled-off chat sandbox for testing roleplay instructions and replies without touching the story or session systems.
            </p>
          </div>
          <ButtonLink href="/" variant="ghost">
            Back home
          </ButtonLink>
        </div>

        <RoleplaySandbox />
      </div>
    </main>
  );
}
