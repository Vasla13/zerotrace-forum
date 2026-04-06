import { z } from "zod";

const usernameFieldSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9_]{3,24}$/,
    "Le pseudo doit faire 3 à 24 caractères et n’utiliser que lettres, chiffres ou underscores.",
  );

export const profileUsernameSchema = z.object({
  username: usernameFieldSchema,
});

export const profileUpdateSchema = z
  .object({
    avatarUrl: z
      .string()
      .trim()
      .url("URL d’avatar invalide.")
      .max(2000, "URL d’avatar trop longue.")
      .nullable()
      .optional(),
    username: usernameFieldSchema.optional(),
  })
  .refine(
    (value) => value.username !== undefined || value.avatarUrl !== undefined,
    "Aucune modification reçue.",
  );

export type ProfileUsernameValues = z.infer<typeof profileUsernameSchema>;
export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>;
