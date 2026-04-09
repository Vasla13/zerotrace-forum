"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
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
  const lastScrollYRef = useRef(0);
  const signalGateStorageKey = "nest.signal-gate.seen";

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

  async function handleSignOut() {
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
              <>
                {isAdmin ? (
                  <Link href="/admin" className="forum-button-ghost">
                    Admin
                  </Link>
                ) : null}
                {profile ? (
                  <Link
                    href={`/profile/${profile.usernameLower}`}
                    className="forum-button-ghost gap-2"
                  >
                    <Avatar
                      avatarUrl={profile.avatarUrl}
                      username={profile.username}
                      size="sm"
                    />
                    <span className="hidden sm:inline">{profile.username}</span>
                  </Link>
                ) : (
                  <span className="forum-button-ghost">
                    <UserRound className="mr-2 h-4 w-4" />
                    Profil
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="forum-button-icon"
                  aria-label="Se déconnecter"
                  title={isSigningOut ? "Déconnexion…" : "Se déconnecter"}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
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
