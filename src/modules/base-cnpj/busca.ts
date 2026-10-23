import "server-only";
import { getDb } from "@/db/client";
import { repositorioCampanhas } from "@/modules/campanhas/repositorio";
import { repositorioLeads } from "@/modules/leads/repositorio";
import type { Contexto } from "@/modules/organizacoes/contexto";
import { RESULTADOS_POR_PAGINA, type ParametrosBusca } from "./parametros";
import { repositorioBaseCnpj, type Cursor, type ResultadoDaBusca } from "./repositorio";

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
  // Onde começa a próxima página, ou nulo se acabou.
  proximo: Cursor | null;
  buscou: boolean;
  // Campanhas ativas, para colocar as empresas adicionadas direto numa delas.
  campanhasAtivas: { id: string; nome: string }[];
};

export async function obterTelaDeBusca(contexto: Contexto, parametros: ParametrosBusca): Promise<TelaDeBusca> {
  const db = getDb();
  const base = repositorioBaseCnpj(db);
  const estados = await base.estadosCarregados();
  const uf = estados.some((estado) => estado.uf === parametros.uf) ? parametros.uf : undefined;
  const vazio = {
    estados,
    municipios: [],
    atividades: null,
    resultados: [],
    jaSaoLeads: new Set<string>(),
    proximo: null,
    buscou: false,
    campanhasAtivas: [],
  };
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
  const [jaSaoLeads, campanhas] = await Promise.all([
    repositorioLeads(db, contexto.organizacao.id).cnpjsQueJaSaoLeads(resultados.map((linha) => linha.cnpj)),
    repositorioCampanhas(db, contexto.organizacao.id).listar(""),
  ]);

  return {
    estados,
    municipios,
    atividades,
    resultados,
    jaSaoLeads,
    proximo:
      linhas.length > RESULTADOS_POR_PAGINA
        ? { pontos: resultados[resultados.length - 1].pontuacao, cnpj: resultados[resultados.length - 1].cnpj }
        : null,
    buscou: true,
    campanhasAtivas: campanhas
      .filter((campanha) => campanha.situacao === "ativa")
      .map((campanha) => ({ id: campanha.id, nome: campanha.nome })),
  };
}
