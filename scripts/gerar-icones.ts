import { mkdirSync } from "node:fs";
import sharp from "sharp";

// Gera os ícones PNG do app instalável (PWA) a partir do desenho de
// src/app/icon.svg (quadrado verde-musgo com círculo roxo).
// Rode de novo se o ícone mudar:  npx tsx scripts/gerar-icones.ts
//
// - "any": cantos arredondados, como o ícone do navegador.
// - "maskable": fundo cheio até a borda e o círculo dentro da área segura
//   (80% do centro), porque o Android recorta o ícone em formatos diferentes.

const MUSGO = "#3a4729";
const ROXO = "#8765e8";

function svgComum(lado: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="${MUSGO}"/>
  <circle cx="16" cy="16" r="7" fill="${ROXO}"/>
</svg>`;
}

function svgMascaravel(lado: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${MUSGO}"/>
  <circle cx="16" cy="16" r="6" fill="${ROXO}"/>
</svg>`;
}

async function gerar(svg: string, arquivo: string): Promise<void> {
  await sharp(Buffer.from(svg)).png().toFile(arquivo);
  console.log(`Gerado ${arquivo}`);
}

async function main(): Promise<void> {
  mkdirSync("public/icones", { recursive: true });
  await gerar(svgComum(192), "public/icones/icone-192.png");
  await gerar(svgComum(512), "public/icones/icone-512.png");
  await gerar(svgMascaravel(512), "public/icones/icone-mascaravel-512.png");
  // Ícone da tela inicial do iPhone (o iOS arredonda sozinho).
  await gerar(svgMascaravel(180), "src/app/apple-icon.png");
}

main().catch((erro: unknown) => {
  console.error("Falha ao gerar os ícones:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
