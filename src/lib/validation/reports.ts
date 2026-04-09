import { z } from "zod";

export const reportKindValues = ["post", "comment"] as const;

export const createReportSchema = z.object({
  commentId: z
    .string()
    .trim()
    .max(120, "Identifiant de commentaire invalide.")
    .nullable()
    .optional(),
  kind: z.enum(reportKindValues),
  postId: z
    .string()
    .trim()
    .min(1, "Post invalide.")
    .max(120, "Post invalide."),
  postTitle: z
    .string()
    .trim()
    .max(120, "Titre trop long.")
    .nullable()
    .optional(),
  previewText: z
    .string()
    .trim()
    .min(1, "Aperçu manquant.")
    .max(500, "Aperçu trop long."),
  targetAuthorUsername: z
    .string()
    .trim()
    .min(1, "Auteur cible manquant.")
    .max(24, "Auteur cible invalide."),
}).superRefine((value, ctx) => {
  if (value.kind === "comment" && !value.commentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Commentaire invalide.",
      path: ["commentId"],
    });
  }
});

export const adminReportStateSchema = z.object({
  resolved: z.boolean(),
});

export type CreateReportValues = z.infer<typeof createReportSchema>;
