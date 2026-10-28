import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { organization } from "./auth";

// Plano de cada empresa (decisão de 28/10/2026: Pequeno, Médio e Grande).
// Uma linha por empresa; sem linha, vale o plano padrão (PLANO_PADRAO em
// src/modules/planos/planos.ts). Só muda pelo script `npm run plano:definir`,
// depois de o pagamento ser conferido à mão: nada do navegador mexe aqui.
// Todo acesso passa por src/modules/planos/repositorio.ts.
export const planoEmpresa = pgTable(
  "plano_empresa",
  {
    organizacaoId: text("organizacao_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    plano: text("plano").notNull(),
    // Um dos 20 primeiros clientes: o preço fica travado.
    fundador: boolean("fundador").notNull().default(false),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (tabela) => [check("plano_empresa_plano_valido", sql`${tabela.plano} in ('pequeno', 'medio', 'grande')`)],
);

// Quantas empresas da base pública cada empresa salvou como lead no mês (no
// calendário dela). É um contador, não uma contagem dos leads: apagar um lead
// não devolve a vaga, senão daria para salvar, copiar, apagar e salvar de novo.
export const usoMensal = pgTable(
  "uso_mensal",
  {
    organizacaoId: text("organizacao_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // AAAA-MM
    mes: text("mes").notNull(),
    empresasSalvas: integer("empresas_salvas").notNull().default(0),
  },
  (tabela) => [
    primaryKey({ columns: [tabela.organizacaoId, tabela.mes] }),
    check("uso_mensal_mes_valido", sql`${tabela.mes} ~ '^[0-9]{4}-[0-9]{2}$'`),
    check("uso_mensal_empresas_positivo", sql`${tabela.empresasSalvas} >= 0`),
  ],
);
