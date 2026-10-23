import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

// De onde o lead veio. Cada etapa nova que gera leads acrescenta o seu valor aqui.
export const ORIGENS_LEAD = ["manual", "importacao", "busca_cnpj", "google"] as const;
export type OrigemLead = (typeof ORIGENS_LEAD)[number];

// Etapas do funil de vendas, na ordem em que aparecem no quadro. "ganho" e
// "perdido" encerram o funil, mas o lead pode voltar a qualquer etapa.
export const ETAPAS_FUNIL = [
  "novo",
  "contatado",
  "em_conversa",
  "proposta",
  "ganho",
  "perdido",
] as const;
export type EtapaFunil = (typeof ETAPAS_FUNIL)[number];

// Por que o negócio foi perdido (etapa 7). Lista fechada para dar números no
// painel; detalhes vão numa nota.
export const MOTIVOS_PERDA = [
  "preco",
  "concorrente",
  "sem_resposta",
  "sem_interesse",
  "sem_orcamento",
  "momento",
  "outro",
] as const;
export type MotivoPerda = (typeof MOTIVOS_PERDA)[number];

// Base da lista de leads. A pontuação chega na etapa 6.
// Todo acesso a esta tabela passa por src/modules/leads/repositorio.ts, que
// sempre filtra por organização. Não consulte esta tabela em outro lugar.
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizacaoId: text("organizacao_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    empresa: text("empresa"),
    email: text("email"),
    telefone: text("telefone"),
    // Versões padronizadas do e-mail (minúsculo) e do telefone (só dígitos, sem
    // código do país no Brasil). Servem para achar duplicados. São calculadas
    // pelo repositório sempre que o e-mail ou o telefone mudam.
    emailNormalizado: text("email_normalizado"),
    telefoneNormalizado: text("telefone_normalizado"),
    // CNPJ padronizado (sem pontuação, maiúsculo), só nos leads que vêm da base
    // pública de empresas. Quando existe, é ele que identifica o lead (veja os
    // índices abaixo). Pode ser alfanumérico (regra da Receita desde 07/2026).
    cnpj: text("cnpj"),
    // Cópia de dados da Receita no momento em que o lead veio da base pública
    // (vazios nos outros leads). Servem para a pontuação e para a tela, sem
    // depender da base pública depois.
    porte: text("porte"),
    naturezaJuridica: text("natureza_juridica"),
    dataAbertura: date("data_abertura"),
    matriz: boolean("matriz"),
    cnaePrincipal: text("cnae_principal"),
    origem: text("origem").$type<OrigemLead>().notNull().default("manual"),
    // Código do país com duas letras (ISO 3166-1). Prepara a expansão internacional.
    pais: text("pais").notNull().default("BR"),
    // Etapa atual no funil. Só muda pelo repositório (mudarEtapa), que grava
    // a mudança no histórico na mesma transação.
    etapa: text("etapa").$type<EtapaFunil>().notNull().default("novo"),
    etapaAtualizadaEm: timestamp("etapa_atualizada_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Resultado do funil (etapa 7). Só valem na etapa correspondente: mudar de
    // etapa limpa (repositório, mudarEtapa). O valor fica em centavos, com a
    // moeda da empresa no momento do registro.
    motivoPerda: text("motivo_perda").$type<MotivoPerda>(),
    valorVendaCentavos: bigint("valor_venda_centavos", { mode: "number" }),
    moedaVenda: text("moeda_venda"),
    criadoPorId: text("criado_por_id").references(() => user.id, {
      onDelete: "set null",
    }),
    criadoEm: timestamp("criado_em", { withTimezone: true })
      .notNull()
      .defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (tabela) => [
    // Necessário para as tabelas filhas (etiquetas, notas) amarrarem o lead
    // E a empresa juntos, o que impede ligar dados de empresas diferentes.
    unique("leads_id_organizacao_unico").on(tabela.id, tabela.organizacaoId),
    index("leads_organizacao_criado_idx").on(tabela.organizacaoId, tabela.criadoEm),
    // Colunas do quadro: leads de uma etapa, dos movidos mais recentemente.
    index("leads_organizacao_etapa_idx").on(
      tabela.organizacaoId,
      tabela.etapa,
      tabela.etapaAtualizadaEm,
    ),
    // Regra de duplicados (decidida em 22/10/2026). O banco garante, mesmo se
    // duas pessoas gravarem ao mesmo tempo:
    // - lead com CNPJ: o CNPJ aparece uma vez por empresa;
    // - lead sem CNPJ (manual, planilha): o e-mail e o telefone aparecem uma vez
    //   por empresa, contando só os leads sem CNPJ. Na base de CNPJ, vários
    //   negócios dividem o contato do contador, então ali contato repetido é
    //   permitido.
    uniqueIndex("leads_organizacao_cnpj_unico")
      .on(tabela.organizacaoId, tabela.cnpj)
      .where(sql`${tabela.cnpj} is not null`),
    uniqueIndex("leads_organizacao_email_unico")
      .on(tabela.organizacaoId, tabela.emailNormalizado)
      .where(sql`${tabela.emailNormalizado} is not null and ${tabela.cnpj} is null`),
    uniqueIndex("leads_organizacao_telefone_unico")
      .on(tabela.organizacaoId, tabela.telefoneNormalizado)
      .where(sql`${tabela.telefoneNormalizado} is not null and ${tabela.cnpj} is null`),
    check("leads_cnpj_formato", sql`${tabela.cnpj} ~ '^[0-9A-Z]{12}[0-9]{2}$'`),
    check(
      "leads_origem_valida",
      sql`${tabela.origem} in ('manual', 'importacao', 'busca_cnpj', 'google')`,
    ),
    check(
      "leads_etapa_valida",
      sql`${tabela.etapa} in ('novo', 'contatado', 'em_conversa', 'proposta', 'ganho', 'perdido')`,
    ),
    check("leads_pais_valido", sql`${tabela.pais} ~ '^[A-Z]{2}$'`),
    check(
      "leads_motivo_perda_valido",
      sql`${tabela.motivoPerda} is null or (${tabela.etapa} = 'perdido' and ${tabela.motivoPerda} in ('preco', 'concorrente', 'sem_resposta', 'sem_interesse', 'sem_orcamento', 'momento', 'outro'))`,
    ),
    check(
      "leads_valor_venda_valido",
      sql`${tabela.valorVendaCentavos} is null or (${tabela.etapa} = 'ganho' and ${tabela.valorVendaCentavos} >= 0 and ${tabela.moedaVenda} ~ '^[A-Z]{3}$')`,
    ),
    check("leads_nome_nao_vazio", sql`char_length(btrim(${tabela.nome})) > 0`),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NovoLead = Omit<
  typeof leads.$inferInsert,
  | "id"
  | "organizacaoId"
  | "criadoEm"
  | "atualizadoEm"
  | "criadoPorId"
  | "emailNormalizado"
  | "telefoneNormalizado"
  | "etapa"
  | "etapaAtualizadaEm"
  | "motivoPerda"
  | "valorVendaCentavos"
  | "moedaVenda"
>;
