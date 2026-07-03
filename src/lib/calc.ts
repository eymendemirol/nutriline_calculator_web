export type ContentUnit = "mg" | "g" | "kg";
export type WeightUnit = "g" | "kg" | "ton";

export const CONTENT_UNIT_OPTIONS: ContentUnit[] = ["mg", "g", "kg"];
export const BASE_UNIT_OPTIONS: WeightUnit[] = ["g", "kg"];
export const TOTAL_UNIT_OPTIONS: WeightUnit[] = ["kg", "ton"];

export const UNIT_LABELS: Record<ContentUnit | WeightUnit, string> = {
  mg: "mg",
  g: "g",
  kg: "kg",
  ton: "ton",
};

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  amountUnit: ContentUnit;
  purity: string;
}

export interface RecipeSettings {
  baseAmount: string;
  baseUnit: WeightUnit;
  totalAmount: string;
  totalUnit: WeightUnit;
}

export interface IngredientResult {
  id: string;
  name: string;
  amountKg: number;
  sharePercent: number;
}

export function createIngredient(): Ingredient {
  return {
    id: crypto.randomUUID(),
    name: "",
    amount: "",
    amountUnit: "mg",
    purity: "",
  };
}

export function parseNumber(input: string): number {
  const n = parseFloat(input.trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function toMilligrams(value: number, unit: ContentUnit): number {
  switch (unit) {
    case "mg":
      return value;
    case "g":
      return value * 1000;
    case "kg":
      return value * 1_000_000;
  }
}

export function toKilograms(value: number, unit: WeightUnit): number {
  switch (unit) {
    case "g":
      return value / 1000;
    case "kg":
      return value;
    case "ton":
      return value * 1000;
  }
}

// Hammadde miktarı (kg) = (mg / (saflık/100)) * (toplamKg / bazKg) / 1.000.000
export function calculateIngredientKg(
  ingredient: Ingredient,
  settings: RecipeSettings
): number {
  const baseKg = toKilograms(parseNumber(settings.baseAmount), settings.baseUnit);
  const totalKg = toKilograms(parseNumber(settings.totalAmount), settings.totalUnit);
  const mg = toMilligrams(parseNumber(ingredient.amount), ingredient.amountUnit);
  const purity = parseNumber(ingredient.purity);
  if (baseKg <= 0 || purity <= 0 || totalKg <= 0) return 0;
  return ((mg / (purity / 100)) * (totalKg / baseKg)) / 1_000_000;
}

export interface RecipeTotals {
  totalKg: number;
  results: IngredientResult[];
  toplamHammadde: number;
  tasiyici: number;
}

export function calculateRecipe(
  ingredients: Ingredient[],
  settings: RecipeSettings
): RecipeTotals {
  const totalKg = toKilograms(parseNumber(settings.totalAmount), settings.totalUnit);
  const results: IngredientResult[] = ingredients.map((ing) => {
    const amountKg = calculateIngredientKg(ing, settings);
    return {
      id: ing.id,
      name: ing.name.trim() || "İsimsiz Madde",
      amountKg,
      sharePercent: totalKg > 0 ? (amountKg / totalKg) * 100 : 0,
    };
  });
  const toplamHammadde = results.reduce((sum, r) => sum + r.amountKg, 0);
  const tasiyici = totalKg - toplamHammadde;
  return { totalKg, results, toplamHammadde, tasiyici };
}

export function formatNumber(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
