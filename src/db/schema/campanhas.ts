import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { leads } from "./leads";

// Campanhas manuais (etapa 7, decidida em 23/10/2026): servem como lista de
// trabalho ("ligar para as padarias de Campinas em novembro") e como ação com
// custo ("panfletagem, R$ 500"). Os resultados (contatados, ganhos, valor) não
// são digitados: vêm da etapa e do valor de venda dos leads da campanha.
// Todo acesso passa por src/modules/campanhas/repositorio.ts.

export const SITUACOES_CAMPANHA = ["ativa", "encerrada"] as const;
export type SituacaoCampanha = (typeof SITUACOES_CAMPANHA)[number];

export const campanhas = pgTable(
  "campanhas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizacaoId: text("organizacao_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    objetivo: text("objetivo"),
    // Quem toca a campanha. Se a pessoa sair do sistema, fica vazio.
    responsavelId: text("responsavel_id").references(() => user.id, { onDelete: "set null" }),
    inicio: date("inicio"),
    fim: date("fim"),
    // Custo opcional, em centavos, na moeda da empresa no momento do registro.
    custoCentavos: bigint("custo_centavos", { mode: "number" }),
    moedaCusto: text("moeda_custo"),
    situacao: text("situacao").$type<SituacaoCampanha>().notNull().default("ativa"),
    criadoPorId: text("criado_por_id").references(() => user.id, { onDelete: "set null" }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (tabela) => [
    unique("campanhas_id_organizacao_unico").on(tabela.id, tabela.organizacaoId),
    index("campanhas_organizacao_idx").on(tabela.organizacaoId, tabela.situacao, tabela.criadoEm),
    check("campanhas_nome_valido", sql`char_length(btrim(${tabela.nome})) between 1 and 80`),
    check("campanhas_objetivo_valido", sql`${tabela.objetivo} is null or char_length(${tabela.objetivo}) <= 500`),
    check("campanhas_situacao_valida", sql`${tabela.situacao} in ('ativa', 'encerrada')`),
    check("campanhas_periodo_valido", sql`${tabela.inicio} is null or ${tabela.fim} is null or ${tabela.fim} >= ${tabela.inicio}`),
    check(
      "campanhas_custo_valido",
      sql`${tabela.custoCentavos} is null or (${tabela.custoCentavos} >= 0 and ${tabela.moedaCusto} ~ '^[A-Z]{3}$')`,
    ),
  ],
);

// Leads de cada campanha. Um lead pode estar em várias. A empresa faz parte das
// duas chaves estrangeiras: o banco recusa ligar o lead de uma empresa à
// campanha de outra, mesmo por um caminho que não passe pelo repositório.
export const campanhaLeads = pgTable(
  "campanha_leads",
  {
    organizacaoId: text("organizacao_id").notNull(),
    campanhaId: uuid("campanha_id").notNull(),
    leadId: uuid("lead_id").notNull(),
    adicionadoPorId: text("adicionado_por_id").references(() => user.id, { onDelete: "set null" }),
    adicionadoEm: timestamp("adicionado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [
    primaryKey({ columns: [tabela.campanhaId, tabela.leadId] }),
    foreignKey({
      name: "campanha_leads_campanha_fk",
      columns: [tabela.campanhaId, tabela.organizacaoId],
      foreignColumns: [campanhas.id, campanhas.organizacaoId],
    }).onDelete("cascade"),
    foreignKey({
      name: "campanha_leads_lead_fk",
      columns: [tabela.leadId, tabela.organizacaoId],
      foreignColumns: [leads.id, leads.organizacaoId],
    }).onDelete("cascade"),
    index("campanha_leads_lead_idx").on(tabela.organizacaoId, tabela.leadId),
  ],
);

export type Campanha = typeof campanhas.$inferSelect;
