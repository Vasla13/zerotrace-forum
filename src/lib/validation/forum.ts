import { z } from "zod";

export const postSchema = z.object({
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

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, "Le commentaire doit contenir au moins 2 caractères.")
    .max(1000, "Le commentaire ne peut pas dépasser 1000 caractères."),
});

export type PostFormValues = z.infer<typeof postSchema>;
export type CommentFormValues = z.infer<typeof commentSchema>;
