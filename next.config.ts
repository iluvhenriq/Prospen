import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
