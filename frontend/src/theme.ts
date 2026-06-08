// Shared theme tokens for the Expense Tracker app.
// Mirrors /app/design_guidelines.json (Organic & Earthy, Light theme).
export const colors = {
  background: "#F9F8F6",
  surface: "#FFFFFF",
  primary: "#4A7C59",
  primaryHover: "#3A6347",
  secondary: "#E8ECE9",
  warning: "#C05746",
  warningLight: "#FADED9",
  textPrimary: "#2C302E",
  textSecondary: "#6B706D",
  border: "#E5E5E5",
};

export const radius = {
  card: 24,
  button: 999,
  input: 16,
  chip: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fonts = {
  // We don't ship Outfit/Manrope — using system fallback with bold weights.
  heading: undefined as undefined | string,
  body: undefined as undefined | string,
};

// Category metadata
export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Entertainment"
  | "Health"
  | "Others";

export const CATEGORIES: Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Others",
];

export const CATEGORY_META: Record<
  Category,
  { icon: string; color: string }
> = {
  Food: { icon: "restaurant-outline", color: "#E8A23B" },
  Transport: { icon: "car-outline", color: "#3B82F6" },
  Shopping: { icon: "bag-outline", color: "#A855F7" },
  Bills: { icon: "receipt-outline", color: "#C05746" },
  Entertainment: { icon: "game-controller-outline", color: "#EC4899" },
  Health: { icon: "heart-outline", color: "#10B981" },
  Others: { icon: "ellipsis-horizontal-outline", color: "#6B706D" },
};
