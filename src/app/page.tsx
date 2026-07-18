"use client";

import { useMemo, useState } from "react";
import {
  BASE_UNIT_OPTIONS,
  CONTENT_UNIT_OPTIONS,
  ContentUnit,
  Ingredient,
  RecipeSettings,
  TOTAL_UNIT_OPTIONS,
  UNIT_LABELS,
  WeightUnit,
  calculateRecipe,
  createIngredient,
  formatIngredientAmount,
  formatNumber,
  getCarrierLabel,
  isPotencyUnit,
} from "@/lib/calc";
import { downloadRecipeCsv } from "@/lib/csv";
import { formatThousands, handleFormattedNumberChange } from "@/lib/format";
import { shareOrDownloadPdf } from "@/lib/pdf";

const numericInputClass =
  "w-full rounded-l-lg border border-r-0 border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";
const unitSelectClass =
  "rounded-r-lg border border-zinc-300 bg-zinc-50 px-2 py-2 text-sm text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500";
const fieldLabelClass = "mb-1 block text-sm font-medium text-zinc-700";

export default function Home() {
  const [recipeName, setRecipeName] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [settings, setSettings] = useState<RecipeSettings>({
    baseAmount: "2",
    baseUnit: "kg",
    totalAmount: "1000",
    totalUnit: "kg",
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const { results, toplamHammadde, tasiyici, totalKg } = useMemo(
    () => calculateRecipe(ingredients, settings),
    [ingredients, settings]
  );

  const tasiyiciNegatif = totalKg > 0 && tasiyici < 0;

  function addIngredient() {
    setIngredients((prev) => [...prev, createIngredient()]);
  }

  function removeIngredient(id: string) {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
  }

  function updateIngredient(id: string, patch: Partial<Ingredient>) {
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, ...patch } : ing))
    );
  }

  async function handleShare() {
    setShareError(null);
    setSharing(true);
    try {
      await shareOrDownloadPdf(ingredients, settings, recipeName, carrierName);
    } catch {
      setShareError("Rapor oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSharing(false);
    }
  }

  function handleCsvExport() {
    setShareError(null);
    try {
      downloadRecipeCsv(ingredients, settings, recipeName, carrierName);
    } catch {
      setShareError("CSV dosyası oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.");
    }
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="Nutriline logo"
            className="h-12 w-12 rounded-full object-cover"
          />
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              Nutriline Reçete Hesaplayıcı
            </h1>
            <p className="text-sm text-zinc-500">
              Premiks reçetelerindeki hammadde ve taşıyıcı miktarlarını hesaplayın.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <label className={fieldLabelClass}>Reçete Adı</label>
          <input
            type="text"
            placeholder="Örn: Broiler Başlangıç Yemi Premiksi"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Bu isim PDF raporunun başlığında ve dosya adında kullanılır.
          </p>
        </section>

        <SettingsCard
          settings={settings}
          onChange={setSettings}
          carrierName={carrierName}
          onCarrierNameChange={setCarrierName}
        />

        <IngredientsCard
          ingredients={ingredients}
          onAdd={addIngredient}
          onRemove={removeIngredient}
          onChange={updateIngredient}
        />

        {ingredients.length > 0 && (
          <>
            <ReportCard
              ingredients={ingredients}
              results={results}
              tasiyici={tasiyici}
              totalKg={totalKg}
              carrierLabel={getCarrierLabel(carrierName)}
              onShare={handleShare}
              sharing={sharing}
              shareError={shareError}
              onCsvExport={handleCsvExport}
            />
            <SummaryCard
              toplamHammadde={toplamHammadde}
              tasiyici={tasiyici}
              totalKg={totalKg}
              tasiyiciNegatif={tasiyiciNegatif}
              carrierLabel={getCarrierLabel(carrierName)}
            />
          </>
        )}
      </main>
    </div>
  );
}

