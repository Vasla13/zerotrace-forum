"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Heart,
  MessageSquareMore,
  Pencil,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { deleteForumPost, subscribeToPost } from "@/lib/data/posts";
import {
  createPostComment,
  deletePostComment,
  subscribeToComments,
  updatePostComment,
} from "@/lib/data/comments";
import { subscribeToLikeState, togglePostLike } from "@/lib/data/likes";
import type { ForumComment, ForumPost, LikeState } from "@/lib/types/forum";
import { formatAbsoluteDate, formatRelativeDate } from "@/lib/utils/date";
import { getErrorMessage } from "@/lib/utils/errors";
import { commentSchema } from "@/lib/validation/forum";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

type PostPageProps = {
  postId: string;
};

export function PostPage({ postId }: PostPageProps) {
  const router = useRouter();
  const { configured, loading: authLoading, profile, user } = useAuth();
  const [post, setPost] = useState<ForumPost | null | undefined>(undefined);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [likeState, setLikeState] = useState<LikeState>({
    count: 0,
    likedByUser: false,
  });
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      return;
    }

    const unsubscribe = subscribeToPost(
      postId,
      (nextPost) => {
        setPost(nextPost);
        setError(null);
      },
      (nextError) => {
        setError(getErrorMessage(nextError));
      },
    );

    return unsubscribe;
  }, [configured, postId]);

  useEffect(() => {
    if (!configured) {
      return;
    }

    const unsubscribe = subscribeToComments(
      postId,
      (nextComments) => {
        setComments(nextComments);
      },
      (nextError) => {
        setError(getErrorMessage(nextError));
      },
    );

    return unsubscribe;
  }, [configured, postId]);

  useEffect(() => {
    if (!configured) {
      return;
    }

    const unsubscribe = subscribeToLikeState(
      postId,
      user?.uid ?? null,
      (nextLikeState) => {
        setLikeState(nextLikeState);
      },
      (nextError) => {
        setError(getErrorMessage(nextError));
      },
    );

    return unsubscribe;
  }, [configured, postId, user?.uid]);

  async function handleToggleLike() {
    if (!user) {
      toast.error("Connecte-toi pour liker un post.");
      startTransition(() => {
        router.push(`/login?next=${encodeURIComponent(`/posts/${postId}`)}`);
      });
      return;
    }

    setBusyAction("like");
    try {
      await togglePostLike(postId, user.uid);
    } catch (nextError) {
      toast.error(getErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateComment() {
    if (!user || !profile) {
      toast.error("Connecte-toi pour commenter.");
      return;
    }

    try {
      const parsed = commentSchema.parse({ content: commentDraft });
      setBusyAction("comment:create");
      await createPostComment(postId, parsed, profile);
      setCommentDraft("");
      toast.success("Commentaire ajouté.");
    } catch (nextError) {
      toast.error(getErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeletePost() {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      "Supprimer ce post et tous ses commentaires ?",
    );

    if (!confirmed) {
      return;
    }

    setBusyAction("post:delete");
    try {
      await deleteForumPost(postId, user.uid);
      toast.success("Post supprimé.");
      startTransition(() => {
        router.push("/");
      });
    } catch (nextError) {
      toast.error(getErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!user) {
      return;
    }

    const confirmed = window.confirm("Supprimer ce commentaire ?");
    if (!confirmed) {
      return;
    }

    setBusyAction(`comment:delete:${commentId}`);
    try {
      await deletePostComment(postId, commentId, user.uid);
      toast.success("Commentaire supprimé.");
    } catch (nextError) {
      toast.error(getErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveEditedComment(commentId: string) {
    if (!user) {
      return;
    }

    try {
      const parsed = commentSchema.parse({ content: editingCommentDraft });
      setBusyAction(`comment:update:${commentId}`);
      await updatePostComment(postId, commentId, user.uid, parsed);
      setEditingCommentId(null);
      setEditingCommentDraft("");
      toast.success("Commentaire mis à jour.");
    } catch (nextError) {
      toast.error(getErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  if (!configured) {
    return <ForumSetupNotice />;
  }

  if (post === undefined || authLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="forum-card h-[520px] animate-pulse p-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
        <section className="forum-card w-full p-8 text-center">
          <h1 className="forum-title text-4xl font-semibold">
            Impossible de charger ce post.
          </h1>
          <p className="mt-4 text-sm text-red-700">{error}</p>
        </section>
      </div>
    );
  }

  if (!post) {
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

  const isAuthor = user?.uid === post.author.uid;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="forum-grid">
        <article className="forum-card p-8 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar username={post.author.username} seed={post.author.uid} />
              <div className="min-w-0">
                <Link
                  href={`/profile/${post.author.usernameLower}`}
                  className="block truncate text-sm font-semibold hover:text-[color:var(--accent-dark)]"
                >
                  {post.author.username}
                </Link>
                <div className="forum-muted mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span title={formatAbsoluteDate(post.createdAt)}>
                    {formatRelativeDate(post.createdAt)}
                  </span>
                  <span>·</span>
                  <span>{formatAbsoluteDate(post.createdAt)}</span>
                </div>
              </div>
            </div>

            {isAuthor ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="forum-button-secondary"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
                <button
                  type="button"
                  onClick={handleDeletePost}
                  disabled={busyAction === "post:delete"}
                  className="forum-button-danger"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {busyAction === "post:delete" ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            ) : null}
          </div>

          <h1 className="forum-title mt-8 text-5xl font-semibold leading-tight">
            {post.title}
          </h1>

          <div className="forum-richtext mt-8 text-[15px] leading-8">
            {post.content}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[color:var(--line)] pt-5">
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={busyAction === "like"}
              className="forum-button-secondary"
            >
              <Heart
                className={`mr-2 h-4 w-4 ${
                  likeState.likedByUser ? "fill-current text-red-500" : ""
                }`}
              />
              {likeState.likedByUser ? "Aimé" : "J’aime"} ({likeState.count})
            </button>
            <span className="forum-pill">
              <MessageSquareMore className="h-3.5 w-3.5" />
              {comments.length} réponse{comments.length > 1 ? "s" : ""}
            </span>
          </div>
        </article>

        <section className="forum-card p-8 sm:p-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="forum-pill">Commentaires</span>
              <h2 className="forum-title mt-4 text-4xl font-semibold">
                Réponses
              </h2>
            </div>
          </div>

          {user ? (
            <div className="mt-8 grid gap-3">
              <textarea
                className="forum-textarea min-h-36"
                placeholder="Ajouter une réponse claire…"
                value={commentDraft}
                onChange={(event) => {
                  setCommentDraft(event.target.value);
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="forum-muted text-xs">
                  {commentDraft.trim().length}/1000
                </span>
                <button
                  type="button"
                  onClick={handleCreateComment}
                  disabled={busyAction === "comment:create"}
                  className="forum-button-primary"
                >
                  {busyAction === "comment:create" ? "Envoi..." : "Envoyer"}
                </button>
              </div>
            </div>
          ) : (
            <div className="forum-card-quiet mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="forum-muted text-sm">Connexion requise.</p>
              <Link
                href={`/login?next=${encodeURIComponent(`/posts/${postId}`)}`}
                className="forum-button-secondary"
              >
                Se connecter
              </Link>
            </div>
          )}

          <div className="mt-8 grid gap-4">
            {comments.length ? (
              comments.map((comment) => {
                const isCommentAuthor = user?.uid === comment.author.uid;
                const isEditing = editingCommentId === comment.id;

                return (
                  <article key={comment.id} className="forum-card-quiet p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          username={comment.author.username}
                          seed={comment.author.uid}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/profile/${comment.author.usernameLower}`}
                            className="block truncate text-sm font-semibold hover:text-[color:var(--accent-dark)]"
                          >
                            {comment.author.username}
                          </Link>
                          <p
                            className="forum-muted text-xs"
                            title={formatAbsoluteDate(comment.createdAt)}
                          >
                            {formatRelativeDate(comment.createdAt)}
                          </p>
                        </div>
                      </div>

                      {isCommentAuthor ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="forum-button-secondary"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentDraft(comment.content);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="forum-button-danger"
                            onClick={() => {
                              void handleDeleteComment(comment.id);
                            }}
                            disabled={
                              busyAction === `comment:delete:${comment.id}`
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {isEditing ? (
                      <div className="mt-4 grid gap-3">
                        <textarea
                          className="forum-textarea min-h-32"
                          value={editingCommentDraft}
                          onChange={(event) => {
                            setEditingCommentDraft(event.target.value);
                          }}
                        />
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              void handleSaveEditedComment(comment.id);
                            }}
                            disabled={
                              busyAction === `comment:update:${comment.id}`
                            }
                            className="forum-button-primary"
                          >
                            {busyAction === `comment:update:${comment.id}`
                              ? "Enregistrement…"
                              : "Enregistrer"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingCommentDraft("");
                            }}
                            className="forum-button-secondary"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="forum-richtext mt-4">{comment.content}</div>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="forum-card-quiet px-6 py-12 text-center">
                <h3 className="forum-title text-3xl font-semibold">
                  Aucune réponse.
                </h3>
                <p className="forum-muted mt-3 text-sm">Lance la discussion.</p>
              </div>
            )}
          </div>
        </section>
      </section>

      <aside className="grid gap-4">
        <section className="forum-card-quiet p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-secondary)]">
            Live
          </p>
          <p className="mt-3 text-lg font-semibold">
            {comments.length} réponse{comments.length > 1 ? "s" : ""}
          </p>
        </section>
        <section className="forum-card-quiet p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-secondary)]">
            Contrôle
          </p>
          <p className="mt-3 text-lg font-semibold">Auteur seulement</p>
        </section>
      </aside>
    </div>
  );
}
