import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// Pré-cadastro da página de apresentação (pré-venda, decisão de 24/10/2026):
// quem quer ser avisado quando o PROSPEN abrir. Só o mínimo: nome, e-mail e,
// se a pessoa quiser, a empresa. Não pertence a nenhuma empresa cliente
// (exceção declarada em tests/arquitetura.test.ts).
// Todo acesso passa por src/modules/pre-cadastro/repositorio.ts.
export const preCadastros = pgTable(
  "pre_cadastros",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    // Guardado em minúsculas: o mesmo e-mail não entra duas vezes.
    email: text("email").notNull(),
    empresa: text("empresa"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [
    uniqueIndex("pre_cadastros_email_unico").on(tabela.email),
    check("pre_cadastros_nome_valido", sql`char_length(btrim(${tabela.nome})) between 1 and 80`),
    check("pre_cadastros_email_minusculo", sql`${tabela.email} = lower(${tabela.email}) and char_length(${tabela.email}) <= 254`),
    check("pre_cadastros_empresa_valida", sql`${tabela.empresa} is null or char_length(${tabela.empresa}) <= 120`),
  ],
);

export type PreCadastro = typeof preCadastros.$inferSelect;
