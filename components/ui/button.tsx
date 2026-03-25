import Link, { LinkProps } from "next/link";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const baseStyles =
  "inline-flex items-center justify-center rounded-full border border-transparent bg-warm px-5 py-3 text-sm font-medium text-page transition hover:scale-[1.01] hover:bg-[#d5b57d] focus:outline-none focus:ring-2 focus:ring-focus/50 disabled:cursor-not-allowed disabled:opacity-60";

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
          "border-line bg-surface text-foreground hover:border-fieldBorder hover:bg-elevated hover:text-foreground",
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
          "border-line bg-surface text-foreground hover:border-fieldBorder hover:bg-elevated hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
