import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";

export function formatRelativeDate(date: Date | null) {
  if (!date) {
    return "à l’instant";
  }

  return formatDistanceToNowStrict(date, {
    addSuffix: true,
    locale: fr,
  });
}

export function formatAbsoluteDate(date: Date | null) {
  if (!date) {
    return "En attente";
  }

  return format(date, "PPP 'à' HH:mm", { locale: fr });
}

export function formatJoinedDate(date: Date | null) {
  if (!date) {
    return "Récemment";
  }

  return format(date, "PPP", { locale: fr });
}
