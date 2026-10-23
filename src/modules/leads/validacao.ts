import { z } from "zod";
import { normalizarTelefone, telefoneValido } from "./normalizacao";
import { ptBR } from "@/lib/i18n/pt-BR";

// Validação de um lead. Roda no servidor, sempre, e é a MESMA para o cadastro
// manual e para cada linha de uma planilha importada.

export const LIMITES_LEAD = {
  nome: 120,
  empresa: 120,
  email: 254,
  telefone: 30,
} as const;

export type CampoLead = "nome" | "empresa" | "email" | "telefone" | "pais";

export const ROTULOS_CAMPO: Record<CampoLead, string> = {
  nome: "Nome",
  empresa: "Empresa",
  email: "E-mail",
  telefone: "Telefone",
  pais: "País",
};

export type EntradaLead = {
  nome?: unknown;
  empresa?: unknown;
  email?: unknown;
  telefone?: unknown;
  pais?: unknown;
};

// Dados já conferidos e limpos, prontos para gravar.
export type DadosLead = {
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  pais: string;
};

export type ResultadoValidacao =
  | { ok: true; dados: DadosLead }
  | { ok: false; erros: Partial<Record<CampoLead, string>> };

// Texto simples: sem caracteres de controle, espaços repetidos viram um só.
function limpar(valor: unknown): string {
  if (typeof valor !== "string") return "";
  return valor.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

const emailValido = z.email();

export function validarLead(entrada: EntradaLead): ResultadoValidacao {
  const erros: Partial<Record<CampoLead, string>> = {};

  const nome = limpar(entrada.nome);
  if (nome.length < 2) erros.nome = ptBR.mensagens.lead.nomeObrigatorio;
  else if (nome.length > LIMITES_LEAD.nome) {
    erros.nome = ptBR.mensagens.lead.nomeLongo(LIMITES_LEAD.nome);
  }

  const empresa = limpar(entrada.empresa);
  if (empresa.length > LIMITES_LEAD.empresa) {
    erros.empresa = ptBR.mensagens.lead.empresaLonga(LIMITES_LEAD.empresa);
  }

  const email = limpar(entrada.email);
  if (email !== "") {
    if (email.length > LIMITES_LEAD.email || !emailValido.safeParse(email).success) {
      erros.email = ptBR.mensagens.lead.emailInvalido;
    }
  }

  const paisInformado = limpar(entrada.pais).toUpperCase();
  const pais = paisInformado === "" ? "BR" : paisInformado;
  if (!/^[A-Z]{2}$/.test(pais)) erros.pais = ptBR.mensagens.lead.paisInvalido;

  const telefone = limpar(entrada.telefone);
  if (telefone !== "") {
    const normalizado = normalizarTelefone(telefone, erros.pais ? "BR" : pais);
    if (
      telefone.length > LIMITES_LEAD.telefone ||
      !normalizado ||
      !telefoneValido(normalizado, erros.pais ? "BR" : pais)
    ) {
      erros.telefone =
        pais === "BR" ? ptBR.mensagens.lead.telefoneComDdd : ptBR.mensagens.lead.telefoneInvalido;
    }
  }

  if (Object.keys(erros).length > 0) return { ok: false, erros };

  return {
    ok: true,
    dados: {
      nome,
      empresa: empresa === "" ? null : empresa,
      email: email === "" ? null : email,
      telefone: telefone === "" ? null : telefone,
      pais,
    },
  };
}
