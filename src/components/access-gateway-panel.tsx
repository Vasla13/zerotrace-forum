"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, RefreshCw, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { authenticateWithAccessCode } from "@/lib/data/users";
import type { AccessAuthValues } from "@/lib/validation/auth";
import { accessAuthSchema } from "@/lib/validation/auth";
import { formatAccessCode } from "@/lib/utils/access-code";
import { generateNodeAlias } from "@/lib/utils/alias";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

type AccessGatewayPanelProps = {
  targetAfterAuth?: string;
  className?: string;
  showObserveAction?: boolean;
  onAuthenticated?: () => void;
  onObservePublic?: () => void;
};

export function AccessGatewayPanel({
  targetAfterAuth = "/",
  className,
  showObserveAction = false,
  onAuthenticated,
  onObservePublic,
}: AccessGatewayPanelProps) {
  const router = useRouter();
  const { configured, loading, user } = useAuth();
  const [seed, setSeed] = useState(() => `${Date.now()}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<AccessAuthValues>({
    resolver: zodResolver(accessAuthSchema),
    defaultValues: {
      accessCode: "",
      username: "",
    },
  });

  const accessCode = watch("accessCode");

  useEffect(() => {
    if (!loading && user) {
      onAuthenticated?.();
    }
  }, [loading, onAuthenticated, user]);

  async function onSubmit(values: AccessAuthValues) {
    setIsSubmitting(true);

    try {
      const result = await authenticateWithAccessCode(values);
      toast.success(
        result.created
          ? `Profil créé : ${result.username}.`
          : `Connexion : ${result.username}.`,
      );
      onAuthenticated?.();

      startTransition(() => {
        router.push(targetAfterAuth);
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!configured) {
    return null;
  }

  const generatedUsername = generateNodeAlias(`${accessCode}:${seed}`);

  return (
    <div className={["forum-access-panel", className].filter(Boolean).join(" ")}>
      <div className="forum-section-head items-start">
        <div>
          <h2 className="forum-title text-3xl sm:text-4xl">Accès</h2>
          <p className="forum-muted mt-2 text-sm">
            Code requis. Pseudo facultatif au premier passage.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4">
        <label className="grid gap-2">
          <span className="forum-inline-note">code</span>
          <div className="forum-input-shell forum-input-shell-terminal">
            <KeyRound className="forum-input-shell-icon" />
            <input
              {...register("accessCode")}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="NEST-XXXX-XXXX-XXXX"
              className="forum-input-shell-control uppercase tracking-[0.2em]"
            />
          </div>
          <div className="forum-code-preview">{formatAccessCode(accessCode)}</div>
          {errors.accessCode ? (
            <span className="text-xs text-[color:var(--danger)]">
              {errors.accessCode.message}
            </span>
          ) : null}
        </label>

        <label className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="forum-inline-note">pseudo optionnel</span>
            <button
              type="button"
              onClick={() => {
                const nextSeed = `${Date.now()}`;
                setSeed(nextSeed);
                setValue("username", generateNodeAlias(`${accessCode}:${nextSeed}`), {
                  shouldDirty: true,
                });
              }}
              className="forum-button-ghost"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Aléatoire
            </button>
          </div>
          <div className="forum-input-shell forum-input-shell-terminal">
            <UserRound className="forum-input-shell-icon" />
            <input
              {...register("username")}
              autoComplete="nickname"
              spellCheck={false}
              placeholder={generatedUsername}
              className="forum-input-shell-control"
            />
          </div>
          {errors.username ? (
            <span className="text-xs text-[color:var(--danger)]">
              {errors.username.message}
            </span>
          ) : null}
        </label>

        <div className="forum-toolbar justify-between gap-3">
          {showObserveAction ? (
            <button
              type="button"
              onClick={onObservePublic}
              className="forum-button-secondary"
            >
              Voir le forum
            </button>
          ) : (
            <span className="forum-muted text-sm">Lecture publique disponible.</span>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="forum-button-primary"
          >
            {isSubmitting ? "Connexion…" : "Entrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
