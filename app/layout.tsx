import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caro's Route Planner",
  description: "Planeje a ordem ideal dos seus destinos para o trajeto mais eficiente",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
