import { z } from "zod";
import {
  forumChannelValues,
  forumPostDisplayModeValues,
} from "@/lib/forum/config";
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

const postFieldsBaseSchema = z.object({
  channel: z.enum(forumChannelValues),
  content: z
    .string()
    .trim()
    .max(5000, "Le contenu ne peut pas dépasser 5000 caractères."),
  displayMode: z.enum(forumPostDisplayModeValues),
  title: z
    .string()
    .trim()
    .max(120, "Le titre ne peut pas dépasser 120 caractères."),
});

function validatePostFields(
  value: z.infer<typeof postFieldsBaseSchema>,
  ctx: z.RefinementCtx,
) {
  if (value.displayMode === "standard") {
    if (value.title.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le titre doit contenir au moins 6 caractères.",
        path: ["title"],
      });
    }

    if (value.content.length < 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le contenu doit contenir au moins 20 caractères.",
        path: ["content"],
      });
    }

    return;
  }

  if (value.content.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La légende doit contenir au moins 2 caractères.",
      path: ["content"],
    });
  }

  if (value.content.length > 280) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La légende ne peut pas dépasser 280 caractères.",
      path: ["content"],
    });
  }
}

export const postFieldsSchema = postFieldsBaseSchema.superRefine(validatePostFields);

export const postSchema = postFieldsBaseSchema.extend({
  media: z
    .array(postMediaSchema)
    .max(
      MAX_POST_MEDIA_ITEMS,
      `Un post peut contenir au maximum ${MAX_POST_MEDIA_ITEMS} média(s).`,
    ),
}).superRefine((value, ctx) => {
  validatePostFields(value, ctx);

  if (value.displayMode === "media" && value.media.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Ajoute au moins un média pour une carte média.",
      path: ["media"],
    });
  }
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
