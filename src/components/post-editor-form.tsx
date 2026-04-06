"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, PenLine, Send, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { ForumSetupNotice } from "@/components/forum-setup-notice";
import { PostMediaGallery } from "@/components/post-media-gallery";
import {
  createDraftPostId,
  createForumPost,
  subscribeToPost,
  updateForumPost,
} from "@/lib/data/posts";
import {
  deleteForumStorageObjectByPath,
  uploadForumPostMedia,
} from "@/lib/data/storage";
import type { ForumPost } from "@/lib/types/forum";
import { getErrorMessage } from "@/lib/utils/errors";
import {
  getForumMediaType,
  isImageContentType,
  isVideoContentType,
  MAX_POST_MEDIA_BYTES,
  MAX_POST_MEDIA_ITEMS,
} from "@/lib/utils/media";
import { postFieldsSchema, type PostFormValues } from "@/lib/validation/forum";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";

type PostEditorFormProps = {
  mode: "create" | "edit";
  postId?: string;
};

type DraftMediaItem =
  | {
      id: string;
      kind: "existing";
      media: ForumPost["media"][number];
      previewUrl: string;
      type: "image" | "video";
    }
  | {
      id: string;
      kind: "new";
      file: File;
      previewUrl: string;
      type: "image" | "video";
    };

function createDraftMediaId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildExistingMediaItems(post: ForumPost) {
  return post.media.map((item) => ({
    id: `existing-${item.storagePath}`,
    kind: "existing" as const,
    media: item,
    previewUrl: item.url,
    type: item.type,
  }));
}

function revokeDraftMediaPreview(item: DraftMediaItem) {
  if (item.kind === "new") {
    URL.revokeObjectURL(item.previewUrl);
  }
}

