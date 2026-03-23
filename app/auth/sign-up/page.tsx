import { signUp } from "@/app/auth/actions";
import { AuthFormCard } from "@/components/auth/auth-form-card";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 sm:px-8 lg:px-10">
      <AuthFormCard
        title="Sign up"
        description="Create an account so the app can recognize you across sessions."
        action={signUp}
        submitLabel="Create account"
        alternateHref="/auth/sign-in"
        alternateLabel="Sign in"
        alternatePrompt="Already have an account?"
        passwordAutoComplete="new-password"
        message={message}
        error={error}
      />
    </main>
  );
}
