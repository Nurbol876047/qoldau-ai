import type { Metadata } from "next";
import { Outfit, Inter, Nunito } from "next/font/google";
import "./globals.css";
import React from "react";

const fontOutfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fontInter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

// Display / heading font — supports Cyrillic (Kazakh) and has a friendly, chunky look
const fontDisplay = Nunito({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "QOLDAU AI | Интеллектуальный логопед",
  description: "Инновационная игровая платформа для развития речи у детей.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${fontOutfit.variable} ${fontInter.variable} ${fontDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
