import { count, eq, sql } from "drizzle-orm";
import {
  baseCnpjEmpresas,
  baseCnpjEstabelecimentos,
  type EmpresaBase,
  type EstabelecimentoBase,
} from "@/db/schema";
import type { Banco } from "@/db/tipos";

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

    async contarEstabelecimentos(uf: string): Promise<number> {
      const [linha] = await db
        .select({ total: count() })
        .from(baseCnpjEstabelecimentos)
        .where(eq(baseCnpjEstabelecimentos.uf, uf));
      return linha?.total ?? 0;
    },
  };
}

export type RepositorioBaseCnpj = ReturnType<typeof repositorioBaseCnpj>;
