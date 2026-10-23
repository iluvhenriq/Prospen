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
    "historicoEtapas",
    "importacoes",
  ];
  const ARQUIVOS_DE_TABELA = ["leads", "etiquetas", "notas", "historico-etapas", "importacoes"];

  it("só os repositórios e a pasta do banco usam as tabelas de leads, etiquetas, notas, histórico e importações", () => {
    const permitido = (f: string) =>
      f.startsWith("src/modules/leads/") || f.startsWith("src/db/");

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

  it("nenhum arquivo da interface importa a chave secreta do login", () => {
    const infratores = todos.filter((arquivo) => {
      const conteudo = readFileSync(arquivo, "utf8");
      if (!/^\s*["']use client["']/m.test(conteudo)) return false;
      return /AUTH_SECRET|lerEnvLogin|@\/lib\/auth["']/.test(conteudo);
    });

    expect(infratores.map(caminho)).toEqual([]);
  });
});
