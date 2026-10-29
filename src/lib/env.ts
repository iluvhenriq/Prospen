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

// E-mail de confirmação e de nova senha, por SMTP (o Gmail serve, com uma
// "senha de app"). Opcional: sem SMTP_HOST, o link aparece no terminal do
// servidor e, se EMAIL_PASTA_LOCAL estiver definida, vira um arquivo nela
// (os testes de navegador leem de lá). Com a pasta definida, nada sai por
// SMTP, mesmo configurado: o servidor dos testes também lê o .env.local.
const esquemaEmail = z.object({
  SMTP_HOST: z.string().trim().optional(),
  // Linha vazia no .env.local vale como ausente (usa a 465).
  SMTP_PORTA: z.preprocess((valor) => (valor === "" ? undefined : valor), z.coerce.number().int().positive().default(465)),
  SMTP_USUARIO: z.string().trim().optional(),
  SMTP_SENHA: z.string().optional(),
  EMAIL_REMETENTE: z.string().trim().optional(),
  EMAIL_PASTA_LOCAL: z.string().trim().optional(),
});

export type ConfigEmail =
  | { tipo: "smtp"; host: string; porta: number; usuario: string; senha: string; remetente: string }
  | { tipo: "local"; pasta: string | null };

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

export function lerEnvEmail(origem: Origem = process.env): ConfigEmail {
  const env = validar(esquemaEmail, origem);
  if (env.EMAIL_PASTA_LOCAL) return { tipo: "local", pasta: env.EMAIL_PASTA_LOCAL };
  if (!env.SMTP_HOST) return { tipo: "local", pasta: null };
  if (!env.SMTP_USUARIO || !env.SMTP_SENHA) {
    throw new Error(
      "Configuração inválida. Confira o arquivo .env.local:\n- SMTP_USUARIO e SMTP_SENHA: são obrigatórias quando SMTP_HOST está preenchida",
    );
  }
  return {
    tipo: "smtp",
    host: env.SMTP_HOST,
    porta: env.SMTP_PORTA,
    usuario: env.SMTP_USUARIO,
    senha: env.SMTP_SENHA,
    remetente: env.EMAIL_REMETENTE || `PROSPEN <${env.SMTP_USUARIO}>`,
  };
}
