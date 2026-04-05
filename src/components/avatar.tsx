"use client";

import clsx from "clsx";
import { getAvatarInitial, getAvatarPalette } from "@/lib/utils/avatar";

type AvatarProps = {
  username: string;
  seed?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-16 w-16 text-lg",
} as const;

export function Avatar({
  username,
  seed,
  size = "md",
  className,
}: AvatarProps) {
  const palette = getAvatarPalette(seed ?? username);

  return (
    <div
      aria-hidden="true"
      className={clsx(
        "forum-avatar flex shrink-0 items-center justify-center font-semibold text-white shadow-lg",
        sizeMap[size],
        className,
      )}
      style={{
        backgroundImage: palette.background,
        boxShadow: `0 16px 28px ${palette.shadow}`,
      }}
    >
      {getAvatarInitial(username)}
    </div>
  );
}
