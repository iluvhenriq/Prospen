import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";

// Base pública de CNPJ (dados abertos da Receita Federal), carregada por
// `npm run cnpj:importar`. EXCEÇÃO CONSCIENTE à regra de isolamento: estas
// tabelas não têm organizacao_id porque o dado é público e não pertence a
// nenhum cliente. Elas são só de leitura para as empresas. Quando um negócio
// vira lead, ele é COPIADO para a tabela de leads da empresa, que continua
// isolada. Decidido em 23/10/2026 (veja docs/arquitetura.md).
//
// Só entram estabelecimentos ATIVOS, dos estados importados. Sócios não são
// importados: são dados de pessoas físicas que o produto não precisa.

// Dados da empresa, comuns a todos os seus estabelecimentos (matriz e filiais).
// Só entram as empresas que têm algum estabelecimento importado.
export const baseCnpjEmpresas = pgTable("base_cnpj_empresas", {
  // Oito primeiros caracteres do CNPJ. Pode ter letras (CNPJ alfanumérico).
  cnpjBasico: text("cnpj_basico").primaryKey(),
  razaoSocial: text("razao_social").notNull(),
  // Código da tabela de naturezas jurídicas da Receita (ex.: 2135 = empresário individual).
  naturezaJuridica: text("natureza_juridica"),
  // 00 não informado, 01 microempresa, 03 empresa de pequeno porte, 05 demais.
  porte: text("porte"),
  // Mês da publicação da Receita de onde veio o dado (AAAA-MM).
  mesReferencia: text("mes_referencia").notNull(),
});

// Colunas de um estabelecimento como vêm da Receita. Usadas pela tabela final
// e pela tabela temporária da importação (src/modules/base-cnpj/repositorio.ts),
// que é criada com "like" a partir da final e não entra nas migrações.
export function colunasDoEstabelecimento() {
  return {
    // CNPJ completo e padronizado, igual ao guardado no lead.
    cnpj: text("cnpj").primaryKey(),
    cnpjBasico: text("cnpj_basico").notNull(),
    matriz: boolean("matriz").notNull(),
    nomeFantasia: text("nome_fantasia"),
    dataInicioAtividade: date("data_inicio_atividade"),
    cnaePrincipal: text("cnae_principal").notNull(),
    cnaesSecundarios: text("cnaes_secundarios").array().notNull().default(sql`'{}'`),
    tipoLogradouro: text("tipo_logradouro"),
    logradouro: text("logradouro"),
    numero: text("numero"),
    complemento: text("complemento"),
    bairro: text("bairro"),
    cep: text("cep"),
    uf: text("uf").notNull(),
    // Código de município da Receita (não é o do IBGE).
    municipioCodigo: text("municipio_codigo").notNull(),
    municipioNome: text("municipio_nome"),
    // Telefones já com DDD, só dígitos.
    telefone1: text("telefone_1"),
    telefone2: text("telefone_2"),
    email: text("email"),
    mesReferencia: text("mes_referencia").notNull(),
  };
}

export const baseCnpjEstabelecimentos = pgTable(
  "base_cnpj_estabelecimentos",
  {
    ...colunasDoEstabelecimento(),
    // Pontuação dos dados públicos (src/modules/pontuacao/regras.ts),
    // calculada ao passar da tabela temporária para esta, no fim da importação.
    // A busca mostra os maiores primeiro.
    pontuacao: smallint("pontuacao").notNull().default(0),
  },
  (tabela) => [
    // Buscas: por estado, região e atividade, já na ordem da pontuação (maior
    // primeiro, desempate pelo CNPJ). Mesmos nomes em INDICES_DE_BUSCA, no repositório.
    index("base_cnpj_estab_uf_pontuacao_idx").on(tabela.uf, tabela.pontuacao.desc(), tabela.cnpj),
    index("base_cnpj_estab_uf_municipio_idx").on(
      tabela.uf,
      tabela.municipioCodigo,
      tabela.pontuacao.desc(),
      tabela.cnpj,
    ),
    index("base_cnpj_estab_cnae_idx").on(tabela.cnaePrincipal, tabela.uf, tabela.pontuacao.desc(), tabela.cnpj),
    index("base_cnpj_estab_basico_idx").on(tabela.cnpjBasico),
    check("base_cnpj_estab_cnpj_formato", sql`${tabela.cnpj} ~ '^[0-9A-Z]{12}[0-9]{2}$'`),
    check("base_cnpj_estab_uf_formato", sql`${tabela.uf} ~ '^[A-Z]{2}$'`),
  ],
);

// Tabelas de apoio da busca (etapa 5d). Pequenas, preenchidas pela importação.

// Atividades econômicas (CNAE) com a descrição, para buscar por palavra.
export const baseCnpjCnaes = pgTable("base_cnpj_cnaes", {
  codigo: text("codigo").primaryKey(),
  descricao: text("descricao").notNull(),
});

// Cidades que têm estabelecimento importado, por estado. O arquivo de
// municípios da Receita não diz o estado; ele vem dos estabelecimentos.
export const baseCnpjMunicipios = pgTable(
  "base_cnpj_municipios",
  {
    codigo: text("codigo").primaryKey(),
    nome: text("nome").notNull(),
    uf: text("uf").notNull(),
  },
  (tabela) => [index("base_cnpj_municipios_uf_idx").on(tabela.uf, tabela.nome)],
);

// Estados já carregados e de qual mês. A tela de busca só oferece estes.
export const baseCnpjCargas = pgTable("base_cnpj_cargas", {
  uf: text("uf").primaryKey(),
  mesReferencia: text("mes_referencia").notNull(),
  estabelecimentos: integer("estabelecimentos").notNull(),
  concluidaEm: timestamp("concluida_em", { withTimezone: true }).notNull().defaultNow(),
});

// Lista de exclusão (LGPD, decisão de 23/10/2026): CNPJ que pediu para sair.
// Nunca aparece na busca nem vira lead pela busca, mesmo depois de nova importação.
export const baseCnpjExclusoes = pgTable(
  "base_cnpj_exclusoes",
  {
    cnpj: text("cnpj").primaryKey(),
    pedidoEm: timestamp("pedido_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabela) => [check("base_cnpj_exclusoes_cnpj_formato", sql`${tabela.cnpj} ~ '^[0-9A-Z]{12}[0-9]{2}$'`)],
);

export type EstabelecimentoBase = typeof baseCnpjEstabelecimentos.$inferInsert;
export type EmpresaBase = typeof baseCnpjEmpresas.$inferInsert;
