import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { signOut } from "@/app/auth/actions";
import { Button, ButtonLink } from "@/components/ui/button";

type AuthHeaderProps = {
  user: User | null;
};

export function AuthHeader({ user }: AuthHeaderProps) {
  return (
    <header className="relative z-50 border-b border-white/10 bg-black/20 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4 sm:gap-4 sm:px-8 lg:px-10">
        <Link href="/" className="text-sm font-medium uppercase tracking-[0.28em] text-gold">
          Everplot
        </Link>

        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-wrap sm:justify-end">
          <nav className="relative z-50 shrink-0">
            <details className="group relative">
              <summary className="list-none cursor-pointer rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-mist transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white">
                Menu
              </summary>
              <div className="absolute right-0 top-12 z-[60] w-[min(16rem,calc(100vw-3rem))] rounded-3xl border border-white/10 bg-[#120f1c]/95 p-3 shadow-glow backdrop-blur sm:w-56">
                <div className="flex flex-col">
                  <Link
                    href="/create"
                    className="rounded-2xl px-3 py-2 text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Create a story
                  </Link>
                  <Link
                    href="/worlds/create"
                    className="rounded-2xl px-3 py-2 text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Create a world
                  </Link>
                  {user ? (
                    <>
                      <Link
                        href="/worlds"
                        className="rounded-2xl px-3 py-2 text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                      >
                        My Worlds
                      </Link>
                      <Link
                        href="/stories"
                        className="rounded-2xl px-3 py-2 text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                      >
                        My Stories
                      </Link>
                      <Link
                        href="/sessions"
                        className="rounded-2xl px-3 py-2 text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                      >
                        My Sessions
                      </Link>
                      <div className="mt-2 border-t border-white/10 px-3 pt-3 text-xs text-mist/80">
                        {user.email}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </details>
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
            <div className="flex items-center gap-2 sm:gap-3">
              <ButtonLink href="/auth/sign-in" variant="ghost">
                Sign in
              </ButtonLink>
              <ButtonLink href="/auth/sign-up">Sign up</ButtonLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
