"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { KeyRound, RefreshCw, UserRound } from "lucide-react";
import { authenticateIdentity } from "@/lib/data/identity";
import { generateAliasBundle, generateNodeAlias } from "@/lib/utils/alias";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  identityCreateSchema,
  identityResumeSchema,
} from "@/lib/validation/identity";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

type IdentityGatewayPanelProps = {
  targetAfterAuth?: string;
  className?: string;
  onAuthenticated?: () => void;
};

type IdentityMode = "create" | "resume";

export function IdentityGatewayPanel({
  targetAfterAuth = "/",
  className,
  onAuthenticated,
}: IdentityGatewayPanelProps) {
  const router = useRouter();
  const { configured, loading, user } = useAuth();
  const [mode, setMode] = useState<IdentityMode>("create");
  const [suggestionSeed, setSuggestionSeed] = useState(() => `${Date.now()}`);
  const [suggestions, setSuggestions] = useState<string[]>(() =>
    generateAliasBundle(`${Date.now()}`, 6),
  );
  const [createUsername, setCreateUsername] = useState(() =>
    generateNodeAlias(`${Date.now()}`),
  );
  const [createPassword, setCreatePassword] = useState("");
  const [resumeUsername, setResumeUsername] = useState("");
  const [resumePassword, setResumePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      onAuthenticated?.();
    }
  }, [loading, onAuthenticated, user]);

  useEffect(() => {
    if (mode !== "create") {
      return;
    }

    if (!createUsername.trim()) {
      setCreateUsername(suggestions[0] ?? generateNodeAlias(suggestionSeed));
    }
  }, [createUsername, mode, suggestionSeed, suggestions]);

  function rotateIdentity() {
    const nextSeed = `${Date.now()}`;
    const nextSuggestions = generateAliasBundle(nextSeed, 6);

    setSuggestionSeed(nextSeed);
    setSuggestions(nextSuggestions);
    setCreateUsername(nextSuggestions[0] ?? generateNodeAlias(nextSeed));
  }

  function handleAuthenticated(result: {
    created: boolean;
    username: string;
  }) {
    toast.success(
      result.created
        ? `Identité forgée : ${result.username}.`
        : `Identité reprise : ${result.username}.`,
    );
    onAuthenticated?.();

    startTransition(() => {
      router.push(targetAfterAuth);
    });
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "create") {
        const values = identityCreateSchema.parse({
          mode,
          password: createPassword,
          username: createUsername,
        });
        const result = await authenticateIdentity(values);
        handleAuthenticated(result);
        return;
      }

      const values = identityResumeSchema.parse({
        mode,
        password: resumePassword,
        username: resumeUsername,
      });
      const result = await authenticateIdentity(values);
      handleAuthenticated(result);
    } catch (submitError) {
      const message = getErrorMessage(submitError);
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!configured) {
    return null;
  }

  const currentUsername = mode === "create" ? createUsername : resumeUsername;
  const currentPassword = mode === "create" ? createPassword : resumePassword;

  return (
    <div className={["forum-access-panel", className].filter(Boolean).join(" ")}>
      <div className="forum-access-main">
        <div className="forum-section-head items-start">
          <div>
            <div className="forum-access-head-rails" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h2 className="forum-title text-3xl sm:text-4xl">
              {mode === "create" ? "Forge ton identité" : "Reprendre une identité"}
            </h2>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="forum-inline-note">
            {mode === "create" ? "premier passage" : "retour"}
          </span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "create" ? "resume" : "create");
              setError(null);
            }}
            className={clsx("forum-button-ghost")}
          >
            {mode === "create" ? "J’ai déjà une identité" : "Forger une nouvelle identité"}
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="forum-inline-note">pseudo</span>
              {mode === "create" ? (
                <button
                  type="button"
                  onClick={rotateIdentity}
                  disabled={isSubmitting}
                  className="forum-button-ghost"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Relancer
                </button>
              ) : null}
            </div>
            <div className="forum-input-shell forum-input-shell-terminal">
              <UserRound className="forum-input-shell-icon" />
              <input
                autoComplete={mode === "create" ? "nickname" : "username"}
                spellCheck={false}
                value={currentUsername}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  if (mode === "create") {
                    setCreateUsername(nextValue);
                    return;
                  }

                  setResumeUsername(nextValue);
                }}
                placeholder={
                  mode === "create"
                    ? "Alias automatique"
                    : "Ton pseudo"
                }
                className="forum-input-shell-control"
                disabled={isSubmitting}
              />
            </div>
          </label>

          {mode === "create" ? (
            <div className="forum-access-suggestions-grid">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setCreateUsername(suggestion);
                  }}
                  className="forum-suggestion-chip"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <label className="grid gap-2">
            <span className="forum-inline-note">mot de passe</span>
            <div className="forum-input-shell forum-input-shell-terminal">
              <KeyRound className="forum-input-shell-icon" />
              <input
                type="password"
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                value={currentPassword}
                onChange={(event) => {
                  const nextValue = event.target.value;

                  if (mode === "create") {
                    setCreatePassword(nextValue);
                    return;
                  }

                  setResumePassword(nextValue);
                }}
                placeholder={
                  mode === "create"
                    ? "Choisis un mot de passe"
                    : "Ton mot de passe"
                }
                className="forum-input-shell-control"
                disabled={isSubmitting}
              />
            </div>
          </label>

          {error ? (
            <div className="text-xs text-[color:var(--danger)]">{error}</div>
          ) : null}

          <div className="forum-toolbar justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                void handleSubmit();
              }}
              disabled={isSubmitting}
              className="forum-button-primary"
            >
              {isSubmitting
                ? mode === "create"
                  ? "Forge…"
                  : "Reprise…"
                : mode === "create"
                  ? "Entrer dans NEST"
                  : "Retrouver NEST"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
