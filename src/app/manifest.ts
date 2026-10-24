import type { MetadataRoute } from "next";
import { ptBR } from "@/lib/i18n/pt-BR";

// Manifesto do app instalável (PWA, decisão de 24/10/2026): com ele, o
// navegador oferece "Instalar PROSPEN" e o app abre em janela própria, com
// ícone. Sem modo offline: o PROSPEN precisa do servidor para tudo.
// No computador funciona até rodando local; no celular, só com HTTPS (depois
// de hospedado). Ícones gerados por scripts/gerar-icones.ts.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: ptBR.app.nome,
    short_name: ptBR.app.nome,
    description: ptBR.app.descricao,
    lang: "pt-BR",
    // Abre direto no painel; quem não entrou é levado à tela de entrada.
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf6",
    theme_color: "#3a4729",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-mascaravel-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
