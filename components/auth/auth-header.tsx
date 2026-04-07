import Image from "next/image";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import logo from "@/app/logo.png";
import { signOut } from "@/app/auth/actions";
import { ButtonLink } from "@/components/ui/button";

type AuthHeaderProps = {
  user: User | null;
  identity: {
    username: string;
    email: string | null;
  } | null;
};

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.7rem] w-[1.7rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.75 8.5a5.25 5.25 0 1 1 10.5 0v3.12c0 .7.22 1.38.63 1.95l.92 1.28c.21.3 0 .71-.37.71H5.57c-.37 0-.58-.41-.37-.71l.92-1.28c.41-.57.63-1.25.63-1.95V8.5Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.7rem] w-[1.7rem]"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[2.1rem] w-[2.1rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="7.5" />
      <path d="m14.9 9.1-1.8 5.1-5.1 1.8 1.8-5.1 5.1-1.8Z" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.55rem] w-[1.55rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function SparklesIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-[1.95rem] w-[1.95rem] ${className}`.trim()}
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5Zm9-3a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5Zm-1.5 13.5a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function headerActionButtonClasses() {
  return "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-transparent bg-transparent text-secondary transition hover:bg-surface hover:text-foreground";
}

export function AuthHeader({ user, identity }: AuthHeaderProps) {
  const primaryLabel = identity?.username || user?.email?.split("@")[0] || "Guest";
  const secondaryLabel = identity?.username ? `@${identity.username}` : null;
  const accountLabel = identity?.email ?? user?.email ?? null;
  const centerControls = (
    <>
      <Link
        href="/explore"
        aria-label="Explore"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-transparent px-0 py-0 text-secondary transition hover:bg-surface hover:text-foreground md:h-10 md:w-auto md:px-4 md:py-2.5"
      >
        <ExploreIcon />
        <span className="hidden text-[1.04rem] font-bold md:inline">Explore</span>
      </Link>
      <div className="hidden min-w-[4.5rem] flex-1 md:block">
        <label className="sr-only" htmlFor="site-search">
          Search
        </label>
        <input
          id="site-search"
          type="search"
          placeholder="Search"
          className="h-10 w-full rounded-lg border border-fieldBorder bg-field px-4 text-[1.04rem] text-foreground placeholder:text-muted focus:border-[#fdd835] focus:outline-none focus:ring-2 focus:ring-[#fdd835]/20"
        />
      </div>
      <Link href="/explore" className={`${headerActionButtonClasses()} md:hidden`} aria-label="Search">
        <SearchIcon />
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-night/95 backdrop-blur">
      <div className="absolute left-1/2 top-1/2 hidden w-[clamp(11rem,54vw,52rem)] -translate-x-1/2 -translate-y-1/2 items-center gap-3 lg:flex">
        {centerControls}
      </div>

      <div className="flex w-full items-center gap-3 px-4 py-4 sm:px-8 lg:min-h-[76px] lg:px-10 lg:py-0">
        <div className="flex min-w-0 items-center justify-start lg:absolute lg:left-10 lg:top-1/2 lg:-translate-y-1/2">
          <Link
            href="/"
            className="inline-flex h-11 items-center"
            aria-label="Everplot home"
          >
            <Image src={logo} alt="Everplot" className="h-9 w-auto md:h-11" priority />
          </Link>
        </div>

        <div className="ml-auto flex items-center justify-end gap-2 sm:gap-3 lg:absolute lg:right-10 lg:top-1/2 lg:ml-0 lg:-translate-y-1/2">
          <div className="flex items-center gap-2 lg:hidden">{centerControls}</div>

          <ButtonLink
            href="/create"
            className="h-10 w-10 gap-2 !border-transparent !bg-transparent px-0 py-0 !text-[#fdd835] hover:!bg-[#fdd835]/10 hover:!text-[#fdd835] md:h-10 md:w-auto md:!border-transparent md:!bg-transparent md:px-5 md:!text-[#fdd835] md:hover:!bg-[#fdd835]/10 md:hover:!text-[#fdd835]"
            aria-label="Create Story"
          >
            <span className="md:hidden">
              <SparklesIcon className="text-[#fdd835]" />
            </span>
            <span className="hidden md:inline">
              <SparklesIcon className="text-[#fdd835]" />
            </span>
            <span className="hidden text-[1.04rem] font-bold md:inline">Create Story</span>
          </ButtonLink>

          <button type="button" className={headerActionButtonClasses()} aria-label="Notifications">
            <BellIcon />
          </button>

          <details className="group relative">
            <summary
              className={`${headerActionButtonClasses()} list-none cursor-pointer`}
              aria-label="Account menu"
            >
              <UserIcon />
            </summary>

            <div className="absolute right-0 top-14 z-[60] w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-3 backdrop-blur">
              <div className="flex flex-col">
                <div className="border-b border-line px-3 pb-3">
                  <p className="text-sm font-medium text-foreground">{primaryLabel}</p>
                  {secondaryLabel ? <p className="mt-1 text-xs text-muted">{secondaryLabel}</p> : null}
                  {accountLabel ? <p className="mt-1 text-xs text-muted">{accountLabel}</p> : null}
                </div>

                {user && identity ? (
                  <Link
                    href={`/u/${identity.username}`}
                    className="mt-2 px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                  >
                    My Profile
                  </Link>
                ) : null}

                {user ? (
                  <>
                    <Link
                      href="/sessions"
                      className="px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                    >
                      My Sessions
                    </Link>
                    <Link
                      href="/stories"
                      className="px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                    >
                      My Stories
                    </Link>
                    <Link
                      href="/worlds"
                      className="px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                    >
                      My Worlds
                    </Link>
                  </>
                ) : null}

                <Link
                  href="/settings"
                  className="px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                >
                  Settings
                </Link>

                <div className="mt-2 border-t border-line pt-2">
                  {user ? (
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="w-full px-3 py-2 text-left text-sm text-secondary transition hover:text-foreground"
                      >
                        Sign out
                      </button>
                    </form>
                  ) : (
                    <Link
                      href="/auth/sign-in"
                      className="block px-3 py-2 text-sm text-secondary transition hover:text-foreground"
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
