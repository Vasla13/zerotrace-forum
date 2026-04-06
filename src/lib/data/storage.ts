"use client";

import type { User } from "firebase/auth";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { ForumPostMedia } from "@/lib/types/forum";
import { getFirebaseStorage } from "@/lib/firebase/client";
import {
  getForumMediaType,
  isImageContentType,
  isVideoContentType,
  MAX_AVATAR_BYTES,
  MAX_POST_MEDIA_BYTES,
  sanitizeUploadFileName,
} from "@/lib/utils/media";

function assertAvatarFile(file: File) {
  if (!isImageContentType(file.type)) {
    throw new Error("La photo de profil doit être une image.");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("La photo de profil doit faire moins de 5 Mo.");
  }
}

function assertPostMediaFile(file: File) {
  if (!isImageContentType(file.type) && !isVideoContentType(file.type)) {
    throw new Error("Seules les images et vidéos sont autorisées.");
  }

  if (file.size > MAX_POST_MEDIA_BYTES) {
    throw new Error("Chaque média doit faire moins de 25 Mo.");
  }
}

export async function uploadForumAvatar(user: User, file: File) {
  assertAvatarFile(file);

  const storage = getFirebaseStorage();
  const avatarRef = ref(storage, `users/${user.uid}/avatar`);
  await uploadBytes(avatarRef, file, {
    cacheControl: "public,max-age=3600",
    contentType: file.type,
  });

  return getDownloadURL(avatarRef);
}

export async function deleteForumAvatar(user: User) {
  const storage = getFirebaseStorage();
  const avatarRef = ref(storage, `users/${user.uid}/avatar`);

  await deleteObject(avatarRef).catch((error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "storage/object-not-found"
    ) {
      return;
    }

    throw error;
  });
}

export async function uploadForumPostMedia(
  user: User,
  postId: string,
  files: File[],
) {
  const storage = getFirebaseStorage();

  return Promise.all(
    files.map(async (file, index) => {
      assertPostMediaFile(file);

      const safeName = sanitizeUploadFileName(file.name);
      const storagePath = `posts/${user.uid}/${postId}/${Date.now()}-${index}-${safeName}`;
      const mediaRef = ref(storage, storagePath);
      await uploadBytes(mediaRef, file, {
        cacheControl: "public,max-age=3600",
        contentType: file.type,
      });

      return {
        storagePath,
        type: getForumMediaType(file.type),
        url: await getDownloadURL(mediaRef),
      } satisfies ForumPostMedia;
    }),
  );
}

export async function deleteForumStorageObjectByPath(path: string) {
  const storage = getFirebaseStorage();
  const mediaRef = ref(storage, path);

  await deleteObject(mediaRef).catch((error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "storage/object-not-found"
    ) {
      return;
    }

    throw error;
  });
}
