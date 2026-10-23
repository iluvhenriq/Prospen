import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

// Um problema encontrado em uma linha da planilha importada.
export type OcorrenciaImportacao = {
  linha: number;
  tipo: "rejeitada" | "duplicada";
  motivo: string;
};

// Histórico das importações de planilha de cada empresa. Guarda só o resumo e
// uma amostra dos problemas, nunca o conteúdo da planilha.
// Todo acesso passa por src/modules/leads/repositorio-importacoes.ts.
export const importacoes = pgTable(
  "importacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizacaoId: text("organizacao_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    criadaPorId: text("criada_por_id").references(() => user.id, {
      onDelete: "set null",
    }),
    nomeArquivo: text("nome_arquivo").notNull(),
    totalLinhas: integer("total_linhas").notNull(),
    aceitas: integer("aceitas").notNull(),
    duplicadas: integer("duplicadas").notNull(),
    rejeitadas: integer("rejeitadas").notNull(),
    // Amostra limitada dos problemas, para a pessoa consultar depois.
    ocorrencias: jsonb("ocorrencias")
      .$type<OcorrenciaImportacao[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (tabela) => [
    index("importacoes_organizacao_criado_idx").on(
      tabela.organizacaoId,
      tabela.criadoEm,
    ),
    check(
      "importacoes_contagens_validas",
      sql`${tabela.aceitas} >= 0 and ${tabela.duplicadas} >= 0 and ${tabela.rejeitadas} >= 0 and ${tabela.aceitas} + ${tabela.duplicadas} + ${tabela.rejeitadas} = ${tabela.totalLinhas}`,
    ),
  ],
);

export type Importacao = typeof importacoes.$inferSelect;
