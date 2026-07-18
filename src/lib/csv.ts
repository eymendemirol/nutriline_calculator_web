import {
  Ingredient,
  RecipeSettings,
  calculateRecipe,
  formatNumber,
  getCarrierLabel,
} from "./calc";
import { sanitizeFilename } from "./pdf";

// Yem tartım/dozaj (SCADA) sistemlerinde reçete içe aktarma için yaygın kullanılan
// biçime uygun, noktalı virgülle ayrılmış CSV üretir: reçete başlığı + sıra no,
// malzeme adı, kg miktarı ve oran sütunları içeren bir tablo. Taşıyıcı da tartılacak
// bir malzeme olduğundan tabloya son satır olarak eklenir.
//
// Not: Bu format, SCADA yazılımının (Born Otomasyon) kesin import şablonuna göre
// doğrulanmadı — sektörde genel kabul gören yapıyı esas alır. Gerçek sistemde
// test edildikten sonra sütun adı/sırası gerekirse güncellenmelidir.
export function buildRecipeCsv(
  ingredients: Ingredient[],
  settings: RecipeSettings,
  recipeName: string,
  carrierName: string
): string {
  const { results, totalKg, toplamHammadde, tasiyici } = calculateRecipe(
    ingredients,
    settings
  );

  // Miktar sütunu her zaman kg cinsindendir (tek birim, makine tarafından
  // okunabilir olması için); vitamin gibi gram mertebesindeki küçük miktarların
  // yuvarlamayla kaybolmaması için 6 ondalık basamak kullanılır.
  const lines: string[] = [];
  lines.push(`Recete Adi;${recipeName.trim() || "Isimsiz Recete"}`);
  lines.push(`Toplam Uretim (kg);${formatNumber(totalKg)}`);
  lines.push("");
  lines.push("Sira No;Malzeme Adi;Miktar (kg);Oran (%)");

  results.forEach((r, i) => {
    lines.push(
      `${i + 1};${r.name};${formatNumber(r.amountKg, 6)};${formatNumber(r.sharePercent, 2)}`
    );
  });

  const tasiyiciSharePercent = totalKg > 0 ? (tasiyici / totalKg) * 100 : 0;
  lines.push(
    `${results.length + 1};${getCarrierLabel(carrierName)};${formatNumber(tasiyici, 6)};${formatNumber(tasiyiciSharePercent, 2)}`
  );

  lines.push("");
  lines.push(`Toplam Hammadde (kg);${formatNumber(toplamHammadde)}`);
  lines.push(`Toplam Uretim (kg);${formatNumber(totalKg)}`);

  return lines.join("\r\n");
}

export function downloadRecipeCsv(
  ingredients: Ingredient[],
  settings: RecipeSettings,
  recipeName: string,
  carrierName: string
): void {
  const csv = buildRecipeCsv(ingredients, settings, recipeName, carrierName);
  // Excel/Windows'ta Türkçe karakterlerin doğru görünmesi için UTF-8 BOM ekleniyor.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const filename = `${sanitizeFilename(recipeName)}.csv`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
