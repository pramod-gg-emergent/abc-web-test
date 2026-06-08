// Backend API client for the Expense Tracker.
// Uses EXPO_PUBLIC_BACKEND_URL from .env and prefixes all routes with /api.
import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export type Expense = {
  id: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  created_at: string;
};

export type Budget = {
  weekly_limit: number;
  currency: string;
};

export type WeekSummary = {
  week_start: string;
  week_end: string;
  total: number;
  by_category: Record<string, number>;
  by_day: Record<string, number>;
  weekly_limit: number;
  currency: string;
  percent_used: number;
  over_limit: boolean;
};

export type Suggestion = { title: string; body: string };
export type SuggestionsResponse = {
  summary: string;
  suggestions: Suggestion[];
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listExpenses: (params?: { start?: string; end?: string }) => {
    const qs = new URLSearchParams();
    if (params?.start) qs.set("start", params.start);
    if (params?.end) qs.set("end", params.end);
    const q = qs.toString();
    return request<Expense[]>(`/expenses${q ? `?${q}` : ""}`);
  },
  createExpense: (body: {
    amount: number;
    category: string;
    note?: string;
    date?: string;
  }) =>
    request<Expense>("/expenses", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteExpense: (id: string) =>
    request<{ deleted: boolean }>(`/expenses/${id}`, { method: "DELETE" }),
  weekSummary: () => request<WeekSummary>("/expenses/week"),
  getBudget: () => request<Budget>("/budget"),
  setBudget: (body: { weekly_limit: number; currency?: string }) =>
    request<Budget>("/budget", { method: "PUT", body: JSON.stringify(body) }),
  suggestions: () => request<SuggestionsResponse>("/suggestions"),
};

// Track which "near-limit" thresholds the user already dismissed this week,
// so we don't spam the same alert.
const ALERT_KEY_PREFIX = "expense-alert-shown-";
export const alertStore = {
  shouldShow: async (weekStart: string, level: "80" | "100") => {
    const key = `${ALERT_KEY_PREFIX}${weekStart}-${level}`;
    const shown = await storage.getItem<boolean>(key, false);
    return !shown;
  },
  markShown: async (weekStart: string, level: "80" | "100") => {
    const key = `${ALERT_KEY_PREFIX}${weekStart}-${level}`;
    await storage.setItem(key, true);
  },
};
