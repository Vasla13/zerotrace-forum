"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { PenLine, Send, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import {
  createForumPost,
  subscribeToPost,
  updateForumPost,
} from "@/lib/data/posts";
import type { ForumPost } from "@/lib/types/forum";
import { getErrorMessage } from "@/lib/utils/errors";
import { postSchema, type PostFormValues } from "@/lib/validation/forum";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

type PostEditorFormProps = {
  mode: "create" | "edit";
  postId?: string;
};

export function PostEditorForm({ mode, postId }: PostEditorFormProps) {
  const router = useRouter();
  const { configured, loading: authLoading, profile, user } = useAuth();
  const [post, setPost] = useState<ForumPost | null | undefined>(
    mode === "create" ? null : undefined,
  );
  const [loadingPost, setLoadingPost] = useState(mode === "edit");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const titleValue = watch("title");
  const contentValue = watch("content");

  useEffect(() => {
    if (mode !== "edit" || !postId || !configured) {
      return;
    }

    setLoadingPost(true);

    const unsubscribe = subscribeToPost(
      postId,
      (nextPost) => {
        setPost(nextPost);
        setLoadingPost(false);
        if (nextPost) {
          reset({
            title: nextPost.title,
            content: nextPost.content,
          });
        }
      },
      () => {
        setPost(null);
        setLoadingPost(false);
      },
    );

    return unsubscribe;
  }, [configured, mode, postId, reset]);

  async function onSubmit(values: PostFormValues) {
    if (!profile || !user) {
      toast.error("Tu dois être connecté pour publier.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const createdPostId = await createForumPost(values, profile);
        toast.success("Post publié.");
        startTransition(() => {
          router.push(`/posts/${createdPostId}`);
        });
        return;
      }

      if (!postId) {
        throw new Error("Identifiant de post manquant.");
      }

      await updateForumPost(postId, user.uid, values);
      toast.success("Post mis à jour.");
      startTransition(() => {
        router.push(`/posts/${postId}`);
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

  if (authLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center">
        <section className="forum-card w-full p-8 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--line)] border-t-[color:var(--accent)]" />
          <p className="forum-muted mt-5 text-sm">Chargement de ta session…</p>
        </section>
      </div>
    );
  }

  if (mode === "edit" && loadingPost) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="forum-card h-80 animate-pulse p-8" />
      </div>
    );
  }

  if (mode === "edit" && !post) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
        <section className="forum-card w-full p-8 text-center">
          <h1 className="forum-title text-4xl font-semibold">
            Post introuvable.
          </h1>
          <p className="forum-muted mt-4 text-sm">
            Ce contenu a peut-être été supprimé.
          </p>
        </section>
      </div>
    );
  }

  if (mode === "edit" && user && post && post.author.uid !== user.uid) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
        <section className="forum-card w-full p-8 text-center">
          <h1 className="forum-title text-4xl font-semibold">
            Modification non autorisée.
          </h1>
          <p className="forum-muted mt-4 text-sm">
            Seul l’auteur du post peut le modifier.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <section className="forum-card p-6 sm:p-8">
        <div className="forum-section-head items-start">
          <div>
            <span className="forum-pill">
              <PenLine className="h-3.5 w-3.5" />
              {mode === "create" ? "Nouveau sujet" : "Édition"}
            </span>
            <h1 className="forum-title mt-5 text-4xl font-semibold sm:text-5xl">
              {mode === "create" ? "Lancer un sujet" : "Ajuster le signal"}
            </h1>
          </div>
          <span className="forum-inline-note">
            {mode === "create" ? "publication directe" : "mise à jour live"}
          </span>
        </div>

        <div className="forum-toolbar mt-5">
          <span className="forum-stat-chip">
            <strong>120</strong>
            titre max
          </span>
          <span className="forum-stat-chip">
            <strong>5000</strong>
            contenu max
          </span>
          <span className="forum-stat-chip">
            <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--accent-secondary)]" />
            auteur only
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 grid gap-5">
          <label className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Titre</span>
              <span className="forum-inline-note">{titleValue.length}/120</span>
            </div>
            <input
              {...register("title")}
              className="forum-input"
              placeholder="Exemple : Comment structurer un projet Next.js + Firebase ?"
            />
            {errors.title ? (
              <span className="text-xs text-[color:var(--danger)]">
                {errors.title.message}
              </span>
            ) : null}
          </label>

          <label className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Contenu</span>
              <span className="forum-inline-note">{contentValue.length}/5000</span>
            </div>
            <textarea
              {...register("content")}
              className="forum-textarea min-h-72"
              placeholder="Contexte, problème, résultat attendu."
            />
            {errors.content ? (
              <span className="text-xs text-[color:var(--danger)]">
                {errors.content.message}
              </span>
            ) : null}
          </label>

          <div className="forum-divider" />

          <div className="forum-toolbar justify-between">
            <span className="forum-muted text-sm">
              Clair, court, utile.
            </span>
            <div className="forum-toolbar">
              <Link
                href={mode === "edit" && postId ? `/posts/${postId}` : "/"}
                className="forum-button-ghost"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="forum-button-primary"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting
                  ? mode === "create"
                    ? "Publication…"
                    : "Enregistrement…"
                  : mode === "create"
                    ? "Publier"
                    : "Enregistrer"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
