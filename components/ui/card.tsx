import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-line bg-surface p-6 backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}
