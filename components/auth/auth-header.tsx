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

function HomeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.1rem] w-[1.1rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 10.25 12 3.75l8.25 6.5" />
      <path d="M6.75 9.75v9h10.5v-9" />
      <path d="M10 18.75v-4.5h4v4.5" />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.1rem] w-[1.1rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="7.5" />
      <path d="m14.9 9.1-1.8 5.1-5.1 1.8 1.8-5.1 5.1-1.8Z" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function StoriesIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.1rem] w-[1.1rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 5.25h9.5a2.25 2.25 0 0 1 2.25 2.25v10.25H8.25A2.25 2.25 0 0 0 6 20Z" />
      <path d="M6 5.25A2.25 2.25 0 0 0 3.75 7.5v10.25H14" />
      <path d="M9 9h5.5" />
      <path d="M9 12h5.5" />
    </svg>
  );
}

function SessionsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.1rem] w-[1.1rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.25l2.5 2.5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.1rem] w-[1.1rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 7.5h15" />
      <path d="M4.5 12h15" />
      <path d="M4.5 16.5h15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.1rem] w-[1.1rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
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
  return "inline-flex h-10 w-10 items-center justify-center rounded-full border border-line/80 bg-white/[0.02] text-secondary transition hover:border-[rgba(214,171,114,0.45)] hover:bg-white/[0.05] hover:text-foreground";
}

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function drawerLinkClasses(active: boolean) {
  return [
    "flex items-center gap-3 rounded-[1rem] border px-4 py-3 text-sm font-medium transition",
    active
      ? "border-[rgba(214,171,114,0.35)] bg-[rgba(214,171,114,0.12)] text-foreground"
      : "border-transparent bg-white/[0.02] text-secondary hover:border-line/80 hover:bg-white/[0.05] hover:text-foreground",
  ].join(" ");
}

