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
    return "Date inconnue";
  }

  return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

export function formatJoinedDate(date: Date | null) {
  if (!date) {
    return "Date inconnue";
  }

  return format(date, "d MMMM yyyy", { locale: fr });
}

export function formatSystemDate(date: Date | null) {
  if (!date) {
    return "Date inconnue";
  }

  return format(date, "dd/MM/yyyy HH:mm", { locale: fr });
}
