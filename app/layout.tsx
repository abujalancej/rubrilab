import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "RubriLab", template: "%s · RubriLab" },
  description: "Professional, offline-first evidence capture for secondary-school practical laboratories.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "RubriLab",
    description: "Practical evidence, captured while teaching.",
    images: ["https://rubrilab-laboratory.escolagrancapita.chatgpt.site/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "RubriLab",
    description: "Practical evidence, captured while teaching.",
    images: ["https://rubrilab-laboratory.escolagrancapita.chatgpt.site/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={geistSans.variable + " " + geistMono.variable}>{children}</body>
    </html>
  );
}
