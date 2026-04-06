"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { AccessGatewayPanel } from "@/components/access-gateway-panel";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { useAuth } from "@/providers/auth-provider";

type AuthFormMode = "login" | "register";

type AuthFormProps = {
  mode: AuthFormMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { configured, loading, user } = useAuth();

  const targetAfterAuth = searchParams.get("next") || "/";
  const isRegisterMode = mode === "register";

  useEffect(() => {
    if (!loading && user) {
      router.replace(targetAfterAuth);
    }
  }, [loading, router, targetAfterAuth, user]);

  if (!configured) {
    return <ForumSetupNotice />;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center">
      <div className="forum-auth-shell w-full">
        <div className="forum-auth-console">
          <nav className="forum-auth-menu" aria-label="Entrée">
            <Link
              href="/login"
              className={clsx(
                "forum-auth-menu-link",
                !isRegisterMode && "forum-auth-menu-link-active",
              )}
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className={clsx(
                "forum-auth-menu-link",
                isRegisterMode && "forum-auth-menu-link-active",
              )}
            >
              Premier passage
            </Link>
            <Link href="/" className="forum-auth-menu-link">
              Forum public
            </Link>
          </nav>

          <div className="forum-auth-layout">
            <section className="forum-card forum-auth-card w-full p-6 sm:p-8">
              <AccessGatewayPanel targetAfterAuth={targetAfterAuth} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
