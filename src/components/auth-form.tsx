"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, LockKeyhole, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { InputShell } from "@/components/input-shell";
import { registerForumUser, signInForumUser } from "@/lib/data/users";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { getErrorMessage } from "@/lib/utils/errors";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

type AuthFormMode = "login" | "register";

type AuthFormProps = {
  mode: AuthFormMode;
};

type AuthFormValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { configured, loading, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetAfterAuth = searchParams.get("next") || "/";
  const isRegisterMode = mode === "register";
  const resolver = zodResolver(isRegisterMode ? registerSchema : loginSchema);

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<AuthFormValues>({
    resolver: resolver as never,
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!loading && user) {
      router.replace(targetAfterAuth);
    }
  }, [loading, router, targetAfterAuth, user]);

  async function onSubmit(values: AuthFormValues) {
    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        await registerForumUser({
          username: values.username,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
        });
        toast.success("Compte créé avec succès.");
      } else {
        await signInForumUser({
          email: values.email,
          password: values.password,
        });
        toast.success("Connexion réussie.");
      }

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
    return <ForumSetupNotice />;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 items-center">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="forum-card hidden p-10 lg:block">
          <span className="forum-pill">ZeroTrace</span>
          <h1 className="forum-title mt-6 text-6xl font-semibold leading-none">
            {isRegisterMode ? "Entrer dans le flux." : "Reprendre la ligne."}
          </h1>
          <div className="mt-10 grid gap-4">
            <div className="forum-card-quiet p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-secondary)]">
                Direct
              </p>
              <p className="mt-3 text-lg font-semibold">
                Posts, réponses, likes.
              </p>
            </div>
            <div className="forum-card-quiet p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-secondary)]">
                Sécurité
              </p>
              <p className="mt-3 text-lg font-semibold">
                Auth Firebase, règles actives.
              </p>
            </div>
          </div>
        </section>

        <section className="forum-card mx-auto w-full max-w-xl p-8 sm:p-10">
          <span className="forum-pill">
            {isRegisterMode ? "Inscription" : "Connexion"}
          </span>
          <h1 className="forum-title mt-5 text-4xl font-semibold">
            {isRegisterMode ? "Créer un compte" : "Se connecter"}
          </h1>
          <p className="forum-muted mt-3 text-sm">
            {isRegisterMode ? "Accès immédiat." : "Accès membre."}
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 grid gap-5"
          >
            {isRegisterMode ? (
              <label className="grid gap-2">
                <span className="text-sm font-medium">Pseudo</span>
                <InputShell
                  {...register("username")}
                  icon={UserRound}
                  autoComplete="username"
                  placeholder="eripe_05"
                />
                {errors.username ? (
                  <span className="text-xs text-red-600">
                    {errors.username.message}
                  </span>
                ) : null}
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="text-sm font-medium">Email</span>
              <InputShell
                {...register("email")}
                icon={Mail}
                autoComplete="email"
                placeholder="eripe@example.com"
                type="email"
              />
              {errors.email ? (
                <span className="text-xs text-red-600">
                  {errors.email.message}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Mot de passe</span>
              <InputShell
                {...register("password")}
                icon={LockKeyhole}
                autoComplete={isRegisterMode ? "new-password" : "current-password"}
                placeholder="••••••••"
                type="password"
              />
              {errors.password ? (
                <span className="text-xs text-red-600">
                  {errors.password.message}
                </span>
              ) : null}
            </label>

            {isRegisterMode ? (
              <label className="grid gap-2">
                <span className="text-sm font-medium">
                  Confirmation du mot de passe
                </span>
                <InputShell
                  {...register("confirmPassword")}
                  icon={LockKeyhole}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  type="password"
                />
                {errors.confirmPassword ? (
                  <span className="text-xs text-red-600">
                    {errors.confirmPassword.message}
                  </span>
                ) : null}
              </label>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="forum-button-primary mt-2 w-full"
            >
              {isSubmitting
                ? isRegisterMode
                  ? "Création en cours…"
                  : "Connexion en cours…"
                : isRegisterMode
                  ? "Créer mon compte"
                  : "Se connecter"}
            </button>
          </form>

          <p className="forum-muted mt-6 text-sm">
            {isRegisterMode ? "Déjà inscrit ?" : "Pas encore de compte ?"}{" "}
            <Link
              href={isRegisterMode ? "/login" : "/register"}
              className="forum-link font-semibold"
            >
              {isRegisterMode ? "Se connecter" : "Créer un compte"}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
