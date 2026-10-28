import "server-only";
import { getDb } from "@/db/client";
import { diasAntes, hojeNoFuso } from "@/lib/formato";
import { repositorioCampanhas } from "@/modules/campanhas/repositorio";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { obterConfiguracao } from "@/modules/organizacoes/configuracao";
import type { Contexto } from "@/modules/organizacoes/contexto";
import { consumirLimiteDeBusca } from "./limite-busca";
import { DIAS_DE_RECENTES, enderecoDaBusca, RESULTADOS_POR_PAGINA, type ParametrosBusca } from "./parametros";
import { repositorioBaseCnpj, type Cursor, type ResultadoDaBusca } from "./repositorio";
import { cnpjsRecentesDaBase } from "./recentes";
import { repositorioBuscasVigiadas } from "./repositorio-buscas-vigiadas";

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
  // Horas até liberar, quando a empresa passou do limite diário de páginas.
  limiteAtingido: number | null;
  // Vigiar esta busca: só com estado e cidade ou atividade. "id" se já é vigiada.
  vigia: { pode: false } | { pode: true; id: string | null; municipioNome: string | null };
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
    limiteAtingido: null,
    vigia: { pode: false } as TelaDeBusca["vigia"],
  };
  // CNPJ digitado e válido: busca só por ele, em qualquer estado carregado.
  const porCnpj = Boolean(parametros.cnpj);
  if (!uf && !porCnpj) return vazio;

  const limite = consumirLimiteDeBusca(contexto.organizacao.id);
  if (limite.bloqueado) return { ...vazio, limiteAtingido: Math.ceil(limite.segundosParaLiberar / 3600) };

  const [municipios, atividades] = await Promise.all([
    uf ? base.municipiosDoEstado(uf) : Promise.resolve([]),
    parametros.atividade && !porCnpj ? base.atividadesPorPalavras(parametros.atividade) : Promise.resolve(null),
  ]);
  const municipio = municipios.some((m) => m.codigo === parametros.municipio) ? parametros.municipio : undefined;
  const configuracao = await obterConfiguracao(db, contexto.organizacao.id);
  const abertasDesde =
    parametros.recentes && !porCnpj ? diasAntes(hojeNoFuso(configuracao.fusoHorario), DIAS_DE_RECENTES) : undefined;

  // Pede um a mais para saber se existe próxima página, sem contar o total.
  const linhas = await base.buscar(
    {
      uf: uf ?? "",
      cnpj: parametros.cnpj,
      municipio,
      atividades: atividades?.map((atividade) => atividade.codigo),
      semMei: !parametros.incluirMei,
      abertasDesde,
    },
    parametros.depoisDe ?? null,
    RESULTADOS_POR_PAGINA + 1,
  );
  const resultados = linhas.slice(0, RESULTADOS_POR_PAGINA);
  const podeVigiar = Boolean(uf) && !porCnpj && Boolean(municipio || parametros.atividade);
  const [jaSaoLeads, campanhas, vigiada] = await Promise.all([
    repositorioLeads(db, contexto.organizacao.id).cnpjsQueJaSaoLeads(resultados.map((linha) => linha.cnpj)),
    repositorioCampanhas(db, contexto.organizacao.id).listar(""),
    podeVigiar
      ? repositorioBuscasVigiadas(db, contexto.organizacao.id).encontrar({
          uf: uf ?? "",
          municipioCodigo: municipio ?? "",
          atividade: parametros.atividade,
          incluirMei: parametros.incluirMei,
        })
      : Promise.resolve(null),
  ]);
  const vigia: TelaDeBusca["vigia"] = podeVigiar
    ? { pode: true, id: vigiada?.id ?? null, municipioNome: municipios.find((m) => m.codigo === municipio)?.nome ?? null }
    : { pode: false };

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
    limiteAtingido: null,
    vigia,
    campanhasAtivas: campanhas
      .filter((campanha) => campanha.situacao === "ativa")
      .map((campanha) => ({ id: campanha.id, nome: campanha.nome })),
  };
}

// Quantas empresas novas o painel conta, no máximo, em cada busca vigiada.
// Passou disso, mostra "500 ou mais": contar tudo pesaria a cada abertura.
export const LIMITE_DE_NOVAS = 500;

export type NovidadeDeBusca = {
  id: string;
  uf: string;
  municipioNome: string | null;
  atividade: string;
  // Abertas nos últimos DIAS_DE_RECENTES dias que ainda não são leads da empresa.
  novas: number;
  maisQue: boolean;
  // Busca com o filtro de recentes, para ver as empresas.
  endereco: string;
  // O estado saiu da base carregada (não deveria acontecer, mas não quebra o painel).
  estadoCarregado: boolean;
};

// Painel: o que há de novo nas buscas vigiadas desta empresa. Não gasta o
// limite diário de páginas da busca: só conta, não mostra empresas.
export async function obterNovidadesDasBuscasVigiadas(contexto: Contexto): Promise<NovidadeDeBusca[]> {
  const db = getDb();
  const vigiadas = await repositorioBuscasVigiadas(db, contexto.organizacao.id).listar();
  if (vigiadas.length === 0) return [];

  const base = repositorioBaseCnpj(db);
  const leads = repositorioLeads(db, contexto.organizacao.id);
  const [estados, configuracao] = await Promise.all([base.estadosCarregados(), obterConfiguracao(db, contexto.organizacao.id)]);
  const desde = diasAntes(hojeNoFuso(configuracao.fusoHorario), DIAS_DE_RECENTES);

  return Promise.all(
    vigiadas.map(async (vigiada) => {
      const endereco = enderecoDaBusca({
        uf: vigiada.uf,
        municipio: vigiada.municipioCodigo || undefined,
        atividade: vigiada.atividade,
        incluirMei: vigiada.incluirMei,
        recentes: true,
        cnpjDigitado: "",
      });
      const comum = {
        id: vigiada.id,
        uf: vigiada.uf,
        municipioNome: vigiada.municipioNome,
        atividade: vigiada.atividade,
        endereco,
      };
      if (!estados.some((estado) => estado.uf === vigiada.uf)) {
        return { ...comum, novas: 0, maisQue: false, estadoCarregado: false };
      }
      // A parte cara (ler a base pública) fica guardada por um dia e serve a todas as empresas.
      const cnpjs = await cnpjsRecentesDaBase(
        vigiada.uf,
        vigiada.municipioCodigo,
        vigiada.atividade,
        vigiada.incluirMei,
        desde,
        LIMITE_DE_NOVAS + 1,
      );
      const maisQue = cnpjs.length > LIMITE_DE_NOVAS;
      const contadas = cnpjs.slice(0, LIMITE_DE_NOVAS);
      const jaSaoLeads = await leads.cnpjsQueJaSaoLeads(contadas);
      return { ...comum, novas: contadas.length - jaSaoLeads.size, maisQue, estadoCarregado: true };
    }),
  );
}
