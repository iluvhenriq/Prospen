"use server";

import { headers } from "next/headers";
import { getDb } from "@/db/client";
import { ptBR } from "@/lib/i18n/pt-BR";
import { ipDaRequisicao } from "@/modules/contas/limites";
import { registrarPreCadastro, type CampoPreCadastro } from "./registro";

// Ação PÚBLICA, sem login: quem preenche o pré-cadastro ainda não tem conta
// (exceção declarada em tests/arquitetura.test.ts). Só grava na lista de
// pré-cadastro. Regras e limites em ./registro.ts.

export type EstadoPreCadastro = {
  sucesso?: boolean;
  mensagem?: string;
  erros?: Partial<Record<CampoPreCadastro, string>>;
  valores?: Partial<Record<CampoPreCadastro, string>>;
};

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === "string" ? valor.slice(0, 300) : "";
}

export async function enviarPreCadastro(_anterior: EstadoPreCadastro, dados: FormData): Promise<EstadoPreCadastro> {
  const valores = { nome: texto(dados, "nome"), email: texto(dados, "email"), empresa: texto(dados, "empresa") };
  try {
    const resultado = await registrarPreCadastro(getDb(), valores, ipDaRequisicao(await headers()));
    if (!resultado.ok) return { erros: resultado.erros, mensagem: resultado.mensagem, valores };
    return { sucesso: true };
  } catch (erro) {
    console.error("Falha no pré-cadastro:", erro instanceof Error ? erro.message : erro);
    return { mensagem: ptBR.preVenda.formulario.falhou, valores };
  }
}
