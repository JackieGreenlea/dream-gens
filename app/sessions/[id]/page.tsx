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
    <main className="fixed inset-0 overflow-hidden overscroll-none px-0 pt-0 pb-0 sm:left-1/2 sm:w-full sm:max-w-7xl sm:-translate-x-1/2 sm:px-3 sm:pt-0 sm:pb-0 lg:px-4">
      <PlaySessionShell
        sessionId={id}
        initialSession={bundle.session}
        initialStory={bundle.playableStory}
        initialCharacter={bundle.character}
      />
    </main>
  );
}
