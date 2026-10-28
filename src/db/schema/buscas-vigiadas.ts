import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

// Buscas que a empresa "vigia" na base pública (etapa 9e, 27/10/2026): o
// painel mostra quantas empresas abriram recentemente em cada uma. Guarda só
// os filtros, nenhum dado de empresa da base. Todo acesso passa por
// src/modules/base-cnpj/repositorio-buscas-vigiadas.ts.
export const buscasVigiadas = pgTable(
  "buscas_vigiadas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizacaoId: text("organizacao_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    uf: text("uf").notNull(),
    // Vazio = todas as cidades do estado.
    municipioCodigo: text("municipio_codigo").notNull().default(""),
    // Nome da cidade no momento em que a busca foi vigiada, para mostrar.
    municipioNome: text("municipio_nome"),
    // Texto da atividade como foi digitado na busca. Vazio = todas.
    atividade: text("atividade").notNull().default(""),
    incluirMei: boolean("incluir_mei").notNull().default(false),
    criadoPorId: text("criado_por_id").references(() => user.id, { onDelete: "set null" }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [
    // A mesma busca não é vigiada duas vezes pela mesma empresa.
    uniqueIndex("buscas_vigiadas_unica").on(
      tabela.organizacaoId,
      tabela.uf,
      tabela.municipioCodigo,
      tabela.atividade,
      tabela.incluirMei,
    ),
    check("buscas_vigiadas_uf_valida", sql`${tabela.uf} ~ '^[A-Z]{2}$'`),
    check("buscas_vigiadas_municipio_valido", sql`${tabela.municipioCodigo} ~ '^[0-9]{0,7}$'`),
    check("buscas_vigiadas_atividade_curta", sql`char_length(${tabela.atividade}) <= 80`),
    // Estado inteiro sem atividade seria lento de contar e não diz nada: exige cidade ou atividade.
    check("buscas_vigiadas_tem_foco", sql`${tabela.municipioCodigo} <> '' or ${tabela.atividade} <> ''`),
  ],
);

export type BuscaVigiada = typeof buscasVigiadas.$inferSelect;
