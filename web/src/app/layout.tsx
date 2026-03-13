import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#05080f", /* muss mit --game-bg in globals.css übereinstimmen */
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
        {children}
      </body>
    </html>
  );
}
