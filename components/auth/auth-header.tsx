import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { signOut } from "@/app/auth/actions";
import { Button, ButtonLink } from "@/components/ui/button";

type AuthHeaderProps = {
  user: User | null;
};

export function AuthHeader({ user }: AuthHeaderProps) {
  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="text-sm font-medium uppercase tracking-[0.28em] text-gold">
          Story World Studio
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <nav className="flex items-center gap-4">
            <Link href="/create" className="text-sm text-mist transition hover:text-white">
              Create a story
            </Link>
            <Link href="/worlds/create" className="text-sm text-mist transition hover:text-white">
              Create a world
            </Link>
            {user ? (
              <>
                <Link href="/worlds" className="text-sm text-mist transition hover:text-white">
                  My Worlds
                </Link>
                <Link href="/stories" className="text-sm text-mist transition hover:text-white">
                  My Stories
                </Link>
                <Link href="/sessions" className="text-sm text-mist transition hover:text-white">
                  My Sessions
                </Link>
              </>
            ) : null}
          </nav>

          {user ? (
            <>
              <span className="hidden text-sm text-mist sm:inline">{user.email}</span>
              <form action={signOut}>
                <Button type="submit" variant="ghost">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <ButtonLink href="/auth/sign-in" variant="ghost">
                Sign in
              </ButtonLink>
              <ButtonLink href="/auth/sign-up">Sign up</ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
