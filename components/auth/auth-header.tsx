"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
      className="h-[1.35rem] w-[1.35rem] sm:h-[1.7rem] sm:w-[1.7rem]"
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
      className="h-[1.35rem] w-[1.35rem] sm:h-[1.7rem] sm:w-[1.7rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.25c1.37-2.76 3.84-4.25 6.5-4.25s5.13 1.49 6.5 4.25" />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.6rem] w-[1.6rem] sm:h-[2.1rem] sm:w-[2.1rem]"
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
      className="h-[1.25rem] w-[1.25rem] sm:h-[1.55rem] sm:w-[1.55rem]"
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
      className={`h-[1.45rem] w-[1.45rem] sm:h-[1.95rem] sm:w-[1.95rem] ${className}`.trim()}
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
  return "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-transparent text-secondary transition hover:bg-surface hover:text-foreground sm:h-9 sm:w-9";
}

export function AuthHeader({ user, identity }: AuthHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSessionPage = /^\/sessions\/[^/]+$/.test(pathname ?? "");
  const showSessionHeader = searchParams.get("nav") === "1";
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const primaryLabel = identity?.username || user?.email?.split("@")[0] || "Guest";
  const secondaryLabel = identity?.username ? `@${identity.username}` : null;
  const accountLabel = identity?.email ?? user?.email ?? null;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const centerControls = (
    <>
      <Link
        href="/explore"
        aria-label="Explore"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-transparent px-0 py-0 text-secondary transition hover:bg-surface hover:text-foreground md:h-9 md:w-auto md:px-3 md:py-2"
      >
        <ExploreIcon />
        <span className="hidden text-[0.92rem] font-bold md:inline">Explore</span>
      </Link>
      <div className="hidden w-full max-w-[34rem] min-w-[4.5rem] flex-1 md:block">
        <label className="sr-only" htmlFor="site-search">
          Search
        </label>
        <input
          id="site-search"
          type="search"
          placeholder="Search"
          className="h-9 w-full rounded-lg border border-fieldBorder bg-field px-4 text-[0.92rem] text-foreground placeholder:text-muted focus:border-[#fdd835] focus:outline-none focus:ring-2 focus:ring-[#fdd835]/20"
        />
      </div>
      <Link href="/explore" className={`${headerActionButtonClasses()} md:hidden`} aria-label="Search">
        <SearchIcon />
      </Link>
    </>
  );

  if (isSessionPage && !showSessionHeader) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-night/75 backdrop-blur">
      <div className="flex w-full items-center gap-2.5 px-4 py-1.5 sm:gap-3 sm:px-8 sm:py-2 lg:mx-auto lg:grid lg:min-h-[58px] lg:max-w-[1440px] lg:grid-cols-[auto_minmax(0,40rem)_auto] lg:items-center lg:gap-6 lg:px-8 lg:py-0">
        <div className="flex min-w-0 items-center justify-start">
          <Link
            href="/"
            className="inline-flex h-7 items-center sm:h-9"
            aria-label="Everplot home"
          >
            <Image src={logo} alt="Everplot" className="h-[1.2rem] w-auto sm:h-7 md:h-7" priority />
          </Link>
        </div>

        <div className="hidden min-w-0 items-center justify-self-center lg:flex">{centerControls}</div>

        <div className="ml-auto flex items-center justify-end gap-2 sm:gap-3 lg:ml-0">
          <div className="flex items-center gap-2 lg:hidden">{centerControls}</div>

          <ButtonLink
            href="/create"
            className="h-8 w-8 gap-2 !border-transparent !bg-transparent px-0 py-0 !text-[#fdd835] hover:!bg-[#fdd835]/10 hover:!text-[#fdd835] md:h-9 md:w-auto md:!border-transparent md:!bg-transparent md:px-4 md:!text-[#fdd835] md:hover:!bg-[#fdd835]/10 md:hover:!text-[#fdd835]"
            aria-label="Create Story"
          >
            <span className="md:hidden">
              <SparklesIcon className="text-[#fdd835]" />
            </span>
            <span className="hidden md:inline">
              <SparklesIcon className="text-[#fdd835]" />
            </span>
            <span className="hidden text-[0.92rem] font-bold md:inline">Create Story</span>
          </ButtonLink>

          <button type="button" className={headerActionButtonClasses()} aria-label="Notifications">
            <BellIcon />
          </button>

          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              className={headerActionButtonClasses()}
              aria-label="Account menu"
              aria-expanded={isAccountMenuOpen}
              onClick={() => setIsAccountMenuOpen((open) => !open)}
            >
              <UserIcon />
            </button>

            <div
              className={`${isAccountMenuOpen ? "block" : "hidden"} absolute right-0 top-14 z-[60] w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-3 backdrop-blur`}
            >
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
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                ) : null}

                {user ? (
                  <>
                    <Link
                      href="/sessions"
                      className="px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      My Sessions
                    </Link>
                    <Link
                      href="/stories"
                      className="px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      My Stories
                    </Link>
                    <Link
                      href="/worlds"
                      className="px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      My Worlds
                    </Link>
                  </>
                ) : null}

                <Link
                  href="/settings"
                  className="px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                  onClick={() => setIsAccountMenuOpen(false)}
                >
                  Settings
                </Link>

                <Link
                  href="/roleplay"
                  className="px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                  onClick={() => setIsAccountMenuOpen(false)}
                >
                  Roleplay
                </Link>

                <Link
                  href="/worlds/create"
                  className="px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                  onClick={() => setIsAccountMenuOpen(false)}
                >
                  Create World
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
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
