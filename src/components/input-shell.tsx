"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

type InputShellProps = ComponentPropsWithoutRef<"input"> & {
  icon: LucideIcon;
  shellClassName?: string;
};

export const InputShell = forwardRef<HTMLInputElement, InputShellProps>(
  function InputShell(
    { className, icon: Icon, shellClassName, ...props },
    ref,
  ) {
    return (
      <div className={clsx("forum-input-shell", shellClassName)}>
        <Icon className="forum-input-shell-icon" />
        <input
          ref={ref}
          {...props}
          className={clsx("forum-input-shell-control", className)}
        />
      </div>
    );
  },
);

InputShell.displayName = "InputShell";
