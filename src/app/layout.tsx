import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { ptBR } from "@/lib/i18n/pt-BR";
import "./globals.css";

// As fontes vêm do pacote "geist", dentro do projeto. Assim o build e o
// funcionamento não dependem de baixar nada do Google.
export const metadata: Metadata = {
  title: { default: ptBR.app.nome, template: `%s | ${ptBR.app.nome}` },
  description: ptBR.app.descricao,
};

// Cor da barra do app instalado e da barra do navegador no celular (verde-musgo).
export const viewport: Viewport = { themeColor: "#3a4729" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
