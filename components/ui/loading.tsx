import { cn } from "@/lib/utils";

export function LoadingDots({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 text-sm text-secondary", className)}>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span
          className="loading-dot h-1.5 w-1.5 rounded-full bg-accent"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="loading-dot h-1.5 w-1.5 rounded-full bg-accent"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="loading-dot h-1.5 w-1.5 rounded-full bg-accent"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span>{label}</span>
    </div>
  );
}

export function SkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return <div aria-hidden="true" className={cn("loading-skeleton rounded-lg", className)} />;
}

export function StoryReviewSkeletonScreen({ message }: { message: string }) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="space-y-8">
        <LoadingDots label={message} />
        <section className="space-y-4 border-b border-line pb-8">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-12 w-2/3 max-w-xl" />
          <SkeletonBlock className="h-4 w-full max-w-2xl" />
          <SkeletonBlock className="h-4 w-4/5 max-w-xl" />
          <div className="flex gap-3 pt-2">
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-10 w-28" />
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid gap-5">
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-11 w-full" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-28 w-full" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-36 w-full" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function SessionOpeningSkeletonScreen({ message }: { message: string }) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <div className="space-y-8">
        <LoadingDots label={message} />
        <section className="space-y-5 border-b border-line pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-3">
              <SkeletonBlock className="h-7 w-20" />
              <SkeletonBlock className="h-7 w-28" />
            </div>
            <SkeletonBlock className="h-9 w-20" />
          </div>
          <SkeletonBlock className="h-12 w-2/3 max-w-lg" />
        </section>

        <section className="space-y-4 border-b border-line pb-6">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-6 w-full max-w-2xl" />
          <SkeletonBlock className="h-6 w-[92%] max-w-3xl" />
          <SkeletonBlock className="h-6 w-[84%] max-w-2xl" />
        </section>

        <section className="space-y-4">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-36 w-full" />
          <div className="flex gap-3">
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-10 w-28" />
          </div>
        </section>
      </div>
    </main>
  );
}
