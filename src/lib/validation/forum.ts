import { z } from "zod";
import { MAX_POST_MEDIA_ITEMS } from "@/lib/utils/media";

export const postMediaSchema = z.object({
  storagePath: z
    .string()
    .trim()
    .min(1, "Chemin média invalide.")
    .max(500, "Chemin média trop long."),
  type: z.enum(["image", "video"]),
  url: z
    .string()
    .trim()
    .url("URL média invalide.")
    .max(2000, "URL média trop longue."),
});

export const postFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(6, "Le titre doit contenir au moins 6 caractères.")
    .max(120, "Le titre ne peut pas dépasser 120 caractères."),
  content: z
    .string()
    .trim()
    .min(20, "Le contenu doit contenir au moins 20 caractères.")
    .max(5000, "Le contenu ne peut pas dépasser 5000 caractères."),
});

export const postSchema = postFieldsSchema.extend({
  media: z
    .array(postMediaSchema)
    .max(
      MAX_POST_MEDIA_ITEMS,
      `Un post peut contenir au maximum ${MAX_POST_MEDIA_ITEMS} média(s).`,
    ),
});

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, "Le commentaire doit contenir au moins 2 caractères.")
    .max(1000, "Le commentaire ne peut pas dépasser 1000 caractères."),
});

export type PostFormValues = z.infer<typeof postFieldsSchema>;
export type CommentFormValues = z.infer<typeof commentSchema>;
export type StoredPostValues = z.infer<typeof postSchema>;
