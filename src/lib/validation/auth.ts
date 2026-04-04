import { z } from "zod";

const usernameRegex = /^[A-Za-z0-9_]{3,24}$/;

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(
      usernameRegex,
      "Le pseudo doit faire 3 à 24 caractères et n’utiliser que lettres, chiffres ou underscores.",
    ),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .regex(
        usernameRegex,
        "Le pseudo doit faire 3 à 24 caractères et n’utiliser que lettres, chiffres ou underscores.",
      ),
    password: z
      .string()
      .min(6, "Le mot de passe doit contenir au moins 6 caractères."),
    confirmPassword: z.string(),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Les mots de passe ne correspondent pas.",
        path: ["confirmPassword"],
      });
    }
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
