import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

type AuthFormCardProps = {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  alternatePrompt: string;
  passwordAutoComplete?: "current-password" | "new-password";
  message?: string;
  error?: string;
  next?: string;
};

export function AuthFormCard({
  title,
  description,
  action,
  submitLabel,
  alternateHref,
  alternateLabel,
  alternatePrompt,
  passwordAutoComplete = "current-password",
  message,
  error,
  next,
}: AuthFormCardProps) {
  return (
    <Card className="mx-auto w-full max-w-xl p-6 sm:p-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.24em] text-warm">Account</p>
          <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm leading-6 text-secondary">{description}</p>
        </div>

        {message ? (
          <div className="rounded-2xl border border-success/35 bg-success/12 p-4 text-sm text-foreground">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-danger/35 bg-danger/12 p-4 text-sm text-foreground">
            {error}
          </div>
        ) : null}

        <form action={action} className="space-y-5">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <Field label="Email">
            <Input type="email" name="email" required autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input type="password" name="password" required autoComplete={passwordAutoComplete} />
          </Field>
          <Button type="submit">{submitLabel}</Button>
        </form>

        <p className="text-sm text-secondary">
          {alternatePrompt}{" "}
          <Link className="text-cool underline decoration-cool/30 underline-offset-4" href={alternateHref}>
            {alternateLabel}
          </Link>
        </p>
      </div>
    </Card>
  );
}
