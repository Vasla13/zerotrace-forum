"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { InputShell } from "@/components/input-shell";
import { registerForumUser, signInForumUser } from "@/lib/data/users";
import { getErrorMessage } from "@/lib/utils/errors";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
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
    <div className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center">
      <section className="forum-card w-full p-6 sm:p-8">
        <div className="forum-section-head items-start">
          <div>
            <span className="forum-pill">
              <Sparkles className="h-3.5 w-3.5" />
              {isRegisterMode ? "Inscription" : "Connexion"}
            </span>
            <h1 className="forum-title mt-5 text-4xl font-semibold sm:text-5xl">
              {isRegisterMode ? "Entrer dans le flux" : "Reprendre la session"}
            </h1>
          </div>
          <span className="forum-inline-note">
            {isRegisterMode ? "accès neuf" : "retour membre"}
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 grid gap-4">
          {isRegisterMode ? (
            <label className="grid gap-2">
              <span className="text-sm font-medium">Pseudo</span>
              <InputShell
                {...register("username")}
                icon={UserRound}
                autoComplete="username"
                placeholder="nova_trace"
              />
              {errors.username ? (
                <span className="text-xs text-[color:var(--danger)]">
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
              placeholder="hello@signal-lab.test"
              type="email"
            />
            {errors.email ? (
              <span className="text-xs text-[color:var(--danger)]">
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
              <span className="text-xs text-[color:var(--danger)]">
                {errors.password.message}
              </span>
            ) : null}
          </label>

          {isRegisterMode ? (
            <label className="grid gap-2">
              <span className="text-sm font-medium">Confirmation</span>
              <InputShell
                {...register("confirmPassword")}
                icon={LockKeyhole}
                autoComplete="new-password"
                placeholder="••••••••"
                type="password"
              />
              {errors.confirmPassword ? (
                <span className="text-xs text-[color:var(--danger)]">
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
                ? "Création…"
                : "Connexion…"
              : isRegisterMode
                ? "Inscription"
                : "Entrer"}
          </button>
        </form>

        <div className="forum-divider mt-6" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="forum-muted">
            {isRegisterMode ? "Déjà membre ?" : "Nouveau ici ?"}
          </span>
          <Link
            href={isRegisterMode ? "/login" : "/register"}
            className="forum-link font-semibold"
          >
            {isRegisterMode ? "Connexion" : "Inscription"}
          </Link>
        </div>
      </section>
    </div>
  );
}
