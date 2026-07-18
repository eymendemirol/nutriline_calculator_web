export type ContentUnit = "mcg" | "mg" | "g" | "kg" | "IU";
export type WeightUnit = "g" | "kg" | "ton";

export const CONTENT_UNIT_OPTIONS: ContentUnit[] = ["mcg", "mg", "g", "kg", "IU"];
export const BASE_UNIT_OPTIONS: WeightUnit[] = ["g", "kg"];
export const TOTAL_UNIT_OPTIONS: WeightUnit[] = ["kg", "ton"];

export const UNIT_LABELS: Record<ContentUnit | WeightUnit, string> = {
  mcg: "mcg",
  mg: "mg",
  g: "g",
  kg: "kg",
  IU: "I.U.",
  ton: "ton",
};

// Vitaminler gibi I.U. (Uluslararası Ünite) ile ölçülen etken maddelerde
// hammadde saflığı yüzde yerine "I.U./g" potens olarak verilir; mg tabanlı
// yüzde formülü bu durumda geçerli değildir.
export function isPotencyUnit(unit: ContentUnit): boolean {
  return unit === "IU";
}

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

export function toMilligrams(value: number, unit: Exclude<ContentUnit, "IU">): number {
  switch (unit) {
    case "mcg":
      return value / 1000;
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

// Yüzde saflık modu (mg/g/kg): hammadde (kg) = (mg / (saflık/100)) * (toplamKg / bazKg) / 1.000.000
// Potens modu (I.U.): hammadde (kg) = ((I.U. / (I.U./g potens)) * (toplamKg / bazKg)) / 1.000 (g -> kg)
export function calculateIngredientKg(
  ingredient: Ingredient,
  settings: RecipeSettings
): number {
  const baseKg = toKilograms(parseNumber(settings.baseAmount), settings.baseUnit);
  const totalKg = toKilograms(parseNumber(settings.totalAmount), settings.totalUnit);
  const purity = parseNumber(ingredient.purity);
  if (baseKg <= 0 || purity <= 0 || totalKg <= 0) return 0;

  if (isPotencyUnit(ingredient.amountUnit)) {
    const iu = parseNumber(ingredient.amount);
    const grams = (iu / purity) * (totalKg / baseKg);
    return grams / 1000;
  }

  const mg = toMilligrams(
    parseNumber(ingredient.amount),
    ingredient.amountUnit as Exclude<ContentUnit, "IU">
  );
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

// Taşıyıcı madde adı boşsa "Taşıyıcı", doluysa "Taşıyıcı(Mısır Unu)" gibi yazılır.
export function getCarrierLabel(carrierName: string): string {
  const trimmed = carrierName.trim();
  return trimmed ? `Taşıyıcı(${trimmed})` : "Taşıyıcı";
}

export function formatNumber(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatIngredientAmount(amountKg: number): string {
  return `${formatNumber(amountKg, 3)} kg`;
}
