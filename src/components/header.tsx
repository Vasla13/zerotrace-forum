"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Plus, UserRound } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/avatar";
import { signOutForumUser } from "@/lib/data/users";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

const publicLinks = [{ href: "/", label: "Accueil" }];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOutForumUser();
      toast.success("Déconnexion effectuée.");
      startTransition(() => {
        router.push("/");
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(71,244,255,0.12)] bg-[rgba(3,7,17,0.76)] shadow-[0_14px_48px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center gap-3">
            <div className="forum-brandmark text-sm font-bold text-white transition group-hover:-translate-y-0.5">
              ZT
            </div>
            <div>
              <div className="forum-title text-2xl font-semibold uppercase tracking-[0.14em]">
                ZeroTrace
              </div>
              <div className="forum-muted text-[10px] uppercase tracking-[0.3em]">
                Forum réseau
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {publicLinks.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === link.href
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    active
                      ? "border border-[rgba(71,244,255,0.22)] bg-[rgba(71,244,255,0.08)] text-white shadow-sm"
                      : "text-[color:var(--muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[color:var(--foreground)]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {user ? (
            <>
              <Link href="/posts/new" className="forum-button-primary">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau
              </Link>
              {profile ? (
                <Link
                  href={`/profile/${profile.usernameLower}`}
                  className="forum-button-secondary gap-3"
                >
                  <Avatar username={profile.username} size="sm" />
                  <span className="hidden sm:inline">{profile.username}</span>
                </Link>
              ) : (
                <span className="forum-button-secondary">
                  <UserRound className="mr-2 h-4 w-4" />
                  Profil…
                </span>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="forum-button-secondary"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isSigningOut ? "Déconnexion…" : "Déconnexion"}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="forum-button-secondary">
                Connexion
              </Link>
              <Link href="/register" className="forum-button-primary">
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
