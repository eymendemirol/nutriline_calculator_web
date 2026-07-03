import type { ChangeEvent } from "react";

// Kullanıcının gördüğü biçimlendirilmiş metinden (örn. "120.000,5") yalnızca
// hesaplamalarda kullanılan ham değeri (örn. "120000,5") çıkarır.
export function stripFormatting(display: string): string {
  let s = display.replace(/\./g, "");
  s = s.replace(/[^0-9,]/g, "");
  const firstComma = s.indexOf(",");
  if (firstComma !== -1) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, "");
  }
  return s;
}

// Ham değere ("120000,5") binlik ayraç noktaları ekler ("120.000,5").
export function formatThousands(raw: string): string {
  if (!raw) return "";
  const [intPart, decPart] = raw.split(",");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;
}

function countRawChars(s: string): number {
  return (s.match(/[0-9,]/g) || []).length;
}

function findCursorPos(display: string, rawCount: number): number {
  if (rawCount <= 0) return 0;
  let count = 0;
  for (let i = 0; i < display.length; i++) {
    if (/[0-9,]/.test(display[i])) {
      count++;
      if (count === rawCount) return i + 1;
    }
  }
  return display.length;
}

// Sayı giriş kutularında yazarken imleci koruyarak binlik ayracı ekler/kaldırır.
export function handleFormattedNumberChange(
  e: ChangeEvent<HTMLInputElement>,
  onRawChange: (raw: string) => void
) {
  const input = e.target;
  const cursorPos = input.selectionStart ?? input.value.length;
  const rawBeforeCursorCount = countRawChars(input.value.slice(0, cursorPos));
  const newRaw = stripFormatting(input.value);
  const newDisplay = formatThousands(newRaw);
  const newCursorPos = findCursorPos(newDisplay, rawBeforeCursorCount);

  input.value = newDisplay;
  input.setSelectionRange(newCursorPos, newCursorPos);

  onRawChange(newRaw);
}
