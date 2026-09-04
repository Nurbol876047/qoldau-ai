import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import React from "react";

const fontOutfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "cyrillic"],
});

const fontInter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
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
      className={`${fontOutfit.variable} ${fontInter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
