// Currency / date formatting helpers shared across screens.
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "\u20B9",
  EUR: "\u20AC",
  GBP: "\u00A3",
  JPY: "\u00A5",
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code + " ";
}

export function formatMoney(amount: number, currency: string): string {
  const sym = getCurrencySymbol(currency);
  const rounded = Number.isInteger(amount) ? amount : Number(amount.toFixed(2));
  return `${sym}${rounded.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDayShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
}

export function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
