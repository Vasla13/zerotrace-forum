"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, UserRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { signOutForumUser } from "@/lib/data/users";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

export function Header() {
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
            <div className="forum-wordmark text-[2rem] leading-none sm:text-[2.35rem]">
              NEST
            </div>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {user ? (
            <>
              <Link href="/admin" className="forum-button-ghost">
                Admin
              </Link>
              <Link href="/posts/new" className="forum-button-primary">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Publier</span>
              </Link>
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
