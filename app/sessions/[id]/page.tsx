import { notFound, redirect } from "next/navigation";
import { PlaySessionShell } from "@/components/play/play-session-shell";
import { getSessionBundle } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in?message=Sign%20in%20to%20continue%20your%20session.");
  }

  const bundle = await getSessionBundle(id, user.id);

  if (!bundle) {
    notFound();
  }

  return (
    <main className="fixed inset-x-0 bottom-0 top-[4.5rem] overflow-hidden px-0 pt-1 pb-0 sm:left-1/2 sm:w-full sm:max-w-7xl sm:-translate-x-1/2 sm:top-[5.5rem] sm:px-4 sm:pt-2 sm:pb-0 lg:top-[76px] lg:px-6">
      <PlaySessionShell
        sessionId={id}
        initialSession={bundle.session}
        initialWorld={bundle.world}
        initialCharacter={bundle.character}
      />
    </main>
  );
}
