import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

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
  const TABELAS_DE_LEADS = ["leads", "etiquetas", "leadEtiquetas", "notas", "importacoes"];
  const ARQUIVOS_DE_TABELA = ["leads", "etiquetas", "notas", "importacoes"];

  it("só os repositórios e a pasta do banco usam as tabelas de leads, etiquetas, notas e importações", () => {
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
