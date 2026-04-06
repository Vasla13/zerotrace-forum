import { z } from "zod";

export const profileUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9_]{3,24}$/,
      "Le pseudo doit faire 3 à 24 caractères et n’utiliser que lettres, chiffres ou underscores.",
    ),
});

export type ProfileUsernameValues = z.infer<typeof profileUsernameSchema>;
