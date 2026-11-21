import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Vanguard Tickets — 3D Spatial Seat & Sightline Engine",
  description: "Interactive 3D venue preview backed by Spring Boot Microservices",
};

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
      <html lang="en" className={`${instrumentSerif.variable} ${inter.variable} dark`}>
      <body className="bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500/30">
      {children}
      </body>
      </html>
  );
}