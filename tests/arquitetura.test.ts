import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "@/db/schema";

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

const todos = arquivos("src").filter((f) => /\.(ts|tsx)$/.test(f));
const caminho = (f: string) => relative(".", f).split(sep).join("/");

// Guarda de arquitetura: o isolamento entre empresas depende de TODO acesso
// às tabelas de dados da empresa passar pelo repositório. Este teste falha se
// alguém consultar uma delas por outro caminho.
describe("arquitetura", () => {
  // Tabelas que guardam dados de uma empresa e têm repositório próprio.
  const TABELAS_DE_LEADS = [
    "leads",
    "etiquetas",
    "leadEtiquetas",
    "notas",
    "contatos",
    "historicoEtapas",
    "importacoes",
    "campanhas",
    "campanhaLeads",
    "buscasVigiadas",
  ];
  const ARQUIVOS_DE_TABELA = [
    "leads",
    "etiquetas",
    "notas",
    "contatos",
    "historico-etapas",
    "importacoes",
    "campanhas",
    "buscas-vigiadas",
  ];

  it("só os repositórios e a pasta do banco usam as tabelas de leads, etiquetas, notas, histórico, importações, campanhas e buscas vigiadas", () => {
    // O repositório de campanhas lê os leads para contar os resultados de cada
    // campanha; só ele, e não a pasta inteira de campanhas. As buscas vigiadas
    // têm o repositório delas na pasta da base pública.
    const permitido = (f: string) =>
      f.startsWith("src/modules/leads/") ||
      f === "src/modules/campanhas/repositorio.ts" ||
      f === "src/modules/base-cnpj/repositorio-buscas-vigiadas.ts" ||
      f.startsWith("src/db/");

    const infratores = todos.filter((arquivo) => {
      const nome = caminho(arquivo);
      if (permitido(nome)) return false;
      const conteudo = readFileSync(arquivo, "utf8");
      const nomes = TABELAS_DE_LEADS.join("|");
      const importaTabela = new RegExp(
        `import\\s*\\{[^}]*\\b(${nomes})\\b[^}]*\\}\\s*from\\s*["']@/db/schema`,
      ).test(conteudo);
      const importaArquivo = new RegExp(
        `from\\s*["']@/db/schema/(${ARQUIVOS_DE_TABELA.join("|")})["']`,
      ).test(conteudo);
      const usaPeloNome = new RegExp(`\\bschema\\.(${nomes})\\b`).test(conteudo);
      return importaTabela || importaArquivo || usaPeloNome;
    });

    expect(infratores.map(caminho)).toEqual([]);
  });

  it("cada tabela de dados da empresa tem a coluna organizacao_id", () => {
    for (const arquivo of ARQUIVOS_DE_TABELA) {
      const conteudo = readFileSync(`src/db/schema/${arquivo}.ts`, "utf8");
      expect(conteudo, `src/db/schema/${arquivo}.ts`).toMatch(/organizacao_id/);
    }
  });

  it("toda tabela tem organizacao_id, menos as exceções declaradas aqui", () => {
    // Cada exceção precisa de motivo. Tabela nova sem organizacao_id faz este
    // teste falhar até alguém decidir, de propósito, que ela é uma exceção.
    const EXCECOES: Record<string, string> = {
      user: "login (Better Auth): a pessoa existe antes de ter empresa",
      session: "login (Better Auth)",
      account: "login (Better Auth)",
      verification: "login (Better Auth)",
      organization: "é a própria empresa",
      member: "login (Better Auth): liga pessoa e empresa pela coluna organization_id",
      invitation: "login (Better Auth): convite para a empresa, coluna organization_id",
      base_cnpj_empresas: "base pública da Receita, só leitura (decisão de 23/10/2026)",
      base_cnpj_estabelecimentos: "base pública da Receita, só leitura (decisão de 23/10/2026)",
      base_cnpj_cnaes: "tabela pública de atividades da Receita, só leitura",
      base_cnpj_municipios: "cidades da base pública, só leitura",
      base_cnpj_cargas: "registro dos estados carregados da base pública",
      base_cnpj_exclusoes: "LGPD: CNPJs que pediram para sair da base pública, vale para todas as empresas",
      base_cnpj_sinais: "Radar: mudanças da base pública entre um mês e outro, iguais para todas as empresas",
      pre_cadastros: "pré-venda: interessados que ainda não são clientes nem têm empresa no sistema",
      registros_acesso: "Marco Civil, art. 15: acesso de cada pessoa à aplicação, guardado mesmo se a conta for apagada",
    };
    const tabelas = Object.values(schema)
      .filter((valor) => is(valor, PgTable))
      .map((tabela) => getTableConfig(tabela as PgTable));
    // Garante que o teste está mesmo enxergando as tabelas (hoje são 16).
    expect(tabelas.length).toBeGreaterThanOrEqual(16);
    expect(tabelas.map((t) => t.name)).toContain("leads");

    const semEmpresa = tabelas
      .filter((config) => !config.columns.some((coluna) => coluna.name === "organizacao_id"))
      .map((config) => config.name)
      .filter((nome) => !(nome in EXCECOES));

    expect(semEmpresa).toEqual([]);
  });

  it("telas e componentes não acessam o banco direto", () => {
    const infratores = todos.filter((arquivo) => {
      const nome = caminho(arquivo);
      if (!nome.startsWith("src/app/") && !nome.startsWith("src/components/")) return false;
      // A rota de saúde existe justamente para conferir o banco.
      if (nome === "src/app/api/saude/route.ts") return false;
      const conteudo = readFileSync(arquivo, "utf8");
      return /from\s*["']@\/db\/(client|schema)/.test(conteudo);
    });

    expect(infratores.map(caminho)).toEqual([]);
  });

  it("toda ação do servidor começa conferindo a permissão, menos as públicas declaradas aqui", () => {
    // Cada ação pública precisa de motivo. Ação nova que não comece por
    // exigirPermissao faz este teste falhar até alguém decidir, de propósito.
    const PUBLICAS: Record<string, string> = {
      cadastrar: "criar conta: a pessoa ainda não existe",
      entrar: "login",
      sair: "encerra a própria sessão",
      criarOrganizacao: "a pessoa ainda não tem empresa; começa por exigirUsuario",
      pedirRemocaoDosDados: "LGPD: o titular não tem conta; só mexe na lista de exclusão da base pública",
      enviarPreCadastro: "pré-venda: o interessado ainda não tem conta; só grava na lista de pré-cadastro",
      aceitarConvite: "a pessoa ainda não tem empresa; começa por exigirUsuario e o login confere o e-mail do convite",
    };
    const acoes = todos.filter((arquivo) => /^\s*["']use server["']/m.test(readFileSync(arquivo, "utf8")));
    // Garante que o teste está mesmo enxergando as ações (hoje são 6 arquivos).
    expect(acoes.length).toBeGreaterThanOrEqual(6);

    const infratores: string[] = [];
    let conferidas = 0;
    for (const arquivo of acoes) {
      const conteudo = readFileSync(arquivo, "utf8");
      for (const [, nome, corpo] of conteudo.matchAll(/export async function (\w+)\([\s\S]*?\{\r?\n([\s\S]*?)\r?\n\}/g)) {
        conferidas += 1;
        if (nome in PUBLICAS) continue;
        // A primeira linha do corpo precisa ser a checagem de permissão.
        if (!/^\s*const \w+ = await exigirPermissao\(/.test(corpo)) infratores.push(`${caminho(arquivo)}: ${nome}`);
      }
    }
    // Hoje são 27 ações; menos que isso indica que a leitura dos arquivos quebrou.
    expect(conferidas).toBeGreaterThanOrEqual(27);
    expect(infratores).toEqual([]);
  });

  it("toda rota dentro de /painel começa conferindo a permissão", () => {
    // Rotas (route.ts) não são ações do servidor, mas entregam dados do mesmo
    // jeito (a exportação em CSV, por exemplo).
    const rotas = todos.filter((arquivo) => /^src\/app\/painel\/.*route\.ts$/.test(caminho(arquivo)));
    expect(rotas.length).toBeGreaterThanOrEqual(1);
    const infratores = rotas.filter((arquivo) => {
      const conteudo = readFileSync(arquivo, "utf8");
      const metodos = [...conteudo.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\([\s\S]*?\{\r?\n([\s\S]*?)\r?\n\}/g)];
      return metodos.length === 0 || metodos.some(([, , corpo]) => !/^\s*(try \{\s*)?const \w+ = await exigirPermissao\(/.test(corpo));
    });
    expect(infratores.map(caminho)).toEqual([]);
  });

  it("nenhum arquivo da interface importa a chave secreta do login", () => {
    const infratores = todos.filter((arquivo) => {
      const conteudo = readFileSync(arquivo, "utf8");
      if (!/^\s*["']use client["']/m.test(conteudo)) return false;
      return /AUTH_SECRET|lerEnvLogin|@\/lib\/auth["']/.test(conteudo);
    });

    expect(infratores.map(caminho)).toEqual([]);
  });
});
