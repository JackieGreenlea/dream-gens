import { notFound, redirect } from "next/navigation";
import { CreateStoryFromWorldForm } from "@/components/world/create-story-from-world-form";
import { getOwnedWorldCanonById } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CreateStoryFromWorldPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in?message=Sign%20in%20to%20create%20a%20story%20from%20your%20world.");
  }

  const world = await getOwnedWorldCanonById(id, user.id);

  if (!world) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 sm:px-8 lg:px-10">
      <CreateStoryFromWorldForm world={world} />
    </main>
  );
}
