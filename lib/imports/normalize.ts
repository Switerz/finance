import type { ImportRawRow, ManualTransactionType } from "@/types/finance";

export function normalizeLookup(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function readCell(row: ImportRawRow, column: string | undefined) {
  if (!column) {
    return "";
  }

  const value = row[column];

  return String(value ?? "").trim();
}

export function parseImportDate(value: string) {
  const raw = value.trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const br = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);

  if (iso) {
    return validateDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  if (br) {
    return validateDateParts(Number(br[3]), Number(br[2]), Number(br[1]));
  }

  return null;
}

export function parseImportAmount(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/[^\d,.-]/g, "");

  if (!normalized) {
    return null;
  }

  const decimalComma =
    normalized.includes(",") &&
    (!normalized.includes(".") || normalized.lastIndexOf(",") > normalized.lastIndexOf("."));
  const numeric = decimalComma
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized.replace(/,/g, "");
  const parsed = Number(numeric);

  return Number.isFinite(parsed) ? parsed : null;
}

export function parseImportType(value: string): ManualTransactionType | null {
  const normalized = normalizeLookup(value);

  if (
    ["income", "receita", "entrada", "credito", "crédito"].includes(normalized)
  ) {
    return "income";
  }

  if (
    ["expense", "despesa", "gasto", "saida", "saída", "debito", "débito"].includes(
      normalized
    )
  ) {
    return "expense";
  }

  if (
    ["investment", "investimento", "aplicacao", "aplicação", "aporte"].includes(
      normalized
    )
  ) {
    return "investment";
  }

  return null;
}

export function inferImportType(
  amount: number,
  typeValue: string,
  defaultType: ManualTransactionType | "auto"
): ManualTransactionType {
  const mappedType = parseImportType(typeValue);

  if (mappedType) {
    return mappedType;
  }

  if (defaultType !== "auto") {
    return defaultType;
  }

  return amount < 0 ? "expense" : "income";
}

export function duplicateKey(input: {
  transactionDate: string;
  description: string;
  amount: number;
  type: ManualTransactionType;
  accountId: string;
}) {
  const cents = Math.round(Math.abs(input.amount) * 100);

  return [
    input.transactionDate,
    normalizeLookup(input.description),
    cents,
    input.type,
    input.accountId
  ].join("|");
}

function validateDateParts(year: number, month: number, day: number) {
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
