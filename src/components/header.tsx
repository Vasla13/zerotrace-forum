"use client";

import Image from "next/image";
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

const publicLinks = [{ href: "/", label: "Forum" }];

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
    <header className="sticky top-0 z-40 border-b border-[color:var(--line)] bg-[rgba(0,0,0,0.86)] backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <div className="forum-brandmark transition group-hover:-translate-y-0.5">
              <Image
                src="/nest-logo.png"
                alt="Logo NEST"
                width={585}
                height={427}
                priority
                className="forum-brandmark-image"
              />
            </div>
            <div>
              <div className="forum-wordmark text-[2rem] leading-none sm:text-[2.35rem]">
                NEST
              </div>
              <div className="forum-brand-tagline text-[11px] uppercase tracking-[0.24em]">
                net forum // 2035
              </div>
            </div>
          </Link>
          <nav className="hidden items-center gap-2 border border-[color:var(--line)] bg-[rgba(0,0,0,0.46)] p-1 md:flex">
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
                    "px-4 py-2 text-sm font-medium uppercase tracking-[0.18em] transition",
                    active
                      ? "border border-[color:var(--line-strong)] bg-[rgba(0,255,156,0.1)] text-white shadow-sm"
                      : "text-[color:var(--muted)] hover:bg-[rgba(0,255,156,0.05)] hover:text-[color:var(--foreground)]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="hidden items-center gap-3 border border-[color:var(--line)] bg-[rgba(0,255,156,0.04)] px-3 py-2 text-[11px] uppercase tracking-[0.2em] lg:flex">
            <span className="text-[color:var(--accent)]">nest</span>
            <span className="text-[color:var(--foreground)]">
              access // 2035
            </span>
          </div>
          {user ? (
            <>
              <Link href="/posts/new" className="forum-button-primary">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nouveau post</span>
              </Link>
              {profile ? (
                <Link
                  href={`/profile/${profile.usernameLower}`}
                  className="forum-button-ghost gap-2"
                >
                  <Avatar username={profile.username} size="sm" />
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
            <>
              <Link href="/login" className="forum-button-ghost">
                Connexion
              </Link>
              <Link href="/register" className="forum-button-primary">
                Entrer
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
