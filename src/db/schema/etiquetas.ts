import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { leads } from "./leads";

// Cores disponíveis para as etiquetas. Combinam com os componentes visuais.
export const CORES_ETIQUETA = ["neutra", "roxo", "musgo", "aviso", "erro"] as const;
export type CorEtiqueta = (typeof CORES_ETIQUETA)[number];

// Etiquetas de cada empresa. Todo acesso passa por
// src/modules/leads/repositorio-etiquetas.ts.
export const etiquetas = pgTable(
  "etiquetas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizacaoId: text("organizacao_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    // Nome sem acento e em minúsculo: "Quente" e "quente" são a mesma etiqueta.
    nomeNormalizado: text("nome_normalizado").notNull(),
    cor: text("cor").$type<CorEtiqueta>().notNull().default("neutra"),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (tabela) => [
    unique("etiquetas_id_organizacao_unico").on(tabela.id, tabela.organizacaoId),
    uniqueIndex("etiquetas_organizacao_nome_unico").on(
      tabela.organizacaoId,
      tabela.nomeNormalizado,
    ),
    check(
      "etiquetas_cor_valida",
      sql`${tabela.cor} in ('neutra', 'roxo', 'musgo', 'aviso', 'erro')`,
    ),
    check(
      "etiquetas_nome_valido",
      sql`char_length(btrim(${tabela.nome})) between 1 and 40`,
    ),
  ],
);

// Ligação entre leads e etiquetas. A empresa também faz parte das duas chaves
// estrangeiras: o banco recusa ligar um lead de uma empresa a uma etiqueta de outra,
// mesmo que alguém tente por um caminho que não passe pelo repositório.
export const leadEtiquetas = pgTable(
  "lead_etiquetas",
  {
    organizacaoId: text("organizacao_id").notNull(),
    leadId: uuid("lead_id").notNull(),
    etiquetaId: uuid("etiqueta_id").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (tabela) => [
    primaryKey({ columns: [tabela.leadId, tabela.etiquetaId] }),
    foreignKey({
      name: "lead_etiquetas_lead_fk",
      columns: [tabela.leadId, tabela.organizacaoId],
      foreignColumns: [leads.id, leads.organizacaoId],
    }).onDelete("cascade"),
    foreignKey({
      name: "lead_etiquetas_etiqueta_fk",
      columns: [tabela.etiquetaId, tabela.organizacaoId],
      foreignColumns: [etiquetas.id, etiquetas.organizacaoId],
    }).onDelete("cascade"),
    index("lead_etiquetas_etiqueta_idx").on(tabela.organizacaoId, tabela.etiquetaId),
  ],
);

export type Etiqueta = typeof etiquetas.$inferSelect;
