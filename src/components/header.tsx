"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Plus, Shield, UserRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { signOutForumUser } from "@/lib/data/users";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, profile, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isHiddenOnScroll, setIsHiddenOnScroll] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const lastScrollYRef = useRef(0);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const signalGateStorageKey = "nest.signal-gate.seen";
  const hideHeader = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    setIsHiddenOnScroll(false);

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const previousScrollY = lastScrollYRef.current;
      const delta = currentScrollY - previousScrollY;

      if (currentScrollY <= 64) {
        setIsHiddenOnScroll(false);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (delta > 6) {
        setIsHiddenOnScroll(true);
      } else if (delta < -6) {
        setIsHiddenOnScroll(false);
      }

      lastScrollYRef.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname]);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!profileMenuRef.current) {
        return;
      }

      const target = event.target;

      if (target instanceof Node && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("touchstart", handlePointerDown, { passive: true });
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  async function handleSignOut() {
    setIsProfileMenuOpen(false);
    setIsSigningOut(true);
    try {
      await signOutForumUser();
      window.sessionStorage.removeItem(signalGateStorageKey);
      toast.success("Déconnexion effectuée.");
      startTransition(() => {
        router.replace("/login");
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  }

  if (hideHeader) {
    return null;
  }

  return (
    <header className={isHiddenOnScroll ? "forum-header forum-header-hidden" : "forum-header"}>
      <div className="forum-header-banner">
        <div className="mx-auto flex min-h-[7.5rem] w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:min-h-[9rem] sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="forum-brandmark transition group-hover:-translate-y-0.5">
              <Image
                src="/image.png"
                alt="Logo NEST"
                width={585}
                height={427}
                priority
                className="forum-brandmark-image"
              />
            </div>
            <div className="forum-wordmark text-[2rem] leading-none sm:text-[2.7rem]">
              NEST
            </div>
          </Link>

          <div className="forum-header-actions">
            {user ? (
              <div ref={profileMenuRef} className="forum-profile-menu">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen((current) => !current);
                  }}
                  className="forum-profile-trigger"
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Ouvrir le menu profil"
                >
                  {profile ? (
                    <Avatar
                      avatarUrl={profile.avatarUrl}
                      username={profile.username}
                      size="sm"
                    />
                  ) : (
                    <span className="forum-profile-trigger-fallback">
                      <UserRound className="h-4 w-4" />
                    </span>
                  )}
                  <span className="forum-profile-trigger-name">
                    {profile?.username ?? "Profil"}
                  </span>
                  <ChevronDown
                    className={
                      isProfileMenuOpen
                        ? "forum-profile-trigger-chevron forum-profile-trigger-chevron-open"
                        : "forum-profile-trigger-chevron"
                    }
                  />
                </button>

                {isProfileMenuOpen ? (
                  <div className="forum-profile-dropdown" role="menu">
                    {profile ? (
                      <Link
                        href={`/profile/${profile.usernameLower}`}
                        className="forum-profile-dropdown-item"
                        role="menuitem"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                        }}
                      >
                        <UserRound className="h-4 w-4" />
                        Mon profil
                      </Link>
                    ) : null}
                    <Link
                      href="/posts/new"
                      className="forum-profile-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Publier
                    </Link>
                    {isAdmin ? (
                      <Link
                        href="/admin"
                        className="forum-profile-dropdown-item"
                        role="menuitem"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                        }}
                      >
                        <Shield className="h-4 w-4" />
                        Admin
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        void handleSignOut();
                      }}
                      disabled={isSigningOut}
                      className="forum-profile-dropdown-item forum-profile-dropdown-item-danger"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" />
                      {isSigningOut ? "Déconnexion…" : "Déconnexion"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link href="/login" className="forum-button-primary">
                Accès
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
