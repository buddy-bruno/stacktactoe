import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import { DevSuppressLockAbortError } from "@/components/DevSuppressLockAbortError";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#05080f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", /* iOS: Safe-Area, app-ähnlich */
  interactiveWidget: "resizes-content", /* Android (Xiaomi/Redmi, Chrome): Viewport bei Tastatur */
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
  applicationName: "Stack Tac Toe", /* Android/Xiaomi/Redmi: „Zum Startbildschirm hinzufügen“ */
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png", /* iOS: „Zum Home-Bildschirm“ – 180×180 */
  },
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
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
