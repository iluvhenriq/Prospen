import "server-only";
import { getDb } from "@/db/client";
import { repositorioLeads } from "@/modules/leads/repositorio";
import type { Contexto } from "@/modules/organizacoes/contexto";
import { RESULTADOS_POR_PAGINA, type ParametrosBusca } from "./parametros";
import { repositorioBaseCnpj, type ResultadoDaBusca } from "./repositorio";

// Consulta usada pela tela de busca na base pública de CNPJ. A base é a mesma
// para todas as empresas; o que é da empresa (quais já são leads) passa pelo
// repositório de leads amarrado a ela.

export type TelaDeBusca = {
  estados: { uf: string; mesReferencia: string }[];
  municipios: { codigo: string; nome: string }[];
  // Atividades que casaram com o texto digitado. Nulo se nada foi digitado.
  atividades: { codigo: string; descricao: string }[] | null;
  resultados: ResultadoDaBusca[];
  jaSaoLeads: Set<string>;
  // CNPJ para a próxima página, ou nulo se acabou.
  proximo: string | null;
  buscou: boolean;
};

export async function obterTelaDeBusca(contexto: Contexto, parametros: ParametrosBusca): Promise<TelaDeBusca> {
  const db = getDb();
  const base = repositorioBaseCnpj(db);
  const estados = await base.estadosCarregados();
  const uf = estados.some((estado) => estado.uf === parametros.uf) ? parametros.uf : undefined;
  const vazio = { estados, municipios: [], atividades: null, resultados: [], jaSaoLeads: new Set<string>(), proximo: null, buscou: false };
  // CNPJ digitado e válido: busca só por ele, em qualquer estado carregado.
  const porCnpj = Boolean(parametros.cnpj);
  if (!uf && !porCnpj) return vazio;

  const [municipios, atividades] = await Promise.all([
    uf ? base.municipiosDoEstado(uf) : Promise.resolve([]),
    parametros.atividade && !porCnpj ? base.atividadesPorPalavras(parametros.atividade) : Promise.resolve(null),
  ]);
  const municipio = municipios.some((m) => m.codigo === parametros.municipio) ? parametros.municipio : undefined;

  // Pede um a mais para saber se existe próxima página, sem contar o total.
  const linhas = await base.buscar(
    {
      uf: uf ?? "",
      cnpj: parametros.cnpj,
      municipio,
      atividades: atividades?.map((atividade) => atividade.codigo),
      semMei: !parametros.incluirMei,
    },
    parametros.depoisDe ?? null,
    RESULTADOS_POR_PAGINA + 1,
  );
  const resultados = linhas.slice(0, RESULTADOS_POR_PAGINA);
  const jaSaoLeads = await repositorioLeads(db, contexto.organizacao.id).cnpjsQueJaSaoLeads(
    resultados.map((linha) => linha.cnpj),
  );

  return {
    estados,
    municipios,
    atividades,
    resultados,
    jaSaoLeads,
    proximo: linhas.length > RESULTADOS_POR_PAGINA ? resultados[resultados.length - 1].cnpj : null,
    buscou: true,
  };
}
