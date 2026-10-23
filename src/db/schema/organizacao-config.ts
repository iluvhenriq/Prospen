import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization } from "./auth";

// Configuração regional de cada empresa. Existe desde já para a expansão
// internacional não exigir refazer o banco: país, moeda e fuso horário são
// da empresa, nunca fixos no código.
// Todo acesso passa por src/modules/organizacoes/configuracao.ts.
export const organizacaoConfig = pgTable(
  "organizacao_config",
  {
    organizacaoId: text("organizacao_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    // País com duas letras (ISO 3166-1), moeda com três (ISO 4217).
    pais: text("pais").notNull().default("BR"),
    moeda: text("moeda").notNull().default("BRL"),
    // Nome de fuso da base IANA, por exemplo America/Sao_Paulo.
    fusoHorario: text("fuso_horario").notNull().default("America/Sao_Paulo"),
    idioma: text("idioma").notNull().default("pt-BR"),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (tabela) => [
    check("organizacao_config_pais_valido", sql`${tabela.pais} ~ '^[A-Z]{2}$'`),
    check("organizacao_config_moeda_valida", sql`${tabela.moeda} ~ '^[A-Z]{3}$'`),
  ],
);

export type ConfiguracaoOrganizacao = typeof organizacaoConfig.$inferSelect;
