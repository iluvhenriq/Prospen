import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ptBR } from "@/lib/i18n/pt-BR";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

// A fonte (Schibsted Grotesk) vem do pacote @fontsource-variable, dentro do
// projeto. Assim o build e o funcionamento não dependem de baixar nada do Google.
const schibsted = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-italic.woff2",
      style: "italic",
    },
  ],
  weight: "400 900",
  variable: "--font-schibsted",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: ptBR.app.nome, template: `%s | ${ptBR.app.nome}` },
  description: ptBR.app.descricao,
};

// Cor da barra do app instalado e da barra do navegador no celular (verde-musgo).
export const viewport: Viewport = { themeColor: "#3a4729" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // O script do tema muda atributos do <html> antes de o React carregar:
    // por isso o aviso de diferença entre servidor e navegador fica desligado aqui.
    <html lang="pt-BR" className={`${schibsted.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
