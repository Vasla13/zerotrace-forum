import { z } from "zod";
import { canonicalizeAccessCode } from "@/lib/utils/access-code";

const usernameRegex = /^[A-Za-z0-9_]{3,24}$/;

export const accessCodeOnlySchema = z.object({
  accessCode: z
    .string()
    .trim()
    .refine(
      (value) => canonicalizeAccessCode(value).length >= 8,
      "Le code d’accès doit contenir au moins 8 caractères valides.",
    ),
});

export const accessAuthSchema = z.object({
  accessCode: accessCodeOnlySchema.shape.accessCode,
  username: z
    .string()
    .trim()
    .transform((value) => value || "")
    .refine(
      (value) => !value || usernameRegex.test(value),
      "Le pseudo doit faire 3 à 24 caractères et n’utiliser que lettres, chiffres ou underscores.",
    ),
});

export type AccessCodeOnlyValues = z.infer<typeof accessCodeOnlySchema>;
export type AccessAuthValues = z.infer<typeof accessAuthSchema>;
