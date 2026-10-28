import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

// Cliente ideal de cada empresa (etapa 9f, 28/10/2026): ajusta a nota dos
// leads dela. Uma linha por empresa; sem linha, vale a nota geral.
// Todo acesso passa por src/modules/pontuacao/repositorio-cliente-ideal.ts.
export const clienteIdeal = pgTable(
  "cliente_ideal",
  {
    organizacaoId: text("organizacao_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Códigos de porte da Receita que a empresa atende ("01", "03", "05"). Vazio: qualquer.
    portes: text("portes").array().notNull().default(sql`'{}'::text[]`),
    idade: text("idade").notNull().default("novas"),
    aceitaMei: boolean("aceita_mei").notNull().default(false),
    atualizadoPorId: text("atualizado_por_id").references(() => user.id, { onDelete: "set null" }),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (tabela) => [
    check("cliente_ideal_idade_valida", sql`${tabela.idade} in ('novas', 'estabelecidas', 'tanto_faz')`),
    check("cliente_ideal_portes_validos", sql`${tabela.portes} <@ array['01', '03', '05']::text[]`),
  ],
);

export type ClienteIdealGravado = typeof clienteIdeal.$inferSelect;
