import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import type { Banco } from "@/db/tipos";
import * as schema from "@/db/schema";
import { garantirConfiguracao } from "@/modules/organizacoes/configuracao";

export const TAMANHO_MINIMO_SENHA = 8;
export const TAMANHO_MAXIMO_SENHA = 128;

type Opcoes = {
  secret: string;
  baseURL: string;
  // Falso apenas nos testes, que rodam fora de uma requisição do Next.js.
  cookiesDoNext?: boolean;
};

// Configuração do login. Fica separada de src/lib/auth.ts para os testes
// poderem criar um login ligado ao banco de teste.
export function criarAuth(db: Banco, { secret, baseURL, cookiesDoNext = true }: Opcoes) {
  return betterAuth({
    secret,
    baseURL,
    // Sem envio de dados de uso para fora.
    telemetry: { enabled: false },
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: TAMANHO_MINIMO_SENHA,
      maxPasswordLength: TAMANHO_MAXIMO_SENHA,
      // Ligar quando houver provedor de e-mail configurado (veja docs/arquitetura.md).
      requireEmailVerification: false,
    },
    plugins: [
      organization({
        // Cada pessoa tem uma empresa por enquanto. A regra vale também para
        // quem chamar a API direto, não só para as telas.
        organizationLimit: 1,
        creatorRole: "owner",
        organizationHooks: {
          // Toda empresa nasce com a configuração regional padrão (Brasil).
          // Este arquivo é onde o login se liga ao restante do produto.
          afterCreateOrganization: async ({ organization }) => {
            await garantirConfiguracao(db, organization.id);
          },
        },
      }),
      // Precisa ser o último: grava os cookies de login nas ações do servidor.
      ...(cookiesDoNext ? [nextCookies()] : []),
    ],
  });
}

export type Auth = ReturnType<typeof criarAuth>;
