"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { useAuth } from "@/providers/auth-provider";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { configured, loading, user } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  if (!configured) {
    return <ForumSetupNotice />;
  }

  if (loading || !user) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
        <section className="forum-card w-full p-8 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--line)] border-t-[color:var(--accent)]" />
          <p className="forum-muted mt-5 text-sm">
            Vérification de ta session…
          </p>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
