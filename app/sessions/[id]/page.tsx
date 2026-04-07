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
    <main className="h-[calc(100dvh-4.5rem)] overflow-hidden max-w-none px-0 pt-1 pb-0 sm:mx-auto sm:h-[calc(100dvh-5.5rem)] sm:max-w-7xl sm:px-4 sm:pt-2 sm:pb-0 lg:h-[calc(100dvh-76px)] lg:px-6">
      <PlaySessionShell
        sessionId={id}
        initialSession={bundle.session}
        initialWorld={bundle.world}
        initialCharacter={bundle.character}
      />
    </main>
  );
}
