"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flag,
  Heart,
  MessageSquareMore,
  Pencil,
  Pin,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { PostMediaGallery } from "@/components/post-media-gallery";
import {
  createPostComment,
  deletePostComment,
  subscribeToComments,
  updatePostComment,
} from "@/lib/data/comments";
import { subscribeToOwnLike, togglePostLike } from "@/lib/data/likes";
import {
  deleteForumPost,
  setPostPinnedState,
  subscribeToPost,
} from "@/lib/data/posts";
import { createForumReport } from "@/lib/data/reports";
import { getForumChannelLabel } from "@/lib/forum/config";
import type { ForumComment, ForumPost } from "@/lib/types/forum";
import { formatAbsoluteDate, formatRelativeDate } from "@/lib/utils/date";
import { getErrorMessage } from "@/lib/utils/errors";
import { excerpt } from "@/lib/utils/text";
import { commentSchema } from "@/lib/validation/forum";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

type PostPageProps = {
  postId: string;
};

type PostDialogState =
  | { kind: "delete-post" }
  | { kind: "delete-comment"; commentId: string }
  | { kind: "report-post" }
  | { kind: "report-comment"; comment: ForumComment }
  | null;

export function PostPage({ postId }: PostPageProps) {
  const router = useRouter();
  const { configured, isAdmin, loading: authLoading, profile, user } = useAuth();
  const [post, setPost] = useState<ForumPost | null | undefined>(undefined);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [likedByUser, setLikedByUser] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<PostDialogState>(null);

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

    const unsubscribe = subscribeToOwnLike(
      postId,
      user?.uid ?? null,
      (nextLikedByUser) => {
        setLikedByUser(nextLikedByUser);
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
      await togglePostLike(postId, user);
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

    setBusyAction("post:delete");

    try {
      await deleteForumPost(postId, user.uid);
      toast.success("Post supprimé.");
      setDialogState(null);
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

    setBusyAction(`comment:delete:${commentId}`);

    try {
      await deletePostComment(postId, commentId, user.uid);
      toast.success("Commentaire supprimé.");
      setDialogState(null);
    } catch (nextError) {
      toast.error(getErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleTogglePin() {
    if (!user || !post || !isAdmin) {
      return;
    }

    setBusyAction("post:pin");

    try {
      await setPostPinnedState(post.id, user.uid, !post.isPinned);
      toast.success(post.isPinned ? "Post désépinglé." : "Post épinglé.");
    } catch (nextError) {
      toast.error(getErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReportPost() {
    if (!user || !post) {
      toast.error("Connecte-toi pour signaler.");
      startTransition(() => {
        router.push(`/login?next=${encodeURIComponent(`/posts/${postId}`)}`);
      });
      return;
    }

    setBusyAction("report:post");

    try {
      await createForumReport(user, {
        kind: "post",
        postId: post.id,
        postTitle: post.title || null,
        previewText: post.title || excerpt(post.content, 240),
        targetAuthorUsername: post.author.username,
      });
      toast.success("Signalement envoyé.");
      setDialogState(null);
    } catch (nextError) {
      toast.error(getErrorMessage(nextError));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReportComment(comment: ForumComment) {
    if (!user) {
      toast.error("Connecte-toi pour signaler.");
      startTransition(() => {
        router.push(`/login?next=${encodeURIComponent(`/posts/${postId}`)}`);
      });
      return;
    }

    setBusyAction(`report:comment:${comment.id}`);

    try {
      await createForumReport(user, {
        commentId: comment.id,
        kind: "comment",
        postId,
        postTitle: post?.title || null,
        previewText: excerpt(comment.content, 240),
        targetAuthorUsername: comment.author.username,
      });
      toast.success("Signalement envoyé.");
      setDialogState(null);
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
        <div className="forum-card h-[420px] animate-pulse p-8" />
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
          <p className="mt-4 text-sm text-[color:var(--danger)]">{error}</p>
        </section>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center">
        <section className="forum-card w-full p-8 text-center">
          <h1 className="forum-title text-4xl font-semibold">Post introuvable.</h1>
          <p className="forum-muted mt-4 text-sm">
            Ce contenu a peut-être été supprimé.
          </p>
        </section>
      </div>
    );
  }

  const isAuthor = user?.uid === post.author.uid;
  const wasEdited =
    Boolean(post.createdAt && post.updatedAt) &&
    post.createdAt?.getTime() !== post.updatedAt?.getTime();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <article className="forum-card p-6 sm:p-8">
        <div className="forum-section-head items-start">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              avatarUrl={post.author.avatarUrl}
              username={post.author.username}
              seed={post.author.uid}
            />
            <div className="min-w-0">
              <Link
                href={`/profile/${post.author.usernameLower}`}
                className="block truncate text-sm font-semibold hover:text-[color:var(--accent-dark)]"
              >
                {post.author.username}
              </Link>
              <div className="forum-meta-line mt-1 flex-wrap text-xs">
                <span title={formatAbsoluteDate(post.createdAt)}>
                  {formatRelativeDate(post.createdAt)}
                </span>
                <span className="forum-meta-dot" />
                <span>{getForumChannelLabel(post.channel)}</span>
                {post.isPinned ? (
                  <>
                    <span className="forum-meta-dot" />
                    <span className="inline-flex items-center gap-1 text-[color:var(--accent-hot)]">
                      <Pin className="h-3.5 w-3.5" />
                      Épinglé
                    </span>
                  </>
                ) : null}
                {wasEdited ? (
                  <>
                    <span className="forum-meta-dot" />
                    <span>modifié</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="forum-toolbar">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  void handleTogglePin();
                }}
                disabled={busyAction === "post:pin"}
                className="forum-button-icon"
                title={post.isPinned ? "Désépingler" : "Épingler"}
                aria-label={post.isPinned ? "Désépingler le post" : "Épingler le post"}
              >
                <Pin className="h-4 w-4" />
              </button>
            ) : null}
            {!isAuthor ? (
              <button
                type="button"
                onClick={() => {
                  setDialogState({ kind: "report-post" });
                }}
                disabled={busyAction === "report:post"}
                className="forum-button-icon"
                title="Signaler"
                aria-label="Signaler le post"
              >
                <Flag className="h-4 w-4" />
              </button>
            ) : null}
            {isAuthor ? (
              <>
              <Link
                href={`/posts/${post.id}/edit`}
                className="forum-button-icon"
                title="Modifier"
                aria-label="Modifier le post"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDialogState({ kind: "delete-post" });
                }}
                disabled={busyAction === "post:delete"}
                className="forum-button-icon forum-button-icon-danger"
                title="Supprimer"
                aria-label="Supprimer le post"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="forum-toolbar mt-5">
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={busyAction === "like"}
            className="forum-button-ghost"
          >
            <Heart
              className={`mr-2 h-4 w-4 ${
                likedByUser ? "fill-current text-red-500" : ""
              }`}
            />
            {post.likeCount}
          </button>
          <div className="forum-meta-line">
            <MessageSquareMore className="h-3.5 w-3.5 text-[color:var(--accent)]" />
            <strong>{comments.length}</strong>
            <span>réponse{comments.length > 1 ? "s" : ""}</span>
          </div>
        </div>

        {post.title ? (
          <h1 className="forum-title mt-6 text-4xl leading-tight sm:text-5xl">
            {post.title}
          </h1>
        ) : (
          <div className="mt-6">
            <span className="forum-pill">Carte média</span>
          </div>
        )}

        {post.media.length ? (
          <div className="mt-6">
            <PostMediaGallery media={post.media} />
          </div>
        ) : null}

        {post.content ? (
          <div className="forum-richtext mt-6 text-[15px] leading-8">
            {post.content}
          </div>
        ) : null}
      </article>

      <section className="forum-card p-6 sm:p-8">
        <div className="forum-section-head">
          <div>
            <h2 className="forum-title mt-4 text-3xl sm:text-4xl">Réponses</h2>
            <div className="forum-meta-line mt-3">
              <span>{comments.length} réponse(s)</span>
            </div>
          </div>
        </div>

        {user ? (
          <div className="forum-card-quiet mt-6 p-4 sm:p-5">
            <textarea
              className="forum-textarea min-h-32"
              placeholder="Écris une réponse."
              value={commentDraft}
              onChange={(event) => {
                setCommentDraft(event.target.value);
              }}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="forum-inline-note">{commentDraft.trim().length}/1000</span>
              <button
                type="button"
                onClick={handleCreateComment}
                disabled={busyAction === "comment:create"}
                className="forum-button-primary"
              >
                {busyAction === "comment:create" ? "Envoi…" : "Répondre"}
              </button>
            </div>
          </div>
        ) : (
          <div className="forum-card-quiet mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
            <p className="forum-muted text-sm">Accès requis pour répondre.</p>
            <Link
              href={`/login?next=${encodeURIComponent(`/posts/${postId}`)}`}
              className="forum-button-ghost"
            >
              Accès
            </Link>
          </div>
        )}

        <div className="mt-6 grid gap-4">
          {comments.length ? (
            comments.map((comment) => {
              const isCommentAuthor = user?.uid === comment.author.uid;
              const isEditing = editingCommentId === comment.id;

              return (
                <article
                  key={comment.id}
                  className="forum-thread-item forum-card-quiet p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        avatarUrl={comment.author.avatarUrl}
                        username={comment.author.username}
                        seed={comment.author.uid}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/profile/${comment.author.usernameLower}`}
                          className="block truncate text-sm font-semibold uppercase tracking-[0.14em] hover:text-[color:var(--accent-dark)]"
                        >
                          {comment.author.username}
                        </Link>
                        <div className="forum-meta-line text-xs">
                          <span title={formatAbsoluteDate(comment.createdAt)}>
                            {formatRelativeDate(comment.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="forum-toolbar">
                      {!isCommentAuthor ? (
                        <button
                          type="button"
                          className="forum-button-icon"
                          onClick={() => {
                            setDialogState({ kind: "report-comment", comment });
                          }}
                          disabled={busyAction === `report:comment:${comment.id}`}
                          title="Signaler"
                          aria-label="Signaler le commentaire"
                        >
                          <Flag className="h-4 w-4" />
                        </button>
                      ) : null}
                      {isCommentAuthor ? (
                        <>
                        <button
                          type="button"
                          className="forum-button-icon"
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditingCommentDraft(comment.content);
                          }}
                          title="Modifier"
                          aria-label="Modifier le commentaire"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="forum-button-icon forum-button-icon-danger"
                          onClick={() => {
                            setDialogState({
                              kind: "delete-comment",
                              commentId: comment.id,
                            });
                          }}
                          disabled={busyAction === `comment:delete:${comment.id}`}
                          title="Supprimer"
                          aria-label="Supprimer le commentaire"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-4 grid gap-3">
                      <textarea
                        className="forum-textarea min-h-28"
                        value={editingCommentDraft}
                        onChange={(event) => {
                          setEditingCommentDraft(event.target.value);
                        }}
                      />
                      <div className="forum-toolbar">
                        <button
                          type="button"
                          onClick={() => {
                            void handleSaveEditedComment(comment.id);
                          }}
                          disabled={busyAction === `comment:update:${comment.id}`}
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
                          className="forum-button-ghost"
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
            <div className="forum-card-quiet px-6 py-10 text-center">
              <h3 className="forum-title text-2xl sm:text-3xl">Aucune réponse</h3>
              <p className="forum-muted mt-3 text-sm">
                Ce post attend sa première réponse.
              </p>
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={dialogState !== null}
        title={
          dialogState?.kind === "delete-post"
            ? "Supprimer ce post ?"
            : dialogState?.kind === "delete-comment"
              ? "Supprimer ce commentaire ?"
              : dialogState?.kind === "report-post"
                ? "Signaler ce post ?"
                : "Signaler ce commentaire ?"
        }
        description={
          dialogState?.kind === "delete-post"
            ? "Ce post sera retiré du forum avec ses réponses et ses interactions."
            : dialogState?.kind === "delete-comment"
              ? "Ce commentaire sera retiré définitivement de la discussion."
              : dialogState?.kind === "report-post"
                ? "Le post sera envoyé dans la file de signalements admin."
                : dialogState?.kind === "report-comment"
                  ? "Le commentaire sera envoyé dans la file de signalements admin."
              : ""
        }
        confirmLabel={
          dialogState?.kind === "report-post" ||
          dialogState?.kind === "report-comment"
            ? "Signaler"
            : "Supprimer"
        }
        tone={
          dialogState?.kind === "report-post" ||
          dialogState?.kind === "report-comment"
            ? "default"
            : "danger"
        }
        busy={
          dialogState?.kind === "delete-post"
            ? busyAction === "post:delete"
            : dialogState?.kind === "delete-comment"
              ? busyAction === `comment:delete:${dialogState.commentId}`
              : dialogState?.kind === "report-post"
                ? busyAction === "report:post"
                : dialogState?.kind === "report-comment"
                  ? busyAction === `report:comment:${dialogState.comment.id}`
              : false
        }
        onClose={() => {
          if (!busyAction) {
            setDialogState(null);
          }
        }}
        onConfirm={() => {
          if (dialogState?.kind === "delete-post") {
            void handleDeletePost();
            return;
          }

          if (dialogState?.kind === "delete-comment") {
            void handleDeleteComment(dialogState.commentId);
            return;
          }

          if (dialogState?.kind === "report-post") {
            void handleReportPost();
            return;
          }

          if (dialogState?.kind === "report-comment") {
            void handleReportComment(dialogState.comment);
          }
        }}
      />
    </div>
  );
}
