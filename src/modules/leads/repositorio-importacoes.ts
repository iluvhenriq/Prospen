import { desc, eq } from "drizzle-orm";
import {
  importacoes,
  type Importacao,
  type OcorrenciaImportacao,
} from "@/db/schema";
import type { Banco } from "@/db/tipos";

// ÚNICO lugar que consulta o histórico de importações. Amarrado a UMA empresa.

export type DadosImportacao = {
  criadaPorId: string | null;
  nomeArquivo: string;
  totalLinhas: number;
  aceitas: number;
  duplicadas: number;
  rejeitadas: number;
  ocorrencias: OcorrenciaImportacao[];
};

export function repositorioImportacoes(db: Banco, organizacaoId: string) {
  if (!organizacaoId) {
    throw new Error("repositorioImportacoes exige o identificador da organização.");
  }

  const daOrganizacao = eq(importacoes.organizacaoId, organizacaoId);

  return {
    async registrar(dados: DadosImportacao): Promise<Importacao> {
      const [linha] = await db
        .insert(importacoes)
        .values({
          organizacaoId,
          criadaPorId: dados.criadaPorId,
          nomeArquivo: dados.nomeArquivo,
          totalLinhas: dados.totalLinhas,
          aceitas: dados.aceitas,
          duplicadas: dados.duplicadas,
          rejeitadas: dados.rejeitadas,
          ocorrencias: dados.ocorrencias,
        })
        .returning();
      return linha;
    },

    async listarRecentes(limite = 10): Promise<Importacao[]> {
      return db
        .select()
        .from(importacoes)
        .where(daOrganizacao)
        .orderBy(desc(importacoes.criadoEm), desc(importacoes.id))
        .limit(Math.min(Math.max(limite, 1), 50));
    },
  };
}

export type RepositorioImportacoes = ReturnType<typeof repositorioImportacoes>;
