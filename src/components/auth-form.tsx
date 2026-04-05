"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RadioTower } from "lucide-react";
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
    <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center">
      <div className="forum-auth-shell w-full">
        <section className="forum-card forum-auth-card w-full p-6 sm:p-8">
          <div className="forum-section-head items-start">
            <div>
              <span className="forum-pill">
                <RadioTower className="h-3.5 w-3.5" />
                {isRegisterMode ? "Nouveau profil" : "Connexion"}
              </span>
              <h1 className="forum-title mt-5 text-4xl sm:text-5xl">
                {isRegisterMode
                  ? "Créer ton profil"
                  : "Accès au forum"}
              </h1>
            </div>
            <span className="forum-inline-note">nest // 2035</span>
          </div>

          <div className="mt-7">
            <AccessGatewayPanel targetAfterAuth={targetAfterAuth} />
          </div>

          <div className="forum-divider mt-6" />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="forum-muted">
              {isRegisterMode
                ? "Pas d’inscription classique."
                : "Accès par code uniquement."}
            </span>
            <Link
              href={isRegisterMode ? "/login" : "/register"}
              className="forum-link font-semibold"
            >
              {isRegisterMode ? "Connexion" : "Créer un profil"}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
