import { ZodError } from "zod";

const firebaseErrorMessages: Record<string, string> = {
  "auth/email-already-in-use": "Ce compte existe déjà.",
  "auth/invalid-email": "Impossible de valider l’identifiant interne du compte.",
  "auth/invalid-credential":
    "Pseudo ou mot de passe incorrect. Vérifie aussi que le provider Email/Mot de passe est activé dans Firebase.",
  "auth/network-request-failed": "Erreur réseau pendant la requête Firebase.",
  "auth/operation-not-allowed":
    "Le provider Email/Mot de passe n’est pas encore activé dans Firebase Authentication.",
  "auth/too-many-requests":
    "Trop de tentatives. Réessaie dans quelques instants.",
  "auth/user-not-found": "Aucun compte trouvé pour ce pseudo.",
  "permission-denied":
    "Permission refusée. Vérifie que les règles Firestore ont bien été déployées.",
};

export function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Le formulaire contient des erreurs.";
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return firebaseErrorMessages[error.code] ?? `Erreur Firebase: ${error.code}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur inattendue est survenue.";
}
