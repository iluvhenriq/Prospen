import { z } from "zod";
import {
  TAMANHO_MAXIMO_SENHA,
  TAMANHO_MINIMO_SENHA,
} from "@/lib/auth-config";
import { ptBR } from "@/lib/i18n/pt-BR";

// Regras de validação dos formulários de conta. Rodam no servidor, sempre.
// As mensagens são o que a pessoa lê na tela.

const email = z
  .string({ error: ptBR.mensagens.conta.informeEmail })
  .trim()
  .toLowerCase()
  .pipe(z.email(ptBR.mensagens.conta.emailInvalido))
  .pipe(z.string().max(254, ptBR.mensagens.conta.emailLongo));

const senhaNova = z
  .string({ error: ptBR.mensagens.conta.informeSenhaNova })
  .min(TAMANHO_MINIMO_SENHA, ptBR.mensagens.conta.senhaCurta(TAMANHO_MINIMO_SENHA))
  .max(TAMANHO_MAXIMO_SENHA, ptBR.mensagens.conta.senhaLonga(TAMANHO_MAXIMO_SENHA));

export const esquemaCadastro = z.object({
  nome: z
    .string({ error: ptBR.mensagens.conta.informeNome })
    .trim()
    .min(2, ptBR.mensagens.conta.informeNome)
    .max(80, ptBR.mensagens.conta.nomeLongo(80)),
  email,
  senha: senhaNova,
});

export const esquemaPedidoDeSenha = z.object({ email });

export const esquemaNovaSenha = z.object({
  token: z.string().min(1).max(200),
  senha: senhaNova,
});

export const esquemaEntrada = z.object({
  email,
  // Na entrada não se avalia o tamanho: a conferência é feita contra a senha salva.
  senha: z.string({ error: ptBR.mensagens.conta.informeSenha }).min(1, ptBR.mensagens.conta.informeSenha),
});

export const esquemaOrganizacao = z.object({
  nome: z
    .string({ error: ptBR.mensagens.conta.informeEmpresa })
    .trim()
    .min(2, ptBR.mensagens.conta.informeEmpresa)
    .max(80, ptBR.mensagens.conta.nomeLongo(80)),
});

// Resultado que os formulários recebem de volta. Nunca inclui senhas.
// `sucesso`: o pedido foi aceito e o formulário dá lugar a esta mensagem.
export type EstadoFormulario = {
  mensagem?: string;
  sucesso?: string;
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
