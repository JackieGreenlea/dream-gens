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

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.95rem] w-[1.95rem]"
      fill="currentColor"
    >
      <rect x="10" y="4.5" width="4" height="15" rx="1" />
      <rect x="4.5" y="10" width="15" height="4" rx="1" />
    </svg>
  );
}

function headerActionButtonClasses() {
  return "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-transparent text-secondary transition hover:border-fieldBorder hover:bg-surface hover:text-foreground";
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
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-transparent px-0 text-secondary transition hover:border-fieldBorder hover:bg-surface hover:text-foreground md:h-10 md:w-auto md:border-transparent md:px-4 md:hover:border-transparent"
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
            className="h-10 w-10 gap-2 !border-line !bg-transparent px-0 py-0 !text-[#fdd835] hover:!border-[#fdd835]/45 hover:!bg-[#fdd835]/10 hover:!text-[#fdd835] md:h-10 md:w-auto md:!border-transparent md:!bg-[#fdd835] md:px-5 md:!text-night md:hover:!bg-[#e6c600] md:hover:!text-night"
            aria-label="Create Story"
          >
            <span className="md:hidden">
              <PlusIcon />
            </span>
            <span className="hidden md:inline">
              <PlusIcon />
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
