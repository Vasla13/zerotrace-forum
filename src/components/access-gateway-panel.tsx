"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, KeyRound, RefreshCw, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  authenticateWithAccessCode,
  type AccessAuthResult,
} from "@/lib/data/users";
import type { AccessAuthValues } from "@/lib/validation/auth";
import { accessAuthSchema } from "@/lib/validation/auth";
import { formatAccessCode } from "@/lib/utils/access-code";
import { generateAliasBundle } from "@/lib/utils/alias";
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

type GatewayStep = "code" | "username";

export function AccessGatewayPanel({
  targetAfterAuth = "/",
  className,
  showObserveAction = false,
  onAuthenticated,
  onObservePublic,
}: AccessGatewayPanelProps) {
  const router = useRouter();
  const { configured, loading, user } = useAuth();
  const [step, setStep] = useState<GatewayStep>("code");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionSeed, setSuggestionSeed] = useState(() => `${Date.now()}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    formState: { errors },
    getValues,
    register,
    setError,
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
  useEffect(() => {
    if (!loading && user) {
      onAuthenticated?.();
    }
  }, [loading, onAuthenticated, user]);

  function getLocalSuggestions(currentAccessCode: string, seed = suggestionSeed) {
    return generateAliasBundle(`${currentAccessCode}:${seed}`, 6);
  }

  function applySuggestions(nextSuggestions: string[]) {
    setSuggestions(nextSuggestions);

    if (!getValues("username").trim() && nextSuggestions[0]) {
      setValue("username", nextSuggestions[0], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  function rotateSuggestions() {
    const nextSeed = `${Date.now()}`;
    setSuggestionSeed(nextSeed);
    const nextSuggestions = getLocalSuggestions(getValues("accessCode"), nextSeed);
    setSuggestions(nextSuggestions);

    if (nextSuggestions[0]) {
      setValue("username", nextSuggestions[0], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  function handleAuthenticated(result: Extract<AccessAuthResult, { kind: "authenticated" }>) {
    toast.success(
      result.created
        ? `Profil créé : ${result.username}.`
        : `Connexion : ${result.username}.`,
    );
    onAuthenticated?.();

    startTransition(() => {
      router.push(targetAfterAuth);
    });
  }

  async function submitAccess(values: AccessAuthValues) {
    setIsSubmitting(true);

    try {
      const result = await authenticateWithAccessCode(values);

      if (result.kind === "authenticated") {
        handleAuthenticated(result);
        return;
      }

      const nextSuggestions =
        result.suggestions.length > 0
          ? result.suggestions
          : getLocalSuggestions(values.accessCode);

      applySuggestions(nextSuggestions);
      setStep("username");
      toast.message("Premier passage détecté. Choisis maintenant ton pseudo.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCodeStepSubmit() {
    const isValid = await trigger("accessCode");

    if (!isValid) {
      return;
    }

    await submitAccess({
      accessCode: getValues("accessCode"),
      username: "",
    });
  }

  async function handleUsernameStepSubmit() {
    const isValid = await trigger(["accessCode", "username"]);

    if (!isValid) {
      return;
    }

    const nextUsername = getValues("username").trim();

    if (!nextUsername) {
      setError("username", {
        message: "Choisis un pseudo avant de continuer.",
        type: "manual",
      });
      return;
    }

    await submitAccess({
      accessCode: getValues("accessCode"),
      username: nextUsername,
    });
  }

  if (!configured) {
    return null;
  }

  return (
    <div className={["forum-access-panel", className].filter(Boolean).join(" ")}>
      <div className="forum-access-main">
        <div className="forum-section-head items-start">
          <div>
            <h2 className="forum-title text-3xl sm:text-4xl">
              {step === "code"
                ? "Entrez votre code d’accès"
                : "Choisissez votre pseudo"}
            </h2>
            <p className="forum-muted mt-3 max-w-xl text-sm leading-7">
              {step === "code"
                ? "Entre ton code pour ouvrir NEST."
                : "Ce pseudo sera public. Tu peux en choisir un ou écrire le tien."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
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
                disabled={isSubmitting || step === "username"}
              />
            </div>
            <div className="forum-code-preview">{formatAccessCode(accessCode)}</div>
            {errors.accessCode ? (
              <span className="text-xs text-[color:var(--danger)]">
                {errors.accessCode.message}
              </span>
            ) : null}
          </label>

          {step === "username" ? (
            <div className="forum-access-username-stage">
              <label className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="forum-inline-note">pseudo</span>
                  <button
                    type="button"
                    onClick={rotateSuggestions}
                    className="forum-button-ghost"
                    disabled={isSubmitting}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Relancer
                  </button>
                </div>
                <div className="forum-input-shell forum-input-shell-terminal">
                  <UserRound className="forum-input-shell-icon" />
                  <input
                    {...register("username")}
                    autoComplete="nickname"
                    spellCheck={false}
                    placeholder="Choisis un pseudo"
                    className="forum-input-shell-control"
                  />
                </div>
                {errors.username ? (
                  <span className="text-xs text-[color:var(--danger)]">
                    {errors.username.message}
                  </span>
                ) : null}
              </label>

              <div className="forum-access-suggestions-grid">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setValue("username", suggestion, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    className="forum-suggestion-chip"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="forum-toolbar justify-between gap-3 pt-2">
            {step === "username" ? (
              <button
                type="button"
                onClick={() => {
                  setStep("code");
                }}
                className="forum-button-secondary"
                disabled={isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Changer le code
              </button>
            ) : showObserveAction ? (
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
              type="button"
              onClick={() => {
                void (step === "code"
                  ? handleCodeStepSubmit()
                  : handleUsernameStepSubmit());
              }}
              disabled={isSubmitting}
              className="forum-button-primary"
            >
              {isSubmitting
                ? step === "code"
                  ? "Validation…"
                  : "Ouverture…"
                : step === "code"
                  ? "Valider le code"
                  : "Entrer dans NEST"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
