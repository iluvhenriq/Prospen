import { and, asc, count, eq, gt, inArray, sql, type SQL } from "drizzle-orm";
import {
  baseCnpjCargas,
  baseCnpjCnaes,
  baseCnpjEmpresas,
  baseCnpjEstabelecimentos,
  baseCnpjExclusoes,
  baseCnpjMunicipios,
  type EmpresaBase,
  type EstabelecimentoBase,
} from "@/db/schema";
import type { Banco } from "@/db/tipos";
import { escaparLike, normalizarTexto } from "@/modules/leads/normalizacao";

// ÚNICO lugar que grava e lê as tabelas da base pública de CNPJ.
// Diferente dos outros repositórios, este NÃO é amarrado a uma empresa: a base
// é pública e igual para todos (exceção declarada em tests/arquitetura.test.ts).
// Por isso ele não pode ter, nunca, função que grave dados de cliente.
// Índices de busca de base_cnpj_estabelecimentos. Mesmos nomes e colunas de
// src/db/schema/base-cnpj.ts (o teste de importação confere que voltam).
const INDICES_DE_BUSCA = [
  sql`create index if not exists "base_cnpj_estab_uf_municipio_idx" on "base_cnpj_estabelecimentos" ("uf", "municipio_codigo")`,
  sql`create index if not exists "base_cnpj_estab_cnae_idx" on "base_cnpj_estabelecimentos" ("cnae_principal", "uf")`,
  sql`create index if not exists "base_cnpj_estab_basico_idx" on "base_cnpj_estabelecimentos" ("cnpj_basico")`,
];

