import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// Perguntas opcionais do pré-cadastro (27/10/2026), para decidir o que
// construir com dado e não com achismo. Nada disto está pronto: o formulário diz.
export const SEGMENTOS_PRE_CADASTRO = [
  "agencia",
  "contabilidade",
  "fornecedor",
  "servicos",
  "representante",
  "outro",
] as const;
export type SegmentoPreCadastro = (typeof SEGMENTOS_PRE_CADASTRO)[number];

export const INTERESSES_PRE_CADASTRO = ["sinais", "necessidades", "mapa", "perfil", "dossie"] as const;
export type InteressePreCadastro = (typeof INTERESSES_PRE_CADASTRO)[number];

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
    // Respostas opcionais: o que a empresa vende e o que mais ajudaria.
    segmento: text("segmento").$type<SegmentoPreCadastro>(),
    interesses: text("interesses").array().$type<InteressePreCadastro[]>().notNull().default(sql`'{}'::text[]`),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [
    uniqueIndex("pre_cadastros_email_unico").on(tabela.email),
    check("pre_cadastros_nome_valido", sql`char_length(btrim(${tabela.nome})) between 1 and 80`),
    check("pre_cadastros_email_minusculo", sql`${tabela.email} = lower(${tabela.email}) and char_length(${tabela.email}) <= 254`),
    check("pre_cadastros_empresa_valida", sql`${tabela.empresa} is null or char_length(${tabela.empresa}) <= 120`),
    check(
      "pre_cadastros_segmento_valido",
      sql`${tabela.segmento} is null or ${tabela.segmento} in ('agencia', 'contabilidade', 'fornecedor', 'servicos', 'representante', 'outro')`,
    ),
    check(
      "pre_cadastros_interesses_validos",
      sql`${tabela.interesses} <@ array['sinais', 'necessidades', 'mapa', 'perfil', 'dossie']::text[]`,
    ),
  ],
);

export type PreCadastro = typeof preCadastros.$inferSelect;
