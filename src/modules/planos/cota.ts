import type { Banco } from "@/db/tipos";
import { repositorioLeads, type LeadDaBaseCnpj } from "@/modules/leads/repositorio";
import { cabemNoMes } from "./planos";
import { repositorioPlano } from "./repositorio";

// Salva empresas da base pública como leads dentro do limite do mês (nulo: sem
// limite; o valor vem de `empresasPorMesDa`).
// Só as que ainda não são leads contam; as que não couberem ficam de fora.
// Tudo numa transação, com a linha do mês travada. Fica fora de acesso.ts
// (que depende da requisição) para os testes rodarem no banco em memória.
export async function salvarNoMes(
  db: Banco,
  organizacaoId: string,
  limite: number | null,
  mes: string,
  lista: LeadDaBaseCnpj[],
  criadoPorId: string | null,
): Promise<{ adicionados: number; foraDoLimite: number }> {
  return db.transaction(async (tx) => {
    const uso = repositorioPlano(tx, organizacaoId);
    const leads = repositorioLeads(tx, organizacaoId);
    const usadas = await uso.travarMes(mes);
    const jaSaoLeads = await leads.cnpjsQueJaSaoLeads(lista.map((item) => item.cnpj));
    const novas = lista.filter((item) => !jaSaoLeads.has(item.cnpj));
    const cabem = cabemNoMes(novas.length, usadas, limite);
    const adicionados = await leads.criarDaBaseCnpj(novas.slice(0, cabem), criadoPorId);
    await uso.somarAoMes(mes, adicionados);
    return { adicionados, foraDoLimite: novas.length - cabem };
  });
}
