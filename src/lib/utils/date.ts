import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";

const LORE_YEAR = 2035;

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

  return `${format(date, "d MMMM", { locale: fr })} ${LORE_YEAR} à ${format(
    date,
    "HH:mm",
  )}`;
}

export function formatJoinedDate(date: Date | null) {
  if (!date) {
    return "Récemment";
  }

  return `${format(date, "d MMMM", { locale: fr })} ${LORE_YEAR}`;
}

export function formatSystemDate(date: Date | null) {
  if (!date) {
    return "SYS//PENDING";
  }

  return `${LORE_YEAR}-${format(date, "MM-dd HH:mm:ss")}`;
}
