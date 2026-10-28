import { and, asc, count, desc, eq, getTableColumns, gte, inArray, sql, type SQL } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import {
  baseCnpjCargas,
  baseCnpjCnaes,
  baseCnpjEmpresas,
  baseCnpjEstabelecimentos,
  baseCnpjExclusoes,
  baseCnpjMunicipios,
  baseCnpjSinais,
  colunasDoEstabelecimento,
  type SinalDaBase,
  type EmpresaBase,
  type EstabelecimentoBase,
} from "@/db/schema";
import type { Banco } from "@/db/tipos";
import { escaparLike, normalizarTexto } from "@/modules/leads/normalizacao";
import { anosAntes, NATUREZA_MEI, PADRAO_EMAIL_CONTADOR, PESOS } from "@/modules/pontuacao/regras";

// ÚNICO lugar que grava e lê as tabelas da base pública de CNPJ.
// Diferente dos outros repositórios, este NÃO é amarrado a uma empresa: a base
// é pública e igual para todos (exceção declarada em tests/arquitetura.test.ts).
// Por isso ele não pode ter, nunca, função que grave dados de cliente.

// Índices de busca de base_cnpj_estabelecimentos. Mesmos nomes e colunas de
// src/db/schema/base-cnpj.ts (o teste de importação confere que voltam).
const INDICES_DE_BUSCA: Record<string, SQL> = {
  base_cnpj_estab_uf_pontuacao_idx: sql`("uf", "pontuacao" desc nulls last, "cnpj")`,
  base_cnpj_estab_uf_municipio_idx: sql`("uf", "municipio_codigo", "pontuacao" desc nulls last, "cnpj")`,
  base_cnpj_estab_cnae_idx: sql`("cnae_principal", "uf", "pontuacao" desc nulls last, "cnpj")`,
  base_cnpj_estab_basico_idx: sql`("cnpj_basico")`,
};

// Tabela temporária da importação: os estabelecimentos do estado entram aqui
// primeiro (sem índices e sem registro de transações, "unlogged") e passam
// para a tabela final UMA vez, já com a pontuação. Antes, gravar e depois
// atualizar 8,8 milhões de linhas passou de 1h17 sem terminar (23/10/2026).
// Criada e apagada pela própria importação, a partir da final ("like").
const baseCnpjEstabCarga = pgTable("base_cnpj_estab_carga", colunasDoEstabelecimento());

// Mesma conta de pontuar() em src/modules/pontuacao/regras.ts, em SQL, para
// calcular milhões de linhas de uma vez. Montada a partir das mesmas
// constantes; tests/pontuacao.test.ts confere que as duas dão o mesmo número.
function expressaoDaPontuacao(hoje: Date, s: typeof baseCnpjEstabCarga): SQL {
  const umAno = anosAntes(hoje, 1).toISOString().slice(0, 10);
  const tresAnos = anosAntes(hoje, 3).toISOString().slice(0, 10);
  // Pesos são constantes do código, não entrada de usuário: vão direto no SQL
  // (como parâmetro, o PostgreSQL não sabe o tipo dentro do "case").
  const n = (valor: number) => sql.raw(String(Math.trunc(valor)));
  const e = baseCnpjEmpresas;
  return sql`greatest(0, least(100,
      (case when nullif(btrim(${s.telefone1}), '') is not null then ${n(PESOS.telefone)} else 0 end)
    + (case when nullif(btrim(${s.email}), '') is null then 0
            when lower(${s.email}) ~ ${PADRAO_EMAIL_CONTADOR} then ${n(PESOS.emailContador)}
            else ${n(PESOS.emailProprio)} end)
    + (case when ${s.dataInicioAtividade} > ${umAno}::date then ${n(PESOS.empresaNova)}
            when ${s.dataInicioAtividade} > ${tresAnos}::date then ${n(PESOS.empresaRecente)}
            else 0 end)
    + (case ${e.porte} ${sql.join(
      Object.entries(PESOS.porte).map(([porte, pontos]) => sql`when ${porte} then ${n(pontos)}`),
      sql` `,
    )} else 0 end)
    + (case when ${s.matriz} then ${n(PESOS.matriz)} else 0 end)
    + (case when ${e.naturezaJuridica} = ${NATUREZA_MEI} then ${n(PESOS.mei)} else 0 end)
  ))`;
}

