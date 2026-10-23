import { z } from "zod";
import {
  TAMANHO_MAXIMO_SENHA,
  TAMANHO_MINIMO_SENHA,
} from "@/lib/auth-config";

// Regras de validação dos formulários de conta. Rodam no servidor, sempre.
// As mensagens são o que a pessoa lê na tela.

const email = z
  .string({ error: "Informe seu e-mail." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido."))
  .pipe(z.string().max(254, "Este e-mail é longo demais."));

export const esquemaCadastro = z.object({
  nome: z
    .string({ error: "Informe seu nome." })
    .trim()
    .min(2, "Informe seu nome.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  email,
  senha: z
    .string({ error: "Informe uma senha." })
    .min(
      TAMANHO_MINIMO_SENHA,
      `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`,
    )
    .max(
      TAMANHO_MAXIMO_SENHA,
      `A senha pode ter no máximo ${TAMANHO_MAXIMO_SENHA} caracteres.`,
    ),
});

export const esquemaEntrada = z.object({
  email,
  // Na entrada não se avalia o tamanho: a conferência é feita contra a senha salva.
  senha: z.string({ error: "Informe sua senha." }).min(1, "Informe sua senha."),
});

export const esquemaOrganizacao = z.object({
  nome: z
    .string({ error: "Informe o nome da empresa." })
    .trim()
    .min(2, "Informe o nome da empresa.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
});

// Resultado que os formulários recebem de volta. Nunca inclui senhas.
export type EstadoFormulario = {
  mensagem?: string;
  erros?: Partial<Record<string, string>>;
  valores?: Partial<Record<string, string>>;
};

// Converte os problemas do Zod em um texto por campo (o primeiro de cada campo).
export function errosPorCampo(erro: z.ZodError): Partial<Record<string, string>> {
  const resultado: Partial<Record<string, string>> = {};
  for (const problema of erro.issues) {
    const campo = String(problema.path[0] ?? "");
    if (campo && !(campo in resultado)) resultado[campo] = problema.message;
  }
  return resultado;
}

// Cria o identificador curto da empresa na URL: "Barbearia Ação" vira "barbearia-acao-k3x9p2".
// O sufixo aleatório evita conflito entre empresas com o mesmo nome.
export function gerarSlug(nome: string, sufixo: string = sufixoAleatorio()): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return `${base || "empresa"}-${sufixo}`;
}

function sufixoAleatorio(): string {
  const alfabeto = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alfabeto[byte % alfabeto.length]).join("");
}
