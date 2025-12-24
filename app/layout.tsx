import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ebook Factory",
  description: "Crie ebooks completos com qualidade editorial."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