export function AuthHeader({ user, identity }: AuthHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSessionPage = /^\/sessions\/[^/]+$/.test(pathname ?? "");
  const showSessionHeader = searchParams.get("nav") === "1";
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const primaryLabel = identity?.username || user?.email?.split("@")[0] || "Guest";
  const secondaryLabel = identity?.username ? `@${identity.username}` : null;
  const accountLabel = identity?.email ?? user?.email ?? null;
  const navItems = [
    { href: "/", label: "Home", icon: <HomeIcon /> },
    { href: "/explore", label: "Explore", icon: <ExploreIcon /> },
    ...(user ? [{ href: "/stories", label: "My Stories", icon: <StoriesIcon /> }] : []),
    ...(user ? [{ href: "/sessions", label: "Sessions", icon: <SessionsIcon /> }] : []),
  ];
  const isSidebarOpen = isMobileSidebarOpen || !isDesktopSidebarCollapsed;

  useEffect(() => {
    const savedValue = window.localStorage.getItem("everplot-sidebar-collapsed");

    if (savedValue === "true") {
      setIsDesktopSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        isMobileSidebarOpen &&
        window.innerWidth < 1024 &&
        !sidebarRef.current?.contains(event.target as Node) &&
        !sidebarButtonRef.current?.contains(event.target as Node)
      ) {
        setIsMobileSidebarOpen(false);
      }

      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    window.localStorage.setItem(
      "everplot-sidebar-collapsed",
      isDesktopSidebarCollapsed ? "true" : "false",
    );
    document.documentElement.style.setProperty(
      "--app-sidebar-width",
      isDesktopSidebarCollapsed ? "0rem" : "21rem",
    );

    return () => {
      document.documentElement.style.removeProperty("--app-sidebar-width");
    };
  }, [isDesktopSidebarCollapsed]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
    setIsAccountMenuOpen(false);
  }, [pathname]);

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setIsDesktopSidebarCollapsed((collapsed) => !collapsed);
      return;
    }

    setIsMobileSidebarOpen((open) => !open);
  }

  if (isSessionPage && !showSessionHeader) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line/70 bg-[rgba(8,9,12,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            ref={sidebarButtonRef}
            type="button"
            className={headerActionButtonClasses()}
            aria-label="Open navigation menu"
            aria-expanded={isSidebarOpen}
            onClick={toggleSidebar}
          >
            {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-3"
            aria-label="Everplot home"
          >
            <Image src={logo} alt="Everplot" className="h-7 w-auto sm:h-8" priority />
            <div className="hidden min-[430px]:block">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[rgba(214,171,114,0.88)]">
                Story Studio
              </p>
              <p className="text-sm text-secondary">Prompt, refine, publish, play</p>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center lg:flex">
            <label className="relative block w-full" htmlFor="site-search">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <SearchIcon />
              </span>
              <input
                id="site-search"
                type="search"
                placeholder="Search stories, characters, or authors"
                className="h-11 w-full rounded-full border border-fieldBorder bg-field/90 pl-12 pr-4 text-[0.95rem] text-foreground placeholder:text-muted focus:border-[rgba(214,171,114,0.55)] focus:outline-none focus:ring-2 focus:ring-[rgba(214,171,114,0.16)]"
              />
            </label>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link href="/explore" className={`${headerActionButtonClasses()} lg:hidden`} aria-label="Search">
              <SearchIcon />
            </Link>

            <ButtonLink
              href="/create"
              className="h-10 gap-2 rounded-full !border-[rgba(214,171,114,0.36)] !bg-[rgba(214,171,114,0.12)] px-4 !text-[rgba(247,242,233,0.98)] hover:!bg-[rgba(214,171,114,0.2)] hover:!text-white"
              aria-label="Create Story"
            >
              <SparklesIcon className="h-[1.05rem] w-[1.05rem] text-[rgba(214,171,114,0.98)]" />
              <span className="hidden text-[0.86rem] font-semibold sm:inline">Create Story</span>
            </ButtonLink>

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
                className={`${isAccountMenuOpen ? "block" : "hidden"} studio-panel absolute right-0 top-14 z-[60] w-[min(19rem,calc(100vw-2rem))] rounded-[1.35rem] border border-line/90 p-3`}
              >
                <div className="flex flex-col">
                  <div className="border-b border-line/80 px-3 pb-3">
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
                    </>
                  ) : null}

                  <Link
                    href="/settings"
                    className="px-3 py-2 text-sm text-secondary transition hover:text-foreground"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    Settings
                  </Link>

                  <div className="mt-2 border-t border-line/80 pt-2">
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

      <aside
        ref={sidebarRef}
        className={`studio-panel fixed inset-y-0 left-0 z-50 flex w-[min(21rem,calc(100vw-1rem))] flex-col border-r border-line/80 px-4 py-4 transition-transform duration-300 ease-out sm:px-5 lg:w-[21rem] ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-[105%]"} ${isDesktopSidebarCollapsed ? "lg:-translate-x-[105%]" : "lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Everplot home">
            <Image src={logo} alt="Everplot" className="h-7 w-auto" priority />
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[rgba(214,171,114,0.88)]">
                Story Studio
              </p>
              <p className="text-sm text-secondary">Quietly build better sessions</p>
            </div>
          </Link>

          <button
            type="button"
            className={`${headerActionButtonClasses()} lg:hidden`}
            aria-label="Close navigation menu"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-5">
          <label className="relative block" htmlFor="sidebar-search">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              <SearchIcon />
            </span>
            <input
              id="sidebar-search"
              type="search"
              placeholder="Search the library"
              className="h-11 w-full rounded-full border border-fieldBorder bg-field/90 pl-12 pr-4 text-[0.95rem] text-foreground placeholder:text-muted focus:border-[rgba(214,171,114,0.55)] focus:outline-none focus:ring-2 focus:ring-[rgba(214,171,114,0.16)]"
            />
          </label>
        </div>

        <nav className="mt-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={drawerLinkClasses(isActivePath(pathname, item.href))}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-6 rounded-[1.3rem] border border-line/80 bg-white/[0.03] p-4">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-[rgba(214,171,114,0.9)]">
            Workflow
          </p>
          <h2 className="mt-2 text-lg font-medium text-foreground">Prompt to playable story</h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Use the compiler for structure, refine the setup, then launch the session when it feels ready.
          </p>
          <ButtonLink
            href="/create"
            className="mt-4 h-10 w-full justify-center rounded-full !border-[rgba(214,171,114,0.36)] !bg-[rgba(214,171,114,0.12)] !text-[rgba(247,242,233,0.98)] hover:!bg-[rgba(214,171,114,0.2)] hover:!text-white"
          >
            <SparklesIcon className="h-[1rem] w-[1rem] text-[rgba(214,171,114,0.98)]" />
            <span className="text-[0.86rem] font-semibold">Create Story</span>
          </ButtonLink>
        </div>

        <div className="mt-auto rounded-[1.3rem] border border-line/80 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-foreground">{primaryLabel}</p>
          {secondaryLabel ? <p className="mt-1 text-xs text-muted">{secondaryLabel}</p> : null}
          <p className="mt-3 text-sm leading-6 text-secondary">
            Keep your stories private while drafting, then publish once the setup feels strong.
          </p>
        </div>
      </aside>
    </>
  );
}