export function PostEditorForm({ mode, postId }: PostEditorFormProps) {
  const router = useRouter();
  const { configured, loading: authLoading, profile, user } = useAuth();
  const [post, setPost] = useState<ForumPost | null | undefined>(
    mode === "create" ? null : undefined,
  );
  const [loadingPost, setLoadingPost] = useState(mode === "edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaItems, setMediaItems] = useState<DraftMediaItem[]>([]);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const mediaItemsRef = useRef<DraftMediaItem[]>([]);

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFieldsSchema),
    defaultValues: {
      title: "",
      content: "",
    },
  });

  const titleValue = watch("title");
  const contentValue = watch("content");

  useEffect(() => {
    mediaItemsRef.current = mediaItems;
  }, [mediaItems]);

  useEffect(() => {
    return () => {
      mediaItemsRef.current.forEach(revokeDraftMediaPreview);
    };
  }, []);

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
          setMediaItems((currentItems) => {
            currentItems.forEach(revokeDraftMediaPreview);
            return buildExistingMediaItems(nextPost);
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

  function handleOpenMediaPicker() {
    mediaInputRef.current?.click();
  }

  function handleRemoveMedia(itemId: string) {
    setMediaItems((currentItems) => {
      const nextItems = currentItems.filter((item) => item.id !== itemId);
      const removedItems = currentItems.filter((item) => item.id === itemId);

      removedItems.forEach(revokeDraftMediaPreview);

      return nextItems;
    });
  }

  function handlePickedMedia(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const selectedFiles = Array.from(files);
    const remainingSlots = MAX_POST_MEDIA_ITEMS - mediaItemsRef.current.length;

    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_POST_MEDIA_ITEMS} média(s) par post.`);
      return;
    }

    const acceptedFiles = selectedFiles.slice(0, remainingSlots);

    if (selectedFiles.length > acceptedFiles.length) {
      toast.error(`Maximum ${MAX_POST_MEDIA_ITEMS} média(s) par post.`);
    }

    const nextItems: DraftMediaItem[] = [];

    for (const file of acceptedFiles) {
      if (!isImageContentType(file.type) && !isVideoContentType(file.type)) {
        toast.error("Seules les images et vidéos sont autorisées.");
        continue;
      }

      if (file.size > MAX_POST_MEDIA_BYTES) {
        toast.error("Chaque média doit faire moins de 25 Mo.");
        continue;
      }

      nextItems.push({
        file,
        id: `new-${createDraftMediaId()}`,
        kind: "new",
        previewUrl: URL.createObjectURL(file),
        type: getForumMediaType(file.type),
      });
    }

    if (!nextItems.length) {
      return;
    }

    setMediaItems((currentItems) => [...currentItems, ...nextItems]);
  }

  async function onSubmit(values: PostFormValues) {
    if (!profile || !user) {
      toast.error("Tu dois être connecté pour publier.");
      return;
    }

    setIsSubmitting(true);

    const resolvedPostId = mode === "create" ? createDraftPostId() : postId;

    if (!resolvedPostId) {
      toast.error("Identifiant de post manquant.");
      setIsSubmitting(false);
      return;
    }

    const keptMedia = mediaItems
      .filter((item): item is Extract<DraftMediaItem, { kind: "existing" }> => {
        return item.kind === "existing";
      })
      .map((item) => item.media);
    const pendingUploads = mediaItems.filter(
      (item): item is Extract<DraftMediaItem, { kind: "new" }> =>
        item.kind === "new",
    );
    const removedMedia =
      mode === "edit" && post
        ? post.media.filter(
            (currentItem) =>
              !keptMedia.some(
                (keptItem) => keptItem.storagePath === currentItem.storagePath,
              ),
          )
        : [];
    const uploadedMedia: ForumPost["media"] = [];

    try {
      for (const item of pendingUploads) {
        const [uploadedItem] = await uploadForumPostMedia(user, resolvedPostId, [
          item.file,
        ]);
        uploadedMedia.push(uploadedItem);
      }

      const nextMedia = [...keptMedia, ...uploadedMedia];

      if (mode === "create") {
        const createdPostId = await createForumPost(
          resolvedPostId,
          values,
          nextMedia,
          profile,
        );
        toast.success("Post publié.");
        startTransition(() => {
          router.push(`/posts/${createdPostId}`);
        });
        return;
      }

      await updateForumPost(resolvedPostId, user.uid, values, nextMedia);

      const deletionResults = await Promise.allSettled(
        removedMedia.map((item) => deleteForumStorageObjectByPath(item.storagePath)),
      );
      const failedDeletionCount = deletionResults.filter(
        (result) => result.status === "rejected",
      ).length;

      if (failedDeletionCount) {
        toast.warning("Le post est à jour, mais un ancien média n’a pas pu être nettoyé.");
      }

      toast.success("Post mis à jour.");
      startTransition(() => {
        router.push(`/posts/${resolvedPostId}`);
      });
    } catch (error) {
      if (uploadedMedia.length) {
        await Promise.allSettled(
          uploadedMedia.map((item) =>
            deleteForumStorageObjectByPath(item.storagePath),
          ),
        );
      }
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
              {mode === "create" ? "Rédaction" : "Édition"}
            </span>
            <h1 className="forum-title mt-5 text-4xl sm:text-5xl">
              {mode === "create" ? "Nouveau post" : "Modifier le post"}
            </h1>
            <p className="forum-muted mt-3 text-sm">
              Un titre clair et un message utile.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 grid gap-5">
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(event) => {
              handlePickedMedia(event.target.files);
              event.target.value = "";
            }}
          />

          <label className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Titre</span>
              <span className="forum-inline-note">{titleValue.length}/120</span>
            </div>
            <input
              {...register("title")}
              className="forum-input"
              placeholder="Exemple : Nouveau patch Biotechnica"
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
              placeholder="Écris ton message."
            />
            {errors.content ? (
              <span className="text-xs text-[color:var(--danger)]">
                {errors.content.message}
              </span>
            ) : null}
          </label>

          <section className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Médias</div>
                <div className="forum-inline-note mt-2">
                  Images et vidéos. {mediaItems.length}/{MAX_POST_MEDIA_ITEMS}
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenMediaPicker}
                disabled={mediaItems.length >= MAX_POST_MEDIA_ITEMS || isSubmitting}
                className="forum-button-ghost"
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Ajouter un média
              </button>
            </div>

            {mediaItems.length ? (
              <>
                <div className="forum-media-upload-grid">
                  {mediaItems.map((item) => (
                    <div key={item.id} className="forum-media-upload-tile">
                      <button
                        type="button"
                        onClick={() => {
                          handleRemoveMedia(item.id);
                        }}
                        className="forum-media-remove"
                        aria-label="Retirer ce média"
                        title="Retirer ce média"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <PostMediaGallery
                        media={[
                          item.kind === "existing"
                            ? item.media
                            : {
                                storagePath: item.id,
                                type: item.type,
                                url: item.previewUrl,
                              },
                        ]}
                        compact
                      />
                      <div className="forum-media-upload-meta">
                        <span>{item.type === "video" ? "vidéo" : "image"}</span>
                        <strong>
                          {item.kind === "existing"
                            ? "déjà publié"
                            : item.file.name}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="forum-muted text-xs">
                  4 médias max. 25 Mo max par fichier.
                </div>
              </>
            ) : (
              <div className="forum-media-upload-empty">
                Ajoute une image ou une vidéo si le post en a besoin.
              </div>
            )}
          </section>

          <div className="forum-divider" />

          <div className="forum-toolbar justify-between">
            <span className="forum-muted text-sm">
              Public.
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
