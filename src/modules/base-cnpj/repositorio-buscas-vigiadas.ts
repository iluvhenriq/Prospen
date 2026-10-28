import { and, asc, count, eq } from "drizzle-orm";
import { buscasVigiadas, type BuscaVigiada } from "@/db/schema";
import type { Banco } from "@/db/tipos";
import { regraDeUnicidadeViolada } from "@/lib/erro-unico";

// ÚNICO lugar que consulta a tabela de buscas vigiadas. Amarrado a UMA empresa.

// Mais que isso vira lista que ninguém olha, e cada uma custa consultas no painel.
export const MAXIMO_DE_BUSCAS_VIGIADAS = 10;

export type FiltrosVigiados = {
  uf: string;
  municipioCodigo: string;
  municipioNome: string | null;
  atividade: string;
  incluirMei: boolean;
};

export type ResultadoVigiar = { ok: true; busca: BuscaVigiada } | { ok: false; motivo: "limite" | "repetida" };

export function repositorioBuscasVigiadas(db: Banco, organizacaoId: string) {
  if (!organizacaoId) {
    throw new Error("repositorioBuscasVigiadas exige o identificador da organização.");
  }

  const daOrganizacao = eq(buscasVigiadas.organizacaoId, organizacaoId);

  return {
    async listar(): Promise<BuscaVigiada[]> {
      return db.select().from(buscasVigiadas).where(daOrganizacao).orderBy(asc(buscasVigiadas.criadoEm), asc(buscasVigiadas.id));
    },

    // A busca com estes filtros já é vigiada? Devolve o registro ou nulo.
    async encontrar(filtros: Omit<FiltrosVigiados, "municipioNome">): Promise<BuscaVigiada | null> {
      const [linha] = await db
        .select()
        .from(buscasVigiadas)
        .where(
          and(
            daOrganizacao,
            eq(buscasVigiadas.uf, filtros.uf),
            eq(buscasVigiadas.municipioCodigo, filtros.municipioCodigo),
            eq(buscasVigiadas.atividade, filtros.atividade),
            eq(buscasVigiadas.incluirMei, filtros.incluirMei),
          ),
        )
        .limit(1);
      return linha ?? null;
    },

    async vigiar(filtros: FiltrosVigiados, criadoPorId: string | null): Promise<ResultadoVigiar> {
      const [{ total }] = await db.select({ total: count() }).from(buscasVigiadas).where(daOrganizacao);
      if (total >= MAXIMO_DE_BUSCAS_VIGIADAS) return { ok: false, motivo: "limite" };
      try {
        const [busca] = await db
          .insert(buscasVigiadas)
          .values({ ...filtros, organizacaoId, criadoPorId })
          .returning();
        return { ok: true, busca };
      } catch (erro) {
        if (regraDeUnicidadeViolada(erro) !== null) return { ok: false, motivo: "repetida" };
        throw erro;
      }
    },

    async excluir(id: string): Promise<boolean> {
      const apagadas = await db
        .delete(buscasVigiadas)
        .where(and(daOrganizacao, eq(buscasVigiadas.id, id)))
        .returning({ id: buscasVigiadas.id });
      return apagadas.length > 0;
    },
  };
}

export type RepositorioBuscasVigiadas = ReturnType<typeof repositorioBuscasVigiadas>;
