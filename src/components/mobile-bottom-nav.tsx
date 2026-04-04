"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { House, Plus, Search, UserRound } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { configured, profile, user } = useAuth();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => {
      setHash(window.location.hash);
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  if (!configured) {
    return null;
  }

  const profileHref = profile ? `/profile/${profile.usernameLower}` : "/login";
  const profileLabel = user ? "Profil" : "Accès";
  const ProfileIcon = UserRound;

  const navItems = [
    {
      href: "/",
      icon: House,
      label: "Flux",
      active: pathname === "/" && hash !== "#feed-search",
    },
    {
      href: "/#feed-search",
      icon: Search,
      label: "Recherche",
      active: pathname === "/" && hash === "#feed-search",
    },
    {
      href: profileHref,
      icon: UserRound,
      label: profileLabel,
      active:
        pathname.startsWith("/profile/") ||
        (!user && (pathname === "/login" || pathname === "/register")),
    },
  ] as const;

  function handleSearch() {
    if (pathname === "/") {
      window.location.hash = "feed-search";
      const element = document.getElementById("feed-search");
      element?.focus();
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    router.push("/#feed-search");
  }

  return (
    <div className="forum-mobile-dock">
      <nav className="forum-mobile-dock-inner" aria-label="Navigation mobile">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;

          if (item.label === "Recherche") {
            return (
              <button
                key={item.label}
                type="button"
                onClick={handleSearch}
                className={clsx(
                  "forum-mobile-dock-link",
                  item.active && "forum-mobile-dock-link-active",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "forum-mobile-dock-link",
                item.active && "forum-mobile-dock-link-active",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <Link
          href={user ? "/posts/new" : "/register"}
          className="forum-mobile-dock-post"
          aria-label={user ? "Créer un post" : "Créer un compte"}
          title={user ? "Poster" : "Entrer"}
        >
          <Plus className="h-5 w-5" />
        </Link>

        <Link
          href={navItems[2].href}
          className={clsx(
            "forum-mobile-dock-link",
            navItems[2].active && "forum-mobile-dock-link-active",
          )}
        >
          <ProfileIcon className="h-4 w-4" />
          <span>{navItems[2].label}</span>
        </Link>
      </nav>
    </div>
  );
}
