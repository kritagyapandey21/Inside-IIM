import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and de-duplicate Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ISO 4217 currency code → display symbol/prefix. Falls back to "<CODE> ". */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  HKD: "HK$",
  KRW: "₩",
  CAD: "C$",
  AUD: "A$",
  SGD: "S$",
  CHF: "CHF ",
  BRL: "R$",
  ZAR: "R",
  MXN: "MX$",
  RUB: "₽",
  TRY: "₺",
  IDR: "Rp",
  THB: "฿",
  TWD: "NT$",
  VND: "₫",
  AED: "AED ",
  SAR: "SAR ",
  ILS: "₪",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  NZD: "NZ$",
};

/** Resolve a Yahoo/ISO currency code to its display symbol. */
export function currencySymbol(code?: string | null): string {
  if (!code) return "$";
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

/**
 * Yahoo quotes London-listed stocks in GBp (pence), not GBP (pounds) — a
 * well-known quirk. Normalize to whole pounds so the displayed number isn't
 * 100x too large next to a "£" sign.
 */
function normalizeCurrency(n: number, currency?: string | null): { value: number; code: string | undefined } {
  if (currency === "GBp" || currency === "GBX") {
    return { value: n / 100, code: "GBP" };
  }
  return { value: n, code: currency ?? undefined };
}

/** Compact number formatter for financials (e.g. 1.2B, 340M, 12.3K). Pass a
 *  currency code to prefix the correct symbol; omit it for unitless counts
 *  (e.g. share volume). */
export function fmtCompact(n?: number | null, currency?: string | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const { value, code } = normalizeCurrency(n, currency);
  const symbol = currency ? currencySymbol(code) : "";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${symbol}${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${symbol}${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${symbol}${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${symbol}${(value / 1e3).toFixed(1)}K`;
  return `${symbol}${value.toFixed(2)}`;
}

/** Format a price/money value with the correct currency symbol (defaults to
 *  USD when the instrument's currency is unknown). */
export function fmtMoney(n?: number | null, currency?: string | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const { value, code } = normalizeCurrency(n, currency);
  return `${currencySymbol(code)}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function fmtPct(n?: number | null, alreadyPct = false): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const v = alreadyPct ? n : n * 100;
  return `${v >= 0 ? "" : ""}${v.toFixed(1)}%`;
}

export function fmtNum(n?: number | null, digits = 2): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}
