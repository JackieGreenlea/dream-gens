import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Compatibility redirect for older links. The real setup route is /stories/[id]/characters.
export default async function StoryRootCharacterSelectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/stories/${id}/characters`);
}
