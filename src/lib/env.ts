import { z } from "zod";

// Variáveis de ambiente, validadas em um único lugar.
// Valores secretos nunca aparecem nas mensagens de erro.
const esquemaBase = z.object({
  DATABASE_URL: z
    .string({ error: "é obrigatória" })
    .refine(
      (valor) => /^postgres(ql)?:\/\//.test(valor),
      "é obrigatória e deve começar com postgresql://",
    ),
  APP_URL: z.url("deve ser um endereço válido").default("http://localhost:3000"),
});

// O login exige um segredo. Fica separado para que os comandos do banco
// e a rota de saúde não dependam dele.
const esquemaLogin = esquemaBase.extend({
  AUTH_SECRET: z
    .string({ error: "é obrigatória" })
    .min(32, "deve ter pelo menos 32 caracteres. Veja como gerar no .env.example"),
});

export type Env = z.infer<typeof esquemaBase>;
export type EnvLogin = z.infer<typeof esquemaLogin>;

type Origem = Record<string, string | undefined>;

function validar<T extends z.ZodType>(esquema: T, origem: Origem): z.infer<T> {
  const resultado = esquema.safeParse(origem);
  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((problema) => `- ${problema.path.join(".")}: ${problema.message}`)
      .join("\n");
    throw new Error(
      `Configuração inválida. Confira o arquivo .env.local:\n${problemas}`,
    );
  }
  return resultado.data;
}

export function lerEnv(origem: Origem = process.env): Env {
  return validar(esquemaBase, origem);
}

export function lerEnvLogin(origem: Origem = process.env): EnvLogin {
  return validar(esquemaLogin, origem);
}
