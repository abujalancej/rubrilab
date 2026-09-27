import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "RubriLab", template: "%s · RubriLab" },
  description: "A local app for organising laboratory sessions, student groups and assessment evidence while teaching.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/rubrilab-icon-transparent.png", sizes: "1254x1254", type: "image/png" }],
    shortcut: "/rubrilab-icon-transparent.png",
    apple: "/rubrilab-icon-transparent.png",
  },
  openGraph: {
    title: "RubriLab",
    description: "Laboratory sessions, groups and assessment evidence — all while teaching.",
  },
  twitter: {
    card: "summary",
    title: "RubriLab",
    description: "Laboratory sessions, groups and assessment evidence — all while teaching.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={geistSans.variable + " " + geistMono.variable}>{children}</body>
    </html>
  );
}
