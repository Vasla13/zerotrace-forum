"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/providers/auth-provider";

function SettingsRedirectInner() {
  const router = useRouter();
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) {
      return;
    }

    router.replace(`/profile/${profile.usernameLower}`);
  }, [profile, router]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="forum-card h-48 animate-pulse p-8" />
    </div>
  );
}

export default function SettingsRoutePage() {
  return (
    <AuthGuard>
      <SettingsRedirectInner />
    </AuthGuard>
  );
}
