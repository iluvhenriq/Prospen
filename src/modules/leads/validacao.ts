import { z } from "zod";
import { normalizarTelefone, telefoneValido } from "./normalizacao";

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
  if (nome.length < 2) erros.nome = "Informe o nome do lead.";
  else if (nome.length > LIMITES_LEAD.nome) {
    erros.nome = `O nome pode ter no máximo ${LIMITES_LEAD.nome} caracteres.`;
  }

  const empresa = limpar(entrada.empresa);
  if (empresa.length > LIMITES_LEAD.empresa) {
    erros.empresa = `O nome da empresa pode ter no máximo ${LIMITES_LEAD.empresa} caracteres.`;
  }

  const email = limpar(entrada.email);
  if (email !== "") {
    if (email.length > LIMITES_LEAD.email || !emailValido.safeParse(email).success) {
      erros.email = "Informe um e-mail válido.";
    }
  }

  const paisInformado = limpar(entrada.pais).toUpperCase();
  const pais = paisInformado === "" ? "BR" : paisInformado;
  if (!/^[A-Z]{2}$/.test(pais)) erros.pais = "Informe o país com duas letras, como BR.";

  const telefone = limpar(entrada.telefone);
  if (telefone !== "") {
    const normalizado = normalizarTelefone(telefone, erros.pais ? "BR" : pais);
    if (
      telefone.length > LIMITES_LEAD.telefone ||
      !normalizado ||
      !telefoneValido(normalizado, erros.pais ? "BR" : pais)
    ) {
      erros.telefone =
        pais === "BR" ? "Informe o telefone com DDD." : "Informe um telefone válido.";
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
