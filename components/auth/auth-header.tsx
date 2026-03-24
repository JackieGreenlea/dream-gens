import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { signOut } from "@/app/auth/actions";
import { ButtonLink } from "@/components/ui/button";

type AuthHeaderProps = {
  user: User | null;
};

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
    >
      <path d="M12 12.25a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12.25Z" />
      <path d="M12 13.75c-4.17 0-7.25 2.16-7.25 5.12 0 .63.5 1.13 1.13 1.13h12.24c.62 0 1.13-.5 1.13-1.13 0-2.96-3.08-5.12-7.25-5.12Z" />
    </svg>
  );
}

function headerActionButtonClasses() {
  return "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-mist transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white";
}

export function AuthHeader({ user }: AuthHeaderProps) {
  const accountLabel = user?.email ?? "Guest";
  const username = user?.email?.split("@")[0] ?? "Guest";
  const centerControls = (
    <>
      <button
        type="button"
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-mist transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
      >
        Explore
      </button>
      <div className="min-w-[4.5rem] flex-1">
        <label className="sr-only" htmlFor="site-search">
          Search
        </label>
        <input
          id="site-search"
          type="search"
          placeholder="Search"
          className="h-11 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-mist/60 focus:border-white/20 focus:outline-none"
        />
      </div>
    </>
  );

  return (
    <header className="relative z-50 border-b border-white/10 bg-black/20 backdrop-blur">
      <div className="absolute left-1/2 top-1/2 hidden w-[clamp(11rem,54vw,52rem)] -translate-x-1/2 -translate-y-1/2 items-center gap-3 lg:flex">
        {centerControls}
      </div>

      <div className="flex w-full flex-wrap items-center gap-3 px-4 py-4 sm:px-8 lg:min-h-[76px] lg:px-10 lg:py-0">
        <div className="flex min-w-0 items-center justify-start lg:absolute lg:left-10 lg:top-1/2 lg:-translate-y-1/2">
          <Link
            href="/"
            className="inline-flex h-11 items-center text-sm font-medium uppercase tracking-[0.28em] text-gold"
          >
            Everplot
          </Link>
        </div>

        <div className="order-3 flex w-full items-center gap-3 lg:hidden">
          {centerControls}
        </div>

        <div className="ml-auto flex items-center justify-end gap-2 sm:gap-3 lg:absolute lg:right-10 lg:top-1/2 lg:ml-0 lg:-translate-y-1/2">
          <ButtonLink href="/create" className="h-11 px-4 py-0 sm:px-5">
            Create Story
          </ButtonLink>

          <button type="button" className={headerActionButtonClasses()} aria-label="Notifications">
            <BellIcon />
          </button>

          <details className="group relative">
            <summary
              className={`${headerActionButtonClasses()} list-none cursor-pointer text-[#b7b7b7]`}
              aria-label="Account menu"
            >
              <UserIcon />
            </summary>

            <div className="absolute right-0 top-14 z-[60] w-[min(18rem,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-[#120f1c]/95 p-3 shadow-glow backdrop-blur">
              <div className="flex flex-col">
                <div className="border-b border-white/10 px-3 pb-3">
                  <p className="text-sm font-medium text-white">{username}</p>
                  <p className="mt-1 text-xs text-mist/80">{accountLabel}</p>
                </div>

                <button
                  type="button"
                  className="mt-2 rounded-2xl px-3 py-2 text-left text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                >
                  My Profile
                </button>

                {user ? (
                  <>
                    <Link
                      href="/sessions"
                      className="rounded-2xl px-3 py-2 text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                    >
                      My Sessions
                    </Link>
                    <Link
                      href="/stories"
                      className="rounded-2xl px-3 py-2 text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                    >
                      My Stories
                    </Link>
                    <Link
                      href="/worlds"
                      className="rounded-2xl px-3 py-2 text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                    >
                      My Worlds
                    </Link>
                  </>
                ) : null}

                <button
                  type="button"
                  className="rounded-2xl px-3 py-2 text-left text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                >
                  Settings
                </button>

                <div className="mt-2 border-t border-white/10 pt-2">
                  {user ? (
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="w-full rounded-2xl px-3 py-2 text-left text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                      >
                        Sign out
                      </button>
                    </form>
                  ) : (
                    <Link
                      href="/auth/sign-in"
                      className="block rounded-2xl px-3 py-2 text-sm text-mist transition hover:bg-white/[0.08] hover:text-white"
                    >
                      Sign in
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
