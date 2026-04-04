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
        <div className="forum-card h-96 animate-pulse p-8" />
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
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="forum-card p-8 sm:p-10">
        <span className="forum-pill">
          <PenLine className="h-3.5 w-3.5" />
          {mode === "create" ? "Nouvelle discussion" : "Édition"}
        </span>
        <h1 className="forum-title mt-6 text-5xl font-semibold">
          {mode === "create" ? "Lancer un sujet." : "Corriger le signal."}
        </h1>
        <p className="forum-muted mt-4 max-w-2xl text-sm">
          Titre court. Contenu clair.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-6">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Titre</span>
            <input
              {...register("title")}
              className="forum-input"
              placeholder="Exemple : Comment structurer un projet Next.js + Firebase ?"
            />
            <div className="flex justify-between text-xs">
              <span className="text-red-600">{errors.title?.message}</span>
              <span className="forum-muted">{titleValue.length}/120</span>
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Contenu</span>
            <textarea
              {...register("content")}
              className="forum-textarea min-h-72"
              placeholder="Contexte, problème, résultat attendu."
            />
            <div className="flex justify-between text-xs">
              <span className="text-red-600">{errors.content?.message}</span>
              <span className="forum-muted">{contentValue.length}/5000</span>
            </div>
          </label>

          <div className="flex flex-wrap gap-3">
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
            <Link
              href={mode === "edit" && postId ? `/posts/${postId}` : "/"}
              className="forum-button-secondary"
            >
              Annuler
            </Link>
          </div>
        </form>
      </section>

      <aside className="grid gap-4">
        <section className="forum-card-quiet p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[color:var(--accent-dark)]" />
            <p className="text-sm font-semibold">Cadre</p>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="forum-muted">Titre</span>
              <span className="font-semibold">120</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="forum-muted">Contenu</span>
              <span className="font-semibold">5000</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="forum-muted">Edition</span>
              <span className="font-semibold">Auteur</span>
            </div>
          </div>
        </section>

        <section className="forum-card-quiet p-6">
          <p className="text-sm font-semibold">Stack</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="forum-pill">Firebase</span>
            <span className="forum-pill">Zod</span>
            <span className="forum-pill">Next</span>
          </div>
        </section>
      </aside>
    </div>
  );
}
