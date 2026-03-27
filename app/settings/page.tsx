import { redirect } from "next/navigation";
import { updateIdentity } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { getCurrentUser } from "@/lib/supabase/server";
import { ensureDatabaseUser } from "@/lib/user-sync";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in?message=Sign%20in%20to%20manage%20your%20account.");
  }

  const identity = await ensureDatabaseUser(user);
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">Settings</p>
        <h1 className="text-3xl font-semibold text-foreground">Username</h1>
        <p className="max-w-2xl text-sm leading-6 text-secondary">
          Your username is the public identity shown in the app. Email stays account-only.
        </p>
      </div>

      {params.error ? (
        <Card className="border-danger/30 bg-transparent p-5">
          <p className="text-sm font-medium text-foreground">Identity update failed</p>
          <p className="mt-2 text-sm leading-6 text-secondary">{params.error}</p>
        </Card>
      ) : null}

      {params.message ? (
        <Card className="border-success/30 bg-transparent p-5">
          <p className="text-sm font-medium text-foreground">{params.message}</p>
        </Card>
      ) : null}

      <Card className="p-6 sm:p-8">
        <form action={updateIdentity} className="space-y-5">
          <Field label="Username" hint="Lowercase letters, numbers, and hyphens only. This must be unique.">
            <Input
              name="username"
              defaultValue={identity.username}
              minLength={3}
              maxLength={32}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>

          <Field label="Email">
            <Input value={identity.email ?? ""} disabled readOnly />
          </Field>

          <div className="flex justify-end">
            <Button type="submit">Save username</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
