import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function parseDate(date: Date | string) {
  return typeof date === "string" ? parseISO(date) : date;
}

export function formatDateBR(date: Date | string) {
  return format(parseDate(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatMonthBR(date: Date | string) {
  return format(parseDate(date), "MMMM yyyy", { locale: ptBR });
}