export function repositorioBaseCnpj(db: Banco) {
  return {
    // Carga em massa: manter os índices de busca atualizados a cada linha deixa
    // a gravação presa no disco (medido em 23/10/2026 com SP). Eles saem antes
    // da carga e são recriados de uma vez no final. Durante a carga, a busca
    // nessas tabelas fica lenta (não há tela usando ainda).
    async removerIndicesDeBusca(): Promise<void> {
      await db.execute(sql`drop index if exists "base_cnpj_estab_uf_municipio_idx"`);
      await db.execute(sql`drop index if exists "base_cnpj_estab_cnae_idx"`);
      await db.execute(sql`drop index if exists "base_cnpj_estab_basico_idx"`);
    },

    async recriarIndicesDeBusca(): Promise<void> {
      for (const indice of INDICES_DE_BUSCA) await db.execute(indice);
    },

    // Apaga os estabelecimentos de um estado antes de carregar de novo.
    async apagarUf(uf: string): Promise<number> {
      const antes = await this.contarEstabelecimentos(uf);
      await db.delete(baseCnpjEstabelecimentos).where(eq(baseCnpjEstabelecimentos.uf, uf));
      return antes;
    },

    // Devolve quantos foram gravados (um CNPJ repetido no arquivo é pulado).
    async inserirEstabelecimentos(lote: EstabelecimentoBase[]): Promise<number> {
      if (lote.length === 0) return 0;
      const gravados = await db
        .insert(baseCnpjEstabelecimentos)
        .values(lote)
        .onConflictDoNothing()
        .returning({ cnpj: baseCnpjEstabelecimentos.cnpj });
      return gravados.length;
    },

    // A mesma empresa pode já existir por causa de outro estado: atualiza.
    async gravarEmpresas(lote: EmpresaBase[]): Promise<void> {
      if (lote.length === 0) return;
      await db
        .insert(baseCnpjEmpresas)
        .values(lote)
        .onConflictDoUpdate({
          target: baseCnpjEmpresas.cnpjBasico,
          set: {
            razaoSocial: sql`excluded.razao_social`,
            naturezaJuridica: sql`excluded.natureza_juridica`,
            porte: sql`excluded.porte`,
            mesReferencia: sql`excluded.mes_referencia`,
          },
        });
    },

    // Tabela de atividades da Receita (cerca de 1.300 linhas): substitui inteira.
    async gravarCnaes(lista: { codigo: string; descricao: string }[]): Promise<void> {
      for (let inicio = 0; inicio < lista.length; inicio += 1000) {
        await db
          .insert(baseCnpjCnaes)
          .values(lista.slice(inicio, inicio + 1000))
          .onConflictDoUpdate({ target: baseCnpjCnaes.codigo, set: { descricao: sql`excluded.descricao` } });
      }
    },

    // Fim da carga de um estado: atualiza as cidades dele e registra a carga.
    async registrarCarga(uf: string, mes: string): Promise<void> {
      await db.execute(sql`
        insert into ${baseCnpjMunicipios} (codigo, nome, uf)
        select distinct on (municipio_codigo) municipio_codigo, coalesce(municipio_nome, municipio_codigo), uf
        from ${baseCnpjEstabelecimentos}
        where uf = ${uf}
        on conflict (codigo) do update set nome = excluded.nome, uf = excluded.uf`);
      const estabelecimentos = await this.contarEstabelecimentos(uf);
      await db
        .insert(baseCnpjCargas)
        .values({ uf, mesReferencia: mes, estabelecimentos })
        .onConflictDoUpdate({
          target: baseCnpjCargas.uf,
          set: { mesReferencia: mes, estabelecimentos, concluidaEm: sql`now()` },
        });
    },

    async contarEstabelecimentos(uf: string): Promise<number> {
      const [linha] = await db
        .select({ total: count() })
        .from(baseCnpjEstabelecimentos)
        .where(eq(baseCnpjEstabelecimentos.uf, uf));
      return linha?.total ?? 0;
    },

    // --- Busca (etapa 5d). Só leitura. -------------------------------------

    async estadosCarregados() {
      return db.select().from(baseCnpjCargas).orderBy(asc(baseCnpjCargas.uf));
    },

    async municipiosDoEstado(uf: string) {
      return db
        .select({ codigo: baseCnpjMunicipios.codigo, nome: baseCnpjMunicipios.nome })
        .from(baseCnpjMunicipios)
        .where(eq(baseCnpjMunicipios.uf, uf))
        .orderBy(asc(baseCnpjMunicipios.nome));
    },

    // Atividades cuja descrição tem todas as palavras, sem diferenciar
    // maiúsculas nem acentos. A busca usa a lista de códigos (medido na 5c:
    // filtrar pelo começo do código, sem índice, levou 32 s).
    async atividadesPorPalavras(texto: string, limite = MAXIMO_DE_ATIVIDADES) {
      const palavras = normalizarTexto(texto).split(" ").filter(Boolean).slice(0, 6);
      if (palavras.length === 0) return [];
      const descricao = sql`unaccent(lower(${baseCnpjCnaes.descricao}))`;
      return db
        .select()
        .from(baseCnpjCnaes)
        .where(and(...palavras.map((palavra) => sql`${descricao} like ${`%${escaparLike(palavra)}%`}`)))
        .orderBy(asc(baseCnpjCnaes.descricao))
        .limit(limite);
    },

    // Página de resultados, ordenada pelo CNPJ. A próxima página começa depois
    // do último CNPJ mostrado (sem "offset", que fica lento lá pelo fim, e sem
    // contagem total, que leva segundos em estados grandes).
    async buscar(filtros: FiltrosDaBusca, depoisDe: string | null, limite: number): Promise<ResultadoDaBusca[]> {
      if (filtros.atividades && filtros.atividades.length === 0) return [];
      const condicoes: SQL[] = [
        sql`not exists (select 1 from ${baseCnpjExclusoes} where ${baseCnpjExclusoes.cnpj} = ${baseCnpjEstabelecimentos.cnpj})`,
      ];
      if (filtros.cnpj) {
        // CNPJ exato: é a chave da tabela, os outros filtros não se aplicam.
        condicoes.push(eq(baseCnpjEstabelecimentos.cnpj, filtros.cnpj));
      } else {
        condicoes.push(eq(baseCnpjEstabelecimentos.uf, filtros.uf));
        if (filtros.municipio) condicoes.push(eq(baseCnpjEstabelecimentos.municipioCodigo, filtros.municipio));
        if (filtros.atividades) condicoes.push(inArray(baseCnpjEstabelecimentos.cnaePrincipal, filtros.atividades));
        if (filtros.semMei) {
          condicoes.push(sql`${baseCnpjEmpresas.naturezaJuridica} is distinct from ${NATUREZA_MEI}`);
        }
        if (depoisDe) condicoes.push(gt(baseCnpjEstabelecimentos.cnpj, depoisDe));
      }

      const linhas = await db
        .select({
          cnpj: baseCnpjEstabelecimentos.cnpj,
          nomeFantasia: baseCnpjEstabelecimentos.nomeFantasia,
          razaoSocial: baseCnpjEmpresas.razaoSocial,
          naturezaJuridica: baseCnpjEmpresas.naturezaJuridica,
          atividade: baseCnpjCnaes.descricao,
          bairro: baseCnpjEstabelecimentos.bairro,
          municipio: baseCnpjEstabelecimentos.municipioNome,
          uf: baseCnpjEstabelecimentos.uf,
          telefone: baseCnpjEstabelecimentos.telefone1,
          email: baseCnpjEstabelecimentos.email,
          dataInicioAtividade: baseCnpjEstabelecimentos.dataInicioAtividade,
        })
        .from(baseCnpjEstabelecimentos)
        .leftJoin(baseCnpjEmpresas, eq(baseCnpjEmpresas.cnpjBasico, baseCnpjEstabelecimentos.cnpjBasico))
        .leftJoin(baseCnpjCnaes, eq(baseCnpjCnaes.codigo, baseCnpjEstabelecimentos.cnaePrincipal))
        .where(and(...condicoes))
        .orderBy(asc(baseCnpjEstabelecimentos.cnpj))
        .limit(Math.min(Math.max(limite, 1), 100));
      return linhas.map((linha) => ({ ...linha, mei: linha.naturezaJuridica === NATUREZA_MEI }));
    },

    // Dados para virar lead, lidos de novo do banco: o navegador só manda os
    // CNPJs, nunca o conteúdo. CNPJ na lista de exclusão não volta.
    async paraVirarLead(cnpjs: string[]) {
      if (cnpjs.length === 0) return [];
      return db
        .select({
          cnpj: baseCnpjEstabelecimentos.cnpj,
          nomeFantasia: baseCnpjEstabelecimentos.nomeFantasia,
          razaoSocial: baseCnpjEmpresas.razaoSocial,
          telefone: baseCnpjEstabelecimentos.telefone1,
          email: baseCnpjEstabelecimentos.email,
        })
        .from(baseCnpjEstabelecimentos)
        .leftJoin(baseCnpjEmpresas, eq(baseCnpjEmpresas.cnpjBasico, baseCnpjEstabelecimentos.cnpjBasico))
        .where(
          and(
            inArray(baseCnpjEstabelecimentos.cnpj, cnpjs),
            sql`not exists (select 1 from ${baseCnpjExclusoes} where ${baseCnpjExclusoes.cnpj} = ${baseCnpjEstabelecimentos.cnpj})`,
          ),
        );
    },

    // Pedido do titular para sair da base. Vale para sempre e para todas as empresas.
    async excluirCnpj(cnpj: string): Promise<void> {
      await db.insert(baseCnpjExclusoes).values({ cnpj }).onConflictDoNothing();
    },
  };
}

// Natureza jurídica 2135: empresário individual, onde fica o MEI. Na 5c, 56%
// dos ativos de SP. Por isso a busca vem com "sem MEI" ligado.
export const NATUREZA_MEI = "2135";
export const MAXIMO_DE_ATIVIDADES = 50;

export type FiltrosDaBusca = {
  uf: string;
  // CNPJ exato e válido. Quando presente, os outros filtros são ignorados.
  cnpj?: string;
  municipio?: string;
  // Códigos de atividade. Lista vazia = nenhuma atividade achada, sem resultado.
  atividades?: string[];
  semMei: boolean;
};

export type ResultadoDaBusca = {
  cnpj: string;
  nomeFantasia: string | null;
  razaoSocial: string | null;
  naturezaJuridica: string | null;
  atividade: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string;
  telefone: string | null;
  email: string | null;
  dataInicioAtividade: string | null;
  mei: boolean;
};

export type RepositorioBaseCnpj = ReturnType<typeof repositorioBaseCnpj>;
