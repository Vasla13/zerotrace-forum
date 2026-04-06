export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const MAX_POST_MEDIA_BYTES = 25 * 1024 * 1024;
export const MAX_POST_MEDIA_ITEMS = 4;

export function isImageContentType(value: string) {
  return /^image\//i.test(value);
}

export function isVideoContentType(value: string) {
  return /^video\//i.test(value);
}

export function getForumMediaType(contentType: string) {
  return isVideoContentType(contentType) ? "video" : "image";
}

export function sanitizeUploadFileName(value: string) {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "file";
}
