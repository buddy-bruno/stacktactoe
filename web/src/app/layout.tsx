import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import { DevSuppressLockAbortError } from "@/components/DevSuppressLockAbortError";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#05080f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", /* iOS: Safe-Area nutzen, app-ähnlich bei „Zum Home-Bildschirm“ */
};

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Stack Tac Toe",
  description: "Taktisches Browser-Strategiespiel — 10 Runden, Stapel- und Schlagmechanik. Gegen KI oder Multiplayer, Classic, Puzzle, Blitz.",
  openGraph: {
    title: "Stack Tac Toe",
    description: "Taktisches Browser-Strategiespiel — 10 Runden, Stapel- und Schlagmechanik.",
    locale: "de_DE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${orbitron.variable} ${rajdhani.variable} antialiased font-sans`}>
        <DevSuppressLockAbortError />
        {children}
      </body>
    </html>
  );
}
