"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  KeyRound,
  RadioTower,
  RefreshCw,
  ScanSearch,
  UserRound,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { authenticateWithAccessCode } from "@/lib/data/users";
import type { AccessAuthValues } from "@/lib/validation/auth";
import { accessAuthSchema } from "@/lib/validation/auth";
import {
  formatAccessCode,
  hasProvisionedAccessCodes,
  hashAccessCode,
  isAccessCodeProvisioned,
} from "@/lib/utils/access-code";
import { generateAliasBundle, generateNodeAlias } from "@/lib/utils/alias";
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
  const [phase, setPhase] = useState<"code" | "alias">("code");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aliasSuggestions, setAliasSuggestions] = useState<string[]>(() =>
    generateAliasBundle("nest", 5),
  );

  const {
    formState: { errors },
    handleSubmit,
    register,
    setError,
    clearErrors,
    setValue,
    trigger,
    watch,
  } = useForm<AccessAuthValues>({
    resolver: zodResolver(accessAuthSchema),
    defaultValues: {
      accessCode: "",
      username: "",
    },
  });

  const accessCode = watch("accessCode");
  const username = watch("username");

  useEffect(() => {
    if (!loading && user) {
      onAuthenticated?.();
    }
  }, [loading, onAuthenticated, user]);

  function refreshAliases(seed: string) {
    const nextSeed = seed || `${Date.now()}-${Math.random()}`;
    const nextAliases = generateAliasBundle(nextSeed, 5);

    setAliasSuggestions(nextAliases);

    if (!username) {
      setValue("username", nextAliases[0] ?? generateNodeAlias(nextSeed), {
        shouldDirty: true,
      });
    }
  }

  async function handleCodeCheck() {
    const valid = await trigger("accessCode");

    if (!valid) {
      return;
    }

    if (!hasProvisionedAccessCodes()) {
      setError("accessCode", {
        type: "manual",
        message:
          "Aucun code n’est provisionné. Génère d’abord des codes d’accès côté admin.",
      });
      return;
    }

    const codeHash = await hashAccessCode(accessCode);

    if (!isAccessCodeProvisioned(codeHash)) {
      setError("accessCode", {
        type: "manual",
        message: "Code introuvable ou révoqué.",
      });
      return;
    }

    clearErrors("accessCode");
    refreshAliases(accessCode);

    if (!watch("username")) {
      setValue("username", generateNodeAlias(accessCode), {
        shouldDirty: true,
      });
    }

    setPhase("alias");
  }

  async function onSubmit(values: AccessAuthValues) {
    setIsSubmitting(true);

    try {
      const result = await authenticateWithAccessCode(values);
      toast.success(
        result.created
          ? `Profil créé : ${result.username}.`
          : `Connexion${result.username ? ` : ${result.username}` : "."}`,
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

  return (
    <div className={["forum-access-panel", className].filter(Boolean).join(" ")}>
      <div className="forum-toolbar items-center justify-between">
        <span className="forum-pill">
          <RadioTower className="h-3.5 w-3.5" />
          Accès
        </span>
        <span className="forum-statusline">
          accès // 2035
        </span>
      </div>

      <h2 className="forum-title mt-5 text-4xl leading-none sm:text-5xl">
        CODE D&apos;ACCÈS
      </h2>
      <p className="forum-muted mt-4 max-w-2xl text-sm leading-7">
        Entre ton code pour ouvrir la session.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 grid gap-5">
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
              className="forum-input-shell-control uppercase tracking-[0.28em]"
            />
          </div>
          <div className="forum-code-preview">{formatAccessCode(accessCode)}</div>
          {errors.accessCode ? (
            <span className="text-xs text-[color:var(--danger)]">
              {errors.accessCode.message}
            </span>
          ) : null}
        </label>

        {phase === "alias" ? (
          <label className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="forum-inline-note">pseudo</span>
              <button
                type="button"
                className="forum-button-ghost"
                onClick={() => {
                  refreshAliases(`${accessCode}:${Date.now()}`);
                  setValue(
                    "username",
                    generateNodeAlias(`${accessCode}:${Date.now()}`),
                    {
                      shouldDirty: true,
                    },
                  );
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Pseudo aléatoire
              </button>
            </div>

            <div className="forum-input-shell forum-input-shell-terminal">
              <UserRound className="forum-input-shell-icon" />
              <input
                {...register("username")}
                autoComplete="nickname"
                spellCheck={false}
                placeholder="NullCitizen_42"
                className="forum-input-shell-control"
              />
            </div>

            <div className="forum-access-suggestions">
              {aliasSuggestions.map((alias) => (
                <button
                  key={alias}
                  type="button"
                  className="forum-suggestion-chip"
                  onClick={() => {
                    setValue("username", alias, { shouldDirty: true });
                  }}
                >
                  {alias}
                </button>
              ))}
            </div>

            <p className="forum-muted text-sm">
              Laisse vide pour utiliser un pseudo auto.
            </p>

            {errors.username ? (
              <span className="text-xs text-[color:var(--danger)]">
                {errors.username.message}
              </span>
            ) : null}
          </label>
        ) : null}

        <div className="forum-toolbar justify-between gap-3">
          {phase === "code" ? (
            <button
              type="button"
              onClick={() => {
                void handleCodeCheck();
              }}
              className="forum-button-primary"
            >
              <ScanSearch className="mr-2 h-4 w-4" />
              Continuer
            </button>
          ) : (
            <div className="forum-toolbar">
              <button
                type="button"
                onClick={() => {
                  setPhase("code");
                }}
                className="forum-button-ghost"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="forum-button-primary"
              >
                {isSubmitting ? "Connexion…" : "Entrer"}
              </button>
            </div>
          )}

          {showObserveAction ? (
            <button
              type="button"
              onClick={onObservePublic}
              className="forum-button-secondary"
            >
              Voir le forum
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
