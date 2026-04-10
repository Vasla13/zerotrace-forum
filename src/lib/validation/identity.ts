import { z } from "zod";

const usernameRegex = /^[A-Za-z0-9_]{3,24}$/;

export const identityUsernameSchema = z
  .string()
  .trim()
  .regex(
    usernameRegex,
    "Le pseudo doit faire 3 à 24 caractères et n’utiliser que lettres, chiffres ou underscores.",
  );

export const identityPasswordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(72, "Le mot de passe est trop long.");

export const identityCreateSchema = z.object({
  mode: z.literal("create"),
  password: identityPasswordSchema,
  username: identityUsernameSchema,
});

export const identityResumeSchema = z.object({
  mode: z.literal("resume"),
  password: identityPasswordSchema,
  username: identityUsernameSchema,
});

export const identityAuthSchema = z.discriminatedUnion("mode", [
  identityCreateSchema,
  identityResumeSchema,
]);

export type IdentityAuthValues = z.infer<typeof identityAuthSchema>;
export type IdentityCreateValues = z.infer<typeof identityCreateSchema>;
export type IdentityResumeValues = z.infer<typeof identityResumeSchema>;
