import type { NextConfig } from "next";

// Cabeçalhos de segurança em todas as respostas (28/10/2026):
// - ninguém coloca o PROSPEN dentro de outro site (golpe do clique escondido);
// - formulários só enviam para o próprio site, sem plug-ins nem <base> trocado;
// - o navegador não "adivinha" tipo de arquivo;
// - links para fora levam só o endereço do site, nunca o caminho (os links de
//   confirmação e de senha nova têm o token no endereço);
// - câmera, microfone, localização e pagamento pelo navegador ficam desligados;
// - depois da primeira visita por https, o navegador só usa https.
export const CABECALHOS_DE_SEGURANCA = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Não anuncia "Next.js" em cada resposta.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS_DE_SEGURANCA }];
  },
  partialPrefetching: true,
  logging: {
    // Em desenvolvimento, o Next.js escreve no terminal os argumentos de cada ação
    // do servidor, e eles trazem nome, e-mail e telefone de leads. Desligado para
    // não deixar dados pessoais no terminal (regra 7 do CLAUDE.md).
    serverFunctions: false,
  },
  experimental: {
    serverActions: {
      // A importação de planilha envia o arquivo por uma ação do servidor. O limite
      // do arquivo é 2 MB (veja LIMITE_BYTES em src/modules/leads/csv.ts) e esta folga
      // cobre o acréscimo do envio. Vale para todas as ações, então não aumente à toa.
      bodySizeLimit: "3mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
