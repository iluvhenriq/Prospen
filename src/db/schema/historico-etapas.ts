import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { leads, type EtapaFunil } from "./leads";

// Cada mudança de etapa de um lead no funil. Só registra mudanças: a entrada do
// lead no funil é a data de cadastro dele. Todo acesso passa por
// src/modules/leads/repositorio-historico.ts (leitura) e pelo mudarEtapa do
// repositório de leads (gravação). A chave estrangeira inclui a empresa: o banco
// recusa um registro de uma empresa apontando para o lead de outra.
export const historicoEtapas = pgTable(
  "historico_etapas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizacaoId: text("organizacao_id").notNull(),
    leadId: uuid("lead_id").notNull(),
    etapaAnterior: text("etapa_anterior").$type<EtapaFunil>().notNull(),
    etapaNova: text("etapa_nova").$type<EtapaFunil>().notNull(),
    // Se a pessoa sair do sistema, o registro continua e o autor fica vazio.
    alteradoPorId: text("alterado_por_id").references(() => user.id, {
      onDelete: "set null",
    }),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (tabela) => [
    foreignKey({
      name: "historico_etapas_lead_fk",
      columns: [tabela.leadId, tabela.organizacaoId],
      foreignColumns: [leads.id, leads.organizacaoId],
    }).onDelete("cascade"),
    index("historico_etapas_lead_idx").on(
      tabela.organizacaoId,
      tabela.leadId,
      tabela.criadoEm,
    ),
    check(
      "historico_etapas_valores_validos",
      sql`${tabela.etapaAnterior} in ('novo', 'contatado', 'em_conversa', 'proposta', 'ganho', 'perdido') and ${tabela.etapaNova} in ('novo', 'contatado', 'em_conversa', 'proposta', 'ganho', 'perdido') and ${tabela.etapaAnterior} <> ${tabela.etapaNova}`,
    ),
  ],
);

export type RegistroEtapa = typeof historicoEtapas.$inferSelect;
