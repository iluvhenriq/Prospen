import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { leads } from "./leads";

// Por onde o vendedor tentou falar com o lead.
export const CANAIS_CONTATO = ["ligacao", "whatsapp", "email", "visita"] as const;
export type CanalContato = (typeof CANAIS_CONTATO)[number];

// O que aconteceu na tentativa. Lista fechada para contar tentativas e, mais
// tarde, aprender com elas; detalhes vão numa nota.
export const RESULTADOS_CONTATO = [
  "conversou",
  "nao_atendeu",
  "pediu_retorno",
  "pediu_proposta",
  "sem_interesse",
  "contato_errado",
] as const;
export type ResultadoContato = (typeof RESULTADOS_CONTATO)[number];

// Registro de cada tentativa de contato com um lead (27/10/2026). Todo acesso
// passa por src/modules/leads/repositorio-contatos.ts. A chave estrangeira
// inclui a empresa: o banco recusa um contato de uma empresa apontando para o
// lead de outra.
export const contatos = pgTable(
  "contatos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizacaoId: text("organizacao_id").notNull(),
    leadId: uuid("lead_id").notNull(),
    canal: text("canal").$type<CanalContato>().notNull(),
    resultado: text("resultado").$type<ResultadoContato>().notNull(),
    // Se a pessoa sair do sistema, o registro continua e o autor fica vazio.
    autorId: text("autor_id").references(() => user.id, { onDelete: "set null" }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [
    foreignKey({
      name: "contatos_lead_fk",
      columns: [tabela.leadId, tabela.organizacaoId],
      foreignColumns: [leads.id, leads.organizacaoId],
    }).onDelete("cascade"),
    index("contatos_lead_idx").on(tabela.organizacaoId, tabela.leadId, tabela.criadoEm),
    check("contatos_canal_valido", sql`${tabela.canal} in ('ligacao', 'whatsapp', 'email', 'visita')`),
    check(
      "contatos_resultado_valido",
      sql`${tabela.resultado} in ('conversou', 'nao_atendeu', 'pediu_retorno', 'pediu_proposta', 'sem_interesse', 'contato_errado')`,
    ),
  ],
);

export type Contato = typeof contatos.$inferSelect;
