import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COFRE | Painel",
  description: "Controle Oficial de Finanças e Recursos da Educação",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
