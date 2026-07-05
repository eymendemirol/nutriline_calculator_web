import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Ingredient,
  RecipeSettings,
  UNIT_LABELS,
  calculateRecipe,
  formatNumber,
  getCarrierLabel,
} from "./calc";
import { formatThousands } from "./format";

async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return dataUrl.split(",")[1];
}

async function loadRobotoFont(doc: jsPDF): Promise<boolean> {
  try {
    const [regular, bold] = await Promise.all([
      fetch("/fonts/Roboto-Regular.ttf").then((r) => r.blob()),
      fetch("/fonts/Roboto-Bold.ttf").then((r) => r.blob()),
    ]);
    const [regularBase64, boldBase64] = await Promise.all([
      blobToBase64(regular),
      blobToBase64(bold),
    ]);
    doc.addFileToVFS("Roboto-Regular.ttf", regularBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", boldBase64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    doc.setFont("Roboto", "normal");
    return true;
  } catch {
    // Font yüklenemezse Türkçe karakterler bozuk görünebilir ama rapor yine de oluşur.
    return false;
  }
}

const TURKISH_TO_ASCII: Record<string, string> = {
  ç: "c",
  Ç: "C",
  ğ: "g",
  Ğ: "G",
  ı: "i",
  İ: "I",
  ö: "o",
  Ö: "O",
  ş: "s",
  Ş: "S",
  ü: "u",
  Ü: "U",
};

// Dosya adları bazı paylaşım kanallarında (ör. WhatsApp) Türkçe karaktererle
// sorun çıkarabildiğinden, dosya adını ASCII'ye çeviriyoruz. PDF içeriğindeki
// Türkçe metinler bundan etkilenmez, olduğu gibi kalır.
export function sanitizeFilename(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "nutriline-recete-raporu";
  const ascii = trimmed.replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TURKISH_TO_ASCII[ch] ?? ch);
  return ascii
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function buildRecipePdf(
  ingredients: Ingredient[],
  settings: RecipeSettings,
  recipeName: string,
  carrierName: string
): Promise<Blob> {
  const { results, toplamHammadde, tasiyici, totalKg } = calculateRecipe(
    ingredients,
    settings
  );

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const hasRoboto = await loadRobotoFont(doc);
  const fontFamily = hasRoboto ? "Roboto" : "helvetica";
  const setFont = (weight: "normal" | "bold") => doc.setFont(fontFamily, weight);

  try {
    const logoBlob = await fetch("/logo.jpg").then((r) => r.blob());
    const logoBase64 = await blobToBase64(logoBlob);
    doc.addImage(`data:image/jpeg;base64,${logoBase64}`, "JPEG", 14, 10, 16, 16);
  } catch {
    // Logo yüklenemezse rapor logosuz oluşturulur.
  }

  setFont("bold");
  doc.setFontSize(13);
  doc.text("Nutriline Yem ve Besin Katkıları San. ve Tic. Ltd. Şti.", 34, 16);
  doc.setFontSize(11);
  doc.text(recipeName.trim() ? recipeName.trim() : "Reçete Raporu", 34, 22);
  setFont("normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110);
  doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleString("tr-TR")}`, 34, 27);
  doc.setTextColor(0);

  doc.setDrawColor(200);
  doc.line(14, 32, pageWidth - 14, 32);

  doc.setFontSize(10);
  doc.text(
    `Referans Miktar: ${formatThousands(settings.baseAmount) || "0"} ${UNIT_LABELS[settings.baseUnit]}`,
    14,
    40
  );
  doc.text(
    `Toplam Üretim Miktarı: ${formatThousands(settings.totalAmount) || "0"} ${UNIT_LABELS[settings.totalUnit]}  (${formatNumber(totalKg)} kg)`,
    14,
    46
  );

  autoTable(doc, {
    startY: 52,
    head: [
      [
        "#",
        "Etken Madde",
        "Girilen İçerik",
        "Hammadde Saflığı",
        "Hammadde Miktarı (kg)",
        "Reçetedeki Oranı",
      ],
    ],
    body: [
      ...results.map((r, i) => {
        const ing = ingredients[i];
        return [
          String(i + 1),
          r.name,
          `${formatThousands(ing.amount) || "0"} ${UNIT_LABELS[ing.amountUnit]}`,
          `%${ing.purity || "0"}`,
          formatNumber(r.amountKg),
          `%${formatNumber(r.sharePercent, 2)}`,
        ];
      }),
      [
        String(results.length + 1),
        getCarrierLabel(carrierName),
        "-",
        "-",
        formatNumber(tasiyici),
        `%${formatNumber(totalKg > 0 ? (tasiyici / totalKg) * 100 : 0, 2)}`,
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3, font: fontFamily },
    headStyles: { fillColor: [13, 116, 108], textColor: 255, font: fontFamily, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [242, 247, 246] },
  });

  const afterTableY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 10;

  doc.setDrawColor(200);
  doc.line(14, afterTableY - 5, pageWidth - 14, afterTableY - 5);

  setFont("normal");
  doc.setFontSize(11);
  doc.text(`Toplam Hammadde Miktarı: ${formatNumber(toplamHammadde)} kg`, 14, afterTableY + 2);
  doc.text(
    `Taşıyıcı (Dolgu) Miktarı: ${formatNumber(tasiyici)} kg`,
    14,
    afterTableY + 9
  );
  setFont("bold");
  doc.text(`Toplam Üretim: ${formatNumber(totalKg)} kg`, 14, afterTableY + 16);
  setFont("normal");

  if (tasiyici < 0) {
    doc.setTextColor(200, 40, 40);
    doc.setFontSize(9);
    doc.text(
      "Uyarı: Hammadde toplamı, toplam üretim miktarını aşıyor.",
      14,
      afterTableY + 24
    );
    doc.setTextColor(0);
  }

  return doc.output("blob");
}

// Windows'ta tarayıcıların yerleşik paylaşım menüsü, dosyaları geçici bir
// konuma kopyalarken bazı uygulamalara (ör. Outlook) "dosya boş" hatası ile
// aktarabiliyor. Bu yüzden paylaşım sayfası sadece mobil cihazlarda (WhatsApp
// vb. paylaşım için) deneniyor; masaüstünde doğrudan indirme yapılıyor.
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } })
    .userAgentData;
  if (uaData && typeof uaData.mobile === "boolean") return uaData.mobile;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export async function shareOrDownloadPdf(
  ingredients: Ingredient[],
  settings: RecipeSettings,
  recipeName: string,
  carrierName: string
): Promise<void> {
  const blob = await buildRecipePdf(ingredients, settings, recipeName, carrierName);
  const filename = `${sanitizeFilename(recipeName)}.pdf`;
  const file = new File([blob], filename, { type: "application/pdf" });

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (isMobileDevice() && nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: recipeName.trim() || "Nutriline Reçete Raporu",
      });
      return;
    } catch {
      // Kullanıcı paylaşımı iptal etti veya paylaşım başarısız oldu, indirmeye devam et.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
