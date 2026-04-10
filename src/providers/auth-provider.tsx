"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import type { AdminSession } from "@/lib/types/admin";
import { fetchOptionalAdminSession } from "@/lib/data/admin";
import { subscribeToUserProfile } from "@/lib/data/users";
import { getFirebaseAuth, prepareFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import type { ForumUserProfile } from "@/lib/types/forum";

type AuthContextValue = {
  adminSession: AdminSession | null;
  canAccessShadow: boolean;
  configured: boolean;
  isAdmin: boolean;
  isCertified: boolean;
  loading: boolean;
  profile: ForumUserProfile | null;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ForumUserProfile | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }

    let active = true;
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeProfile: (() => void) | undefined;

    async function initAuth() {
      try {
        await prepareFirebaseAuth();

        if (!active) {
          return;
        }

        unsubscribeAuth = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
          setUser(nextUser);
          unsubscribeProfile?.();
          unsubscribeProfile = undefined;
          setAdminSession(null);

          if (!nextUser) {
            setProfile(null);
            setLoading(false);
            return;
          }

          setLoading(true);
          unsubscribeProfile = subscribeToUserProfile(
            nextUser.uid,
            (nextProfile) => {
              setProfile(nextProfile);
              setLoading(false);
            },
            () => {
              setLoading(false);
            },
          );

          void fetchOptionalAdminSession(nextUser)
            .then((nextAdminSession) => {
              if (!active) {
                return;
              }

              setAdminSession(nextAdminSession);
            })
            .catch(() => {
              if (!active) {
                return;
              }

              setAdminSession(null);
            });
        });
      } catch {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initAuth();

    return () => {
      active = false;
      unsubscribeAuth?.();
      unsubscribeProfile?.();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        adminSession,
        canAccessShadow:
          Boolean(adminSession?.isAdmin) ||
          profile?.certificationStatus === "approved",
        configured: isFirebaseConfigured,
        isAdmin: Boolean(adminSession?.isAdmin),
        isCertified: profile?.certificationStatus === "approved",
        loading,
        profile,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
