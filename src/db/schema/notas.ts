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
import { leads } from "./leads";

// Anotações de cada lead. Todo acesso passa por src/modules/leads/repositorio-notas.ts.
// A chave estrangeira inclui a empresa: o banco recusa uma nota de uma empresa
// apontando para o lead de outra.
export const notas = pgTable(
  "notas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizacaoId: text("organizacao_id").notNull(),
    leadId: uuid("lead_id").notNull(),
    texto: text("texto").notNull(),
    // Se a pessoa sair do sistema, a nota continua e o autor fica vazio.
    autorId: text("autor_id").references(() => user.id, { onDelete: "set null" }),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (tabela) => [
    foreignKey({
      name: "notas_lead_fk",
      columns: [tabela.leadId, tabela.organizacaoId],
      foreignColumns: [leads.id, leads.organizacaoId],
    }).onDelete("cascade"),
    index("notas_lead_idx").on(tabela.organizacaoId, tabela.leadId, tabela.criadoEm),
    check(
      "notas_texto_valido",
      sql`char_length(btrim(${tabela.texto})) between 1 and 2000`,
    ),
  ],
);

export type Nota = typeof notas.$inferSelect;