function SettingsCard({
  settings,
  onChange,
  carrierName,
  onCarrierNameChange,
}: {
  settings: RecipeSettings;
  onChange: (s: RecipeSettings) => void;
  carrierName: string;
  onCarrierNameChange: (name: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-zinc-900">Reçete Ayarları</h2>
      <p className="mb-4 text-sm text-zinc-500">
        Etken madde değerlerinin hangi miktar için geçerli olduğunu ve toplam ne kadar
        üretim yapılacağını belirtin.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={fieldLabelClass}>Referans Miktar</label>
          <div className="flex">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Örn: 2"
              value={formatThousands(settings.baseAmount)}
              onChange={(e) =>
                handleFormattedNumberChange(e, (raw) =>
                  onChange({ ...settings, baseAmount: raw })
                )
              }
              className={numericInputClass}
            />
            <select
              value={settings.baseUnit}
              onChange={(e) =>
                onChange({ ...settings, baseUnit: e.target.value as WeightUnit })
              }
              className={unitSelectClass}
            >
              {BASE_UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Etiketteki içerik değerleri &quot;her 2 kg&quot;da veriliyorsa buraya 2 kg
            girin.
          </p>
        </div>
        <div>
          <label className={fieldLabelClass}>Toplam Üretim Miktarı</label>
          <div className="flex">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Örn: 1.000"
              value={formatThousands(settings.totalAmount)}
              onChange={(e) =>
                handleFormattedNumberChange(e, (raw) =>
                  onChange({ ...settings, totalAmount: raw })
                )
              }
              className={numericInputClass}
            />
            <select
              value={settings.totalUnit}
              onChange={(e) =>
                onChange({ ...settings, totalUnit: e.target.value as WeightUnit })
              }
              className={unitSelectClass}
            >
              {TOTAL_UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-zinc-400">Reçetenin toplam üretim miktarı.</p>
            <button
              type="button"
              onClick={() => onChange({ ...settings, totalAmount: "1", totalUnit: "ton" })}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              1 Ton olarak ayarla
            </button>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <label className={fieldLabelClass}>Taşıyıcı Madde Adı (opsiyonel)</label>
        <input
          type="text"
          placeholder="Örn: Mısır Unu, Kepek..."
          value={carrierName}
          onChange={(e) => onCarrierNameChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <p className="mt-1 text-xs text-zinc-400">
          Boş bırakılırsa raporda ve PDF&apos;te sadece &quot;Taşıyıcı&quot; yazılır;
          doldurursanız &quot;Taşıyıcı({carrierName.trim() || "..."})&quot; şeklinde
          gösterilir.
        </p>
      </div>
    </section>
  );
}

function IngredientsCard({
  ingredients,
  onAdd,
  onRemove,
  onChange,
}: {
  ingredients: Ingredient[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<Ingredient>) => void;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900">Etken Maddeler</h2>
        <button
          type="button"
          onClick={onAdd}
          className="w-full shrink-0 rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 sm:w-auto"
        >
          + Etken Madde Ekle
        </button>
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Reçeteye eklemek istediğiniz her etken madde için içerik miktarını ve
        kullanılacak hammaddenin saflık oranını girin.
      </p>

      {ingredients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-400">
          Henüz etken madde eklenmedi. Başlamak için &quot;+ Etken Madde Ekle&quot;
          butonuna tıklayın.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ingredients.map((ing, index) => (
            <IngredientRow
              key={ing.id}
              index={index}
              ingredient={ing}
              onRemove={() => onRemove(ing.id)}
              onChange={(patch) => onChange(ing.id, patch)}
            />
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="w-full rounded-lg border border-dashed border-teal-700 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
          >
            + Etken Madde Ekle
          </button>
        </div>
      )}
    </section>
  );
}

function IngredientRow({
  index,
  ingredient,
  onRemove,
  onChange,
}: {
  index: number;
  ingredient: Ingredient;
  onRemove: () => void;
  onChange: (patch: Partial<Ingredient>) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white">
          {index + 1}
        </span>
        <input
          type="text"
          placeholder="Etken madde adı (Örn: Çinko)"
          value={ingredient.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Etken maddeyi sil"
          className="shrink-0 rounded-lg border border-red-200 px-2.5 py-2 text-red-500 hover:bg-red-50"
        >
          Sil
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={fieldLabelClass}>İçerik Miktarı</label>
          <div className="flex">
            <input
              type="text"
              inputMode="decimal"
              placeholder={
                isPotencyUnit(ingredient.amountUnit) ? "Örn: 7.200.000" : "Örn: 110.000"
              }
              value={formatThousands(ingredient.amount)}
              onChange={(e) =>
                handleFormattedNumberChange(e, (raw) => onChange({ amount: raw }))
              }
              className={numericInputClass}
            />
            <select
              value={ingredient.amountUnit}
              onChange={(e) => onChange({ amountUnit: e.target.value as ContentUnit })}
              className={unitSelectClass}
            >
              {CONTENT_UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={fieldLabelClass}>
            {isPotencyUnit(ingredient.amountUnit) ? "Hammadde Potensi" : "Hammadde Saflığı"}
          </label>
          <div className="flex">
            <input
              type="text"
              inputMode="decimal"
              placeholder={isPotencyUnit(ingredient.amountUnit) ? "Örn: 1.000.000" : "Örn: 60"}
              value={formatThousands(ingredient.purity)}
              onChange={(e) =>
                handleFormattedNumberChange(e, (raw) => onChange({ purity: raw }))
              }
              className={numericInputClass}
            />
            <span className={unitSelectClass}>
              {isPotencyUnit(ingredient.amountUnit) ? "I.U./g" : "%"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({
  ingredients,
  results,
  tasiyici,
  totalKg,
  carrierLabel,
  onShare,
  sharing,
  shareError,
  onCsvExport,
}: {
  ingredients: Ingredient[];
  results: ReturnType<typeof calculateRecipe>["results"];
  tasiyici: number;
  totalKg: number;
  carrierLabel: string;
  onShare: () => void;
  sharing: boolean;
  shareError: string | null;
  onCsvExport: () => void;
}) {
  const carrierSharePercent = totalKg > 0 ? (tasiyici / totalKg) * 100 : 0;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900">Reçete Raporu</h2>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={onCsvExport}
            className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto"
          >
            SCADA İçin CSV Dışa Aktar
          </button>
          <button
            type="button"
            onClick={onShare}
            disabled={sharing}
            className="w-full rounded-lg border border-teal-700 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50 sm:w-auto"
          >
            {sharing ? "Hazırlanıyor..." : "PDF Olarak İndir / Paylaş"}
          </button>
        </div>
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Girilen tüm etken maddelere göre hesaplanan hammadde miktarları. CSV çıktısı,
        yem tartım/dozaj sistemlerinde yaygın kullanılan reçete formatına uygun
        hazırlanmıştır; SCADA programınıza içe aktarırken sütun eşleştirmesini
        kontrol edin.
      </p>
      {shareError && (
        <p className="mb-3 text-sm text-red-600">{shareError}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="py-2 pr-3 font-medium">Etken Madde</th>
              <th className="py-2 pr-3 font-medium">Girilen İçerik</th>
              <th className="py-2 pr-3 font-medium">Saflık</th>
              <th className="py-2 pr-3 font-medium text-right">Hammadde Miktarı</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const ing = ingredients[i];
              const potency = isPotencyUnit(ing.amountUnit);
              return (
                <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 pr-3 text-zinc-800">{r.name}</td>
                  <td className="py-2 pr-3 text-zinc-600">
                    {formatThousands(ing.amount) || "0"} {UNIT_LABELS[ing.amountUnit]}
                  </td>
                  <td className="py-2 pr-3 text-zinc-600">
                    {potency
                      ? `${formatThousands(ing.purity) || "0"} I.U./g`
                      : `%${ing.purity || "0"}`}
                  </td>
                  <td className="py-2 pr-3 text-right font-medium text-zinc-900">
                    {formatIngredientAmount(r.amountKg, ing.amountUnit)}
                  </td>
                </tr>
              );
            })}
            <tr className="border-b border-zinc-100 last:border-0">
              <td className="py-2 pr-3 text-zinc-800">{carrierLabel}</td>
              <td className="py-2 pr-3 text-zinc-600">-</td>
              <td className="py-2 pr-3 text-zinc-600">-</td>
              <td className="py-2 pr-3 text-right font-medium text-zinc-900">
                {formatNumber(tasiyici)} kg
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-right text-xs text-zinc-400">
        {carrierLabel}: reçetenin %{formatNumber(carrierSharePercent, 2)}&apos;i
      </p>
    </section>
  );
}

function SummaryCard({
  toplamHammadde,
  tasiyici,
  totalKg,
  tasiyiciNegatif,
  carrierLabel,
}: {
  toplamHammadde: number;
  tasiyici: number;
  totalKg: number;
  tasiyiciNegatif: boolean;
  carrierLabel: string;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        tasiyiciNegatif ? "border-red-200 bg-red-50" : "border-teal-200 bg-teal-50"
      }`}
    >
      <h2 className="mb-3 text-base font-semibold text-zinc-900">Sonuç</h2>
      <div className="flex flex-col gap-2 text-sm">
        <Row label="Toplam Hammadde" value={`${formatNumber(toplamHammadde)} kg`} />
        <Row
          label={carrierLabel}
          value={`${formatNumber(tasiyici)} kg`}
          valueClassName={tasiyiciNegatif ? "text-red-600" : undefined}
        />
        <Row label="Toplam Üretim" value={`${formatNumber(totalKg)} kg`} />
      </div>
      {tasiyiciNegatif && (
        <p className="mt-3 text-sm text-red-600">
          Uyarı: Hammadde toplamı, toplam üretim miktarını aşıyor. Referans miktarı,
          saflık değerlerini veya toplam üretimi kontrol edin.
        </p>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="min-w-0 break-words text-zinc-600">{label}</span>
      <span
        className={`shrink-0 font-semibold text-zinc-900 ${valueClassName ?? ""}`}
      >
        {value}
      </span>
    </div>
  );
}