// Quantos meses os sinais do Radar ficam guardados.
export const MESES_DE_SINAIS = 12;

// "SAO PAULO/SP": cidade (ou o código, se não houver nome) e estado.
function local(t: { municipioNome: unknown; municipioCodigo: unknown; uf: unknown }): SQL {
  return sql`coalesce(${t.municipioNome}, ${t.municipioCodigo}) || '/' || ${t.uf}`;
}

// Radar (27/10/2026): compara a base nova do estado (tabela temporária) com a
// atual e grava as mudanças em base_cnpj_sinais. Só quando o mês muda: o
// recálculo do mesmo mês (cnpj:registrar) não gera sinal, e a primeira carga
// de um estado também não (não há com o que comparar). Junções em lote
// ("hash"): os índices de busca estão fora durante a troca, só a chave (CNPJ)
// continua. CNPJ que pediu para sair não gera sinal.
// Limitação conhecida: empresa que mudou de estado aparece como "deixou de
// constar como ativa" no estado antigo até o novo ser importado.
async function detectarSinais(tx: Banco, uf: string): Promise<void> {
  const [anterior] = await tx.select().from(baseCnpjCargas).where(eq(baseCnpjCargas.uf, uf)).limit(1);
  const [nova] = await tx
    .select({ mes: baseCnpjEstabCarga.mesReferencia })
    .from(baseCnpjEstabCarga)
    .where(eq(baseCnpjEstabCarga.uf, uf))
    .limit(1);
  if (!anterior || !nova || anterior.mesReferencia === nova.mes) return;
  const mes = nova.mes;

  const n = baseCnpjEstabCarga;
  const o = baseCnpjEstabelecimentos;
  const x = baseCnpjExclusoes;
  const s = baseCnpjSinais;
  const colunas = sql`(${sql.identifier(s.cnpj.name)}, ${sql.identifier(s.cnpjBasico.name)}, ${sql.identifier(s.uf.name)}, ${sql.identifier(s.tipo.name)}, ${sql.identifier(s.antes.name)}, ${sql.identifier(s.depois.name)}, ${sql.identifier(s.mesReferencia.name)})`;
  const semExcluidos = (cnpj: unknown) => sql`not exists (select 1 from ${x} where ${x.cnpj} = ${cnpj})`;

  // Abriu nova unidade: CNPJ que não existia, com a raiz de uma empresa que já existia.
  await tx.execute(sql`
    insert into ${s} ${colunas}
    select ${n.cnpj}, ${n.cnpjBasico}, ${n.uf}, 'nova_unidade', null, ${local(n)}, ${mes}
    from ${n}
    left join ${o} on ${o.cnpj} = ${n.cnpj}
    where ${n.uf} = ${uf} and ${o.cnpj} is null
      and ${n.cnpjBasico} in (select ${o.cnpjBasico} from ${o})
      and ${semExcluidos(n.cnpj)}
    on conflict do nothing`);

  // Mudou de cidade.
  await tx.execute(sql`
    insert into ${s} ${colunas}
    select ${n.cnpj}, ${n.cnpjBasico}, ${n.uf}, 'mudou_cidade', ${local(o)}, ${local(n)}, ${mes}
    from ${n}
    join ${o} on ${o.cnpj} = ${n.cnpj}
    where ${n.uf} = ${uf} and ${o.municipioCodigo} <> ${n.municipioCodigo} and ${semExcluidos(n.cnpj)}
    on conflict do nothing`);

  // Mudou a atividade principal (descrição da Receita, ou o código se não houver).
  await tx.execute(sql`
    insert into ${s} ${colunas}
    select ${n.cnpj}, ${n.cnpjBasico}, ${n.uf}, 'mudou_atividade',
      coalesce((select ${baseCnpjCnaes.descricao} from ${baseCnpjCnaes} where ${baseCnpjCnaes.codigo} = ${o.cnaePrincipal}), ${o.cnaePrincipal}),
      coalesce((select ${baseCnpjCnaes.descricao} from ${baseCnpjCnaes} where ${baseCnpjCnaes.codigo} = ${n.cnaePrincipal}), ${n.cnaePrincipal}),
      ${mes}
    from ${n}
    join ${o} on ${o.cnpj} = ${n.cnpj}
    where ${n.uf} = ${uf} and ${o.cnaePrincipal} <> ${n.cnaePrincipal} and ${semExcluidos(n.cnpj)}
    on conflict do nothing`);

  // Deixou de constar como ativa: estava no estado e não veio na base nova.
  await tx.execute(sql`
    insert into ${s} ${colunas}
    select ${o.cnpj}, ${o.cnpjBasico}, ${o.uf}, 'deixou_ativa', ${local(o)}, null, ${mes}
    from ${o}
    left join ${n} on ${n.cnpj} = ${o.cnpj}
    where ${o.uf} = ${uf} and ${n.cnpj} is null and ${semExcluidos(o.cnpj)}
    on conflict do nothing`);
}

