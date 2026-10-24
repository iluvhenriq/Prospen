"use server";

import { headers } from "next/headers";
import { getDb } from "@/db/client";
import { ptBR } from "@/lib/i18n/pt-BR";
import { ipDaRequisicao } from "@/modules/contas/limites";
import { formatarCnpj } from "@/modules/leads/cnpj";
import { pedirRemocao } from "./remocao";

// Ação PÚBLICA, sem login: o titular da empresa não tem conta no PROSPEN.
// Por isso não começa por exigirPermissao (exceção declarada em
// tests/arquitetura.test.ts). Só mexe na lista de exclusão da base pública,
// nunca em dados de empresas clientes. Regras e limites em ./remocao.ts.

export type EstadoRemocao = {
  sucesso?: string;
  mensagem?: string;
  erros?: { cnpj?: string; confirmacao?: string };
  valores?: { cnpj?: string };
};

export async function pedirRemocaoDosDados(_anterior: EstadoRemocao, dados: FormData): Promise<EstadoRemocao> {
  const cnpj = dados.get("cnpj");
  const entrada = {
    cnpj: typeof cnpj === "string" ? cnpj : "",
    confirmacao: dados.get("confirmacao") === "sim",
  };
  const valores = { cnpj: entrada.cnpj.slice(0, 30) };

  try {
    const resultado = await pedirRemocao(getDb(), entrada, ipDaRequisicao(await headers()));
    if (!resultado.ok) return { erros: resultado.erros, mensagem: resultado.mensagem, valores };
    return { sucesso: ptBR.remocao.pronto(formatarCnpj(resultado.cnpj)) };
  } catch (erro) {
    console.error("Falha no pedido de remoção:", erro instanceof Error ? erro.message : erro);
    return { mensagem: ptBR.remocao.falhou, valores };
  }
}
