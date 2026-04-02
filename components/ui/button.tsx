import Link, { LinkProps } from "next/link";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const baseStyles =
  "inline-flex items-center justify-center rounded-lg border border-transparent bg-accent px-4 py-2.5 text-sm font-medium text-night transition-colors hover:bg-[#e6c600] focus:outline-none focus:ring-2 focus:ring-focus/30 disabled:cursor-not-allowed disabled:opacity-60";

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
          "border-line bg-transparent text-secondary hover:border-fieldBorder hover:bg-surface hover:text-foreground",
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
          "border-line bg-transparent text-secondary hover:border-fieldBorder hover:bg-surface hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