export function repositorioBaseCnpj(db: Banco) {
  return {
    // Carga em massa: manter os índices de busca atualizados a cada linha deixa
    // a gravação presa no disco (medido em 23/10/2026 com SP). Eles saem antes
    // da carga e são recriados de uma vez no final. Durante a carga, a busca
    // nessas tabelas fica lenta (não há tela usando ainda).
    async removerIndicesDeBusca(): Promise<void> {
      for (const nome of Object.keys(INDICES_DE_BUSCA)) {
        await db.execute(sql`drop index if exists ${sql.identifier(nome)}`);
      }
    },

    async recriarIndicesDeBusca(): Promise<void> {
      for (const [nome, colunas] of Object.entries(INDICES_DE_BUSCA)) {
        await db.transaction(async (tx) => {
          // Só nesta transação: o padrão do PostgreSQL (64 MB) faz a ordenação
          // de milhões de linhas ir para o disco (5 min ou mais por índice em SP).
          await tx.execute(sql`set local maintenance_work_mem = '1GB'`);
          await tx.execute(
            sql`create index if not exists ${sql.identifier(nome)} on ${baseCnpjEstabelecimentos} ${colunas}`,
          );
        });
      }
    },

    // Começo da carga: tabela temporária vazia.
    async prepararCarga(): Promise<void> {
      await db.execute(sql`drop table if exists ${baseCnpjEstabCarga}`);
      await db.execute(
        sql`create unlogged table ${baseCnpjEstabCarga} (like ${baseCnpjEstabelecimentos} including defaults)`,
      );
    },

    async inserirNaCarga(lote: EstabelecimentoBase[]): Promise<number> {
      if (lote.length === 0) return 0;
      await db.insert(baseCnpjEstabCarga).values(lote);
      return lote.length;
    },

    // Para recalcular a pontuação de um estado já carregado (cnpj:registrar):
    // copia os estabelecimentos dele para a tabela temporária.
    async copiarEstadoParaCarga(uf: string): Promise<void> {
      await db.execute(
        sql`insert into ${baseCnpjEstabCarga} select * from ${baseCnpjEstabelecimentos} where ${baseCnpjEstabelecimentos.uf} = ${uf}`,
      );
    },

    // Fim da carga, com as empresas já gravadas: troca os estabelecimentos do
    // estado pelos da tabela temporária, calculando a pontuação na mesma
    // instrução, e apaga a temporária. Quem não tem empresa no arquivo de
    // Empresas (7 casos em SP) pontua só pelo próprio estabelecimento. CNPJ
    // repetido nos arquivos entra uma vez. Devolve quantos ficaram no estado.
    async concluirCarga(uf: string, hoje: Date = new Date()): Promise<number> {
      const colunas = Object.values(getTableColumns(baseCnpjEstabCarga));
      await db.transaction(async (tx) => {
        // Só nesta transação: memória para cruzar milhões de linhas sem ir ao disco.
        await tx.execute(sql`set local work_mem = '512MB'`);
        // Radar: antes de apagar a base antiga, guarda o que mudou.
        await detectarSinais(tx, uf);
        await tx.delete(baseCnpjEstabelecimentos).where(eq(baseCnpjEstabelecimentos.uf, uf));
        await tx.execute(sql`
          insert into ${baseCnpjEstabelecimentos} (${sql.join(
            colunas.map((coluna) => sql.identifier(coluna.name)),
            sql`, `,
          )}, "pontuacao")
          select ${sql.join(colunas, sql`, `)}, ${expressaoDaPontuacao(hoje, baseCnpjEstabCarga)}
          from ${baseCnpjEstabCarga}
          left join ${baseCnpjEmpresas} on ${baseCnpjEmpresas.cnpjBasico} = ${baseCnpjEstabCarga.cnpjBasico}
          where ${baseCnpjEstabCarga.uf} = ${uf}
          on conflict ("cnpj") do nothing`);
      });
      await this.descartarCarga();
      return this.contarEstabelecimentos(uf);
    },

    async descartarCarga(): Promise<void> {
      await db.execute(sql`drop table if exists ${baseCnpjEstabCarga}`);
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
      await this.limparSinaisAntigos(mes);
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
    // Página de resultados, da maior pontuação para a menor (desempate pelo
    // CNPJ). A próxima página começa depois do último mostrado.
    async buscar(filtros: FiltrosDaBusca, depoisDe: Cursor | null, limite: number): Promise<ResultadoDaBusca[]> {
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
        if (filtros.abertasDesde) {
          condicoes.push(gte(baseCnpjEstabelecimentos.dataInicioAtividade, filtros.abertasDesde));
        }
        if (depoisDe) {
          condicoes.push(
            sql`(${baseCnpjEstabelecimentos.pontuacao} < ${depoisDe.pontos} or (${baseCnpjEstabelecimentos.pontuacao} = ${depoisDe.pontos} and ${baseCnpjEstabelecimentos.cnpj} > ${depoisDe.cnpj}))`,
          );
        }
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
          matriz: baseCnpjEstabelecimentos.matriz,
          porte: baseCnpjEmpresas.porte,
          pontuacao: baseCnpjEstabelecimentos.pontuacao,
        })
        .from(baseCnpjEstabelecimentos)
        .leftJoin(baseCnpjEmpresas, eq(baseCnpjEmpresas.cnpjBasico, baseCnpjEstabelecimentos.cnpjBasico))
        .leftJoin(baseCnpjCnaes, eq(baseCnpjCnaes.codigo, baseCnpjEstabelecimentos.cnaePrincipal))
        .where(and(...condicoes))
        .orderBy(
          // "nulls last" igual ao dos índices: sem isso o PostgreSQL não usa o índice para ordenar.
          sql`${baseCnpjEstabelecimentos.pontuacao} desc nulls last`,
          asc(baseCnpjEstabelecimentos.cnpj),
        )
        .limit(Math.min(Math.max(limite, 1), 100));
      return linhas.map((linha) => ({ ...linha, mei: linha.naturezaJuridica === NATUREZA_MEI }));
    },

    // CNPJs das empresas abertas desde uma data que casam com os filtros (sem os
    // excluídos), até o limite. Serve para contar as novas de uma busca vigiada:
    // quem chama tira as que já são leads e mostra "limite ou mais" se encher.
    async cnpjsAbertosDesde(
      filtros: Omit<FiltrosDaBusca, "cnpj" | "abertasDesde">,
      desde: string,
      limite: number,
    ): Promise<string[]> {
      if (filtros.atividades && filtros.atividades.length === 0) return [];
      const condicoes: SQL[] = [
        eq(baseCnpjEstabelecimentos.uf, filtros.uf),
        gte(baseCnpjEstabelecimentos.dataInicioAtividade, desde),
        sql`not exists (select 1 from ${baseCnpjExclusoes} where ${baseCnpjExclusoes.cnpj} = ${baseCnpjEstabelecimentos.cnpj})`,
      ];
      if (filtros.municipio) condicoes.push(eq(baseCnpjEstabelecimentos.municipioCodigo, filtros.municipio));
      if (filtros.atividades) condicoes.push(inArray(baseCnpjEstabelecimentos.cnaePrincipal, filtros.atividades));
      if (filtros.semMei) condicoes.push(sql`${baseCnpjEmpresas.naturezaJuridica} is distinct from ${NATUREZA_MEI}`);
      const linhas = await db
        .select({ cnpj: baseCnpjEstabelecimentos.cnpj })
        .from(baseCnpjEstabelecimentos)
        .leftJoin(baseCnpjEmpresas, eq(baseCnpjEmpresas.cnpjBasico, baseCnpjEstabelecimentos.cnpjBasico))
        .where(and(...condicoes))
        .limit(Math.min(Math.max(limite, 1), 2000));
      return linhas.map((linha) => linha.cnpj);
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
          porte: baseCnpjEmpresas.porte,
          naturezaJuridica: baseCnpjEmpresas.naturezaJuridica,
          dataAbertura: baseCnpjEstabelecimentos.dataInicioAtividade,
          matriz: baseCnpjEstabelecimentos.matriz,
          cnaePrincipal: baseCnpjEstabelecimentos.cnaePrincipal,
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

    // Pedido do titular para sair da base. Vale para sempre e para todas as
    // empresas. Os sinais do Radar sobre esse CNPJ também saem.
    async excluirCnpj(cnpj: string): Promise<void> {
      await db.insert(baseCnpjExclusoes).values({ cnpj }).onConflictDoNothing();
      await db.delete(baseCnpjSinais).where(eq(baseCnpjSinais.cnpj, cnpj));
    },

    // --- Radar (27/10/2026). Só leitura, menos a limpeza. -------------------

    // Sinais sobre estes CNPJs (mudanças da própria empresa) e sobre as raízes
    // (novas unidades da mesma empresa), dos mais recentes, sem excluídos.
    async sinaisDe(cnpjs: string[], cnpjsBasicos: string[], limite = 200): Promise<SinalDaBase[]> {
      if (cnpjs.length === 0 && cnpjsBasicos.length === 0) return [];
      const daPropria = cnpjs.length > 0 ? sql`(${inArray(baseCnpjSinais.cnpj, cnpjs)} and ${baseCnpjSinais.tipo} <> 'nova_unidade')` : sql`false`;
      const novaUnidade =
        cnpjsBasicos.length > 0 ? sql`(${inArray(baseCnpjSinais.cnpjBasico, cnpjsBasicos)} and ${baseCnpjSinais.tipo} = 'nova_unidade')` : sql`false`;
      return db
        .select()
        .from(baseCnpjSinais)
        .where(
          and(
            sql`(${daPropria} or ${novaUnidade})`,
            sql`not exists (select 1 from ${baseCnpjExclusoes} where ${baseCnpjExclusoes.cnpj} = ${baseCnpjSinais.cnpj})`,
          ),
        )
        .orderBy(desc(baseCnpjSinais.mesReferencia), desc(baseCnpjSinais.detectadoEm), asc(baseCnpjSinais.cnpj))
        .limit(Math.min(Math.max(limite, 1), 1000));
    },

    // Apaga os sinais com mais de MESES_DE_SINAIS meses (chamado ao registrar a carga).
    async limparSinaisAntigos(mesAtual: string): Promise<void> {
      const [ano, mes] = mesAtual.split("-").map(Number);
      const limite = new Date(Date.UTC(ano, mes - 1 - MESES_DE_SINAIS, 1)).toISOString().slice(0, 7);
      await db.delete(baseCnpjSinais).where(sql`${baseCnpjSinais.mesReferencia} < ${limite}`);
    },
  };
}

// Natureza jurídica 2135 (NATUREZA_MEI, empresário individual): na 5c, 56%
// dos ativos de SP. Por isso a busca vem com "sem MEI" ligado.
export const MAXIMO_DE_ATIVIDADES = 50;

export type FiltrosDaBusca = {
  uf: string;
  // CNPJ exato e válido. Quando presente, os outros filtros são ignorados.
  cnpj?: string;
  municipio?: string;
  // Códigos de atividade. Lista vazia = nenhuma atividade achada, sem resultado.
  atividades?: string[];
  semMei: boolean;
  // Só empresas abertas a partir desta data (AAAA-MM-DD): as recém-abertas.
  abertasDesde?: string;
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
  matriz: boolean;
  porte: string | null;
  pontuacao: number;
  mei: boolean;
};

// Posição na lista ordenada: pontuação e CNPJ do último mostrado.
export type Cursor = { pontos: number; cnpj: string };

export type RepositorioBaseCnpj = ReturnType<typeof repositorioBaseCnpj>;
