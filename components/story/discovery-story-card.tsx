import Link from "next/link";
import { cn } from "@/lib/utils";

type DiscoveryStoryCardProps = {
  title: string;
  description: string;
  accent: string;
  metadata: string[];
  imageUrl?: string | null;
  actionLabel?: string;
  actionHref?: string;
  imageAspectClassName?: string;
  className?: string;
  variant?: "grid" | "feed";
};

export function DiscoveryStoryCard({
  title,
  description,
  accent,
  metadata,
  imageUrl,
  actionLabel = "Play",
  actionHref,
  imageAspectClassName = "aspect-[4/5.2]",
  className,
  variant = "grid",
}: DiscoveryStoryCardProps) {
  const primaryMetadata = metadata.slice(0, 2);
  const footerMetadata = metadata.slice(2);

  if (variant === "feed") {
    return (
      <article
        className={cn(
          "overflow-hidden rounded-[1rem] border border-white/[0.04] bg-surface/[0.9] shadow-[0_4px_14px_rgba(0,0,0,0.07)] md:grid md:grid-cols-[minmax(16rem,24rem)_minmax(0,1fr)]",
          className,
        )}
      >
        <div className={cn("relative w-full overflow-hidden", imageAspectClassName)}>
          {imageUrl ? (
            <img src={imageUrl} alt={`${title} cover`} className="h-full w-full object-cover" />
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-br", accent)} />
          )}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(243,245,248,0.08),transparent_42%),linear-gradient(180deg,rgba(14,18,24,0.02)_0%,rgba(14,18,24,0.08)_44%,rgba(14,18,24,0.48)_100%)]" />
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-6 px-5 py-5 md:px-6 md:py-6">
          <div className="space-y-4">
            {primaryMetadata.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-secondary">
                {primaryMetadata.map((item, index) => (
                  <span key={`${item}-${index}`} className="flex items-center gap-3">
                    {index > 0 ? <span className="h-1 w-1 rounded-full bg-line/70" /> : null}
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="space-y-2">
              <h3 className="text-[2rem] font-semibold tracking-[-0.035em] text-foreground">
                {title}
              </h3>
              <p className="line-clamp-3 max-w-5xl text-base leading-7 text-secondary">
                {description}
              </p>
            </div>
          </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line/80 pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              {footerMetadata.length > 0
                ? footerMetadata.map((item, index) => (
                    <span key={`${item}-${index}`} className="flex items-center gap-4">
                      {index > 0 ? <span className="h-1 w-1 rounded-full bg-line/70" /> : null}
                      <span>{item}</span>
                    </span>
                  ))
                : metadata.map((item, index) => (
                    <span key={`${item}-${index}`} className="flex items-center gap-4">
                      {index > 0 ? <span className="h-1 w-1 rounded-full bg-line/70" /> : null}
                      <span>{item}</span>
                    </span>
                  ))}
            </div>

            {actionHref ? (
              <Link
                href={actionHref}
                className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground transition hover:text-accent"
              >
                {actionLabel}
              </Link>
            ) : (
              <span className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                {actionLabel}
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[0.95rem] border border-white/[0.04] bg-surface/[0.08] shadow-[0_4px_14px_rgba(0,0,0,0.07)]",
        className,
      )}
    >
      <div className={cn("relative w-full overflow-hidden", imageAspectClassName)}>
        {imageUrl ? (
          <img src={imageUrl} alt={`${title} cover`} className="h-full w-full object-cover" />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", accent)} />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(243,245,248,0.08),transparent_42%),linear-gradient(180deg,rgba(14,18,24,0.02)_0%,rgba(14,18,24,0.08)_44%,rgba(14,18,24,0.48)_100%)]" />
      </div>

      <div className="space-y-3 px-4 py-3.5">
        <h3 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-foreground">{title}</h3>
        <p className="line-clamp-3 text-sm leading-6 text-muted">{description}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.74rem] text-muted">
          {metadata.map((item, index) => (
            <span key={`${item}-${index}`} className="flex items-center gap-3">
              {index > 0 ? <span className="h-1 w-1 rounded-full bg-line/70" /> : null}
              <span>{item}</span>
            </span>
          ))}
        </div>
        <div className="pt-1">
          {actionHref ? (
            <Link
              href={actionHref}
              className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-foreground transition hover:text-accent"
            >
              {actionLabel}
            </Link>
          ) : (
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-foreground">
              {actionLabel}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
