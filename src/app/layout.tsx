import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Nutriline Reçete Hesaplayıcı";
const description =
  "Nutriline Yem ve Besin Katkıları için premiks reçete hesaplama uygulaması.";

export const metadata: Metadata = {
  metadataBase: new URL("https://nutriline-calculator-web.vercel.app"),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: title,
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
