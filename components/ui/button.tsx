import Link, { LinkProps } from "next/link";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const baseStyles =
  "inline-flex items-center justify-center rounded-full border border-white/10 bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:scale-[1.01] hover:bg-gold hover:text-night focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-60";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        baseStyles,
        variant === "ghost" &&
          "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white",
        className,
      )}
      {...props}
    />
  );
});

type ButtonLinkProps = LinkProps & {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "ghost";
};

export function ButtonLink({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        baseStyles,
        variant === "ghost" &&
          "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
