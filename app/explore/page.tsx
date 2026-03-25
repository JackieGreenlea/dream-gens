import { ExploreBrowser } from "@/components/explore/explore-browser";

export const dynamic = "force-dynamic";

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-page">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <ExploreBrowser />
      </div>
    </main>
  );
}
