import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Compatibility redirect for an older My Worlds route variant.
export default async function MyWorldsPage() {
  redirect("/worlds");
}
