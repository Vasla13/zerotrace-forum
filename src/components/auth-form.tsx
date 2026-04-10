"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { IdentityGatewayPanel } from "@/components/identity-gateway-panel";
import { useAuth } from "@/providers/auth-provider";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { configured, loading, user } = useAuth();

  const targetAfterAuth = searchParams.get("next") || "/";

  useEffect(() => {
    if (!loading && user) {
      router.replace(targetAfterAuth);
    }
  }, [loading, router, targetAfterAuth, user]);

  if (!configured) {
    return <ForumSetupNotice />;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="forum-auth-shell w-full">
        <div className="forum-auth-console">
          <div className="forum-auth-stage">
            <div className="forum-auth-glow forum-auth-glow-left" aria-hidden="true" />
            <div className="forum-auth-glow forum-auth-glow-right" aria-hidden="true" />

            <div className="forum-auth-brand">
              <div className="forum-auth-brand-frame">
                <span className="forum-auth-brand-line" />
                <div className="forum-auth-brand-core">
                  <Image
                    src="/image.png"
                    alt="Logo NEST"
                    width={585}
                    height={427}
                    priority
                    className="forum-auth-brand-image"
                  />
                </div>
                <span className="forum-auth-brand-line" />
              </div>
            </div>

            <div className="forum-auth-layout">
              <section className="forum-card forum-auth-card w-full p-5 sm:p-7 lg:p-8">
                <IdentityGatewayPanel
                  targetAfterAuth={targetAfterAuth}
                  className="forum-access-panel-login"
                />
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
