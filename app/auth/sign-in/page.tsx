import { AuthFormCard } from "@/components/auth/auth-form-card";
import { signIn } from "@/app/auth/actions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:px-8 lg:px-10">
      <AuthFormCard
        title="Sign in"
        description="Access your account to keep working inside Story World Studio."
        action={signIn}
        submitLabel="Sign in"
        alternateHref="/auth/sign-up"
        alternateLabel="Create one"
        alternatePrompt="Need an account?"
        message={message}
        error={error}
        next={next}
      />
    </main>
  );
}
