import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Le Grimoire",
  description:
    "Un restaurante privado para dos: recetario, cocina creativa, clientes ficticios, cartas y propinas imaginarias.",
  applicationName: "Le Grimoire",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Le Grimoire",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Le Grimoire",
    description: "Un pequeño universo culinario compartido.",
    images: ["/images/le-grimoire-kitchen.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
