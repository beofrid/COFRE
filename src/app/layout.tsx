import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COFRE | Controle Orçamentário e de Finanças de Recursos da Educação",
  description: "Acompanhamento de dotações e disponibilidade orçamentária",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
