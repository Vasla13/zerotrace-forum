"use client";

import { useEffect } from "react";
import type { ForumRealm } from "@/lib/forum/config";

type RealmThemeProps = {
  realm: ForumRealm;
};

export function RealmTheme({ realm }: RealmThemeProps) {
  useEffect(() => {
    document.body.dataset.forumRealm = realm;

    return () => {
      document.body.dataset.forumRealm = "public";
    };
  }, [realm]);

  return null;
}
