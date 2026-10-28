import "server-only";
import { cache } from "react";
import { getDb } from "@/db/client";
import type { Banco } from "@/db/tipos";
import { hojeNoFuso } from "@/lib/formato";
import type { LeadDaBaseCnpj } from "@/modules/leads/repositorio";
import { obterConfiguracao } from "@/modules/organizacoes/configuracao";
import type { Contexto } from "@/modules/organizacoes/contexto";
import { salvarNoMes } from "./cota";
import { empresasPorMesDa, mesDoDia, planoTem, type Recurso } from "./planos";
import { repositorioPlano, type PlanoDaEmpresa } from "./repositorio";

// Plano da empresa do contexto. O `cache` do React evita repetir a consulta
// quando várias partes da mesma tela perguntam. Como o papel, o plano vem
// sempre do banco, nunca do navegador.
const planoDaOrganizacao = cache(
  async (organizacaoId: string): Promise<PlanoDaEmpresa> => repositorioPlano(getDb(), organizacaoId).obter(),
);

export async function obterPlano(contexto: Contexto): Promise<PlanoDaEmpresa> {
  return planoDaOrganizacao(contexto.organizacao.id);
}

export async function temRecurso(contexto: Contexto, recurso: Recurso): Promise<boolean> {
  return planoTem((await obterPlano(contexto)).plano, recurso);
}

async function mesDaEmpresa(db: Banco, organizacaoId: string): Promise<string> {
  const configuracao = await obterConfiguracao(db, organizacaoId);
  return mesDoDia(hojeNoFuso(configuracao.fusoHorario));
}

// semPagamento: o plano ainda não foi liberado e vale EMPRESAS_SEM_PAGAMENTO.
export type UsoDoMes = { usadas: number; limite: number | null; semPagamento: boolean };

export async function obterUsoDoMes(contexto: Contexto): Promise<UsoDoMes> {
  const db = getDb();
  const [empresa, mes] = await Promise.all([obterPlano(contexto), mesDaEmpresa(db, contexto.organizacao.id)]);
  const usadas = await repositorioPlano(db, contexto.organizacao.id).empresasSalvasNoMes(mes);
  return { usadas, limite: empresasPorMesDa(empresa), semPagamento: !empresa.gravado };
}

// Salva empresas da base pública como leads dentro do limite do mês. Só as
// que ainda não são leads contam; as que não couberem ficam de fora. Tudo numa
// transação com a linha do mês travada.
export async function salvarDaBaseNoLimite(
  contexto: Contexto,
  lista: LeadDaBaseCnpj[],
): Promise<{ adicionados: number; foraDoLimite: number; limite: number | null; semPagamento: boolean }> {
  const db = getDb();
  const organizacaoId = contexto.organizacao.id;
  const [empresa, mes] = await Promise.all([obterPlano(contexto), mesDaEmpresa(db, organizacaoId)]);
  const limite = empresasPorMesDa(empresa);
  const resultado = await salvarNoMes(db, organizacaoId, limite, mes, lista, contexto.usuario.id);
  return { ...resultado, limite, semPagamento: !empresa.gravado };
}
