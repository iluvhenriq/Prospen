import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { baseCnpjEmpresas, baseCnpjEstabelecimentos } from "@/db/schema";
import { importarEstado } from "@/modules/base-cnpj/importacao";
import { repositorioBaseCnpj } from "@/modules/base-cnpj/repositorio";
import { criarAmbienteDeTeste, type AmbienteDeTeste } from "./ajuda/banco-teste";

// Monta arquivos no formato da Receita (CSV em latin-1, ";", aspas, dentro de
// .zip) com dados fictícios, e importa no banco em memória.
// Usa o "tar" do sistema para criar os .zip (o do Windows 10 e 11 cria zip).

function linha(campos: string[]): string {
  return campos.map((c) => `"${c}"`).join(";");
}

function estabelecimento(cnpj: string, situacao: string, uf: string, municipio: string, nome: string): string {
  return linha([
    cnpj.slice(0, 8), cnpj.slice(8, 12), cnpj.slice(12), "1", nome, situacao, "20200101", "00", "", "",
    "20100510", "5611201", "", "RUA", "TESTE", "1", "", "CENTRO", "01001000", uf, municipio,
    "11", "33334444", "", "", "", "", "contato@exemplo.com.br", "", "",
  ]);
}

function criarZip(pasta: string, nomeZip: string, conteudo: string): void {
  const nomeCsv = nomeZip.replace(/\.zip$/, ".CSV");
  writeFileSync(join(pasta, nomeCsv), Buffer.from(`${conteudo}\n`, "latin1"));
  execFileSync("tar", ["-a", "-c", "-f", join(pasta, nomeZip), "-C", pasta, nomeCsv]);
  rmSync(join(pasta, nomeCsv));
}

describe("importação da base pública de CNPJ", () => {
  let amb: AmbienteDeTeste;
  let pasta: string;
  let indicesDaMigracao: string[];

  const indicesAtuais = async () => {
    const indices = await amb.db.execute(
      sql`select indexdef from pg_indexes where tablename = 'base_cnpj_estabelecimentos' order by indexname`,
    );
    return indices.rows.map((linha) => String(linha.indexdef).replace(/ USING btree/, ""));
  };

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    // Antes de qualquer carga: exatamente o que as migrações criaram.
    indicesDaMigracao = await indicesAtuais();
    pasta = mkdtempSync(join(tmpdir(), "prospen-cnpj-"));
    criarZip(
      pasta,
      "Estabelecimentos0.zip",
      [
        estabelecimento("11222333000181", "02", "SP", "7107", "PADARIA SÃO JOÃO"), // ativo, SP: entra
        estabelecimento("11444777000161", "08", "SP", "7107", "BAIXADA"), // baixada: fica fora
        estabelecimento("22333444000100", "02", "RJ", "6001", "OFICINA RIO"), // outro estado: fica fora
        estabelecimento("11222333000182", "02", "SP", "7107", "CNPJ ERRADO"), // verificador errado
        // Linha quebrada que passa pelo filtro de UF e precisa ser recusada depois.
        linha(["SP", "quebrada"]),
      ].join("\n"),
    );
    criarZip(
      pasta,
      "Estabelecimentos1.zip",
      // CNPJ alfanumérico, com a situação escrita "2" em vez de "02".
      estabelecimento("12ABC34501DE35", "2", "SP", "7107", "FILIAL SP"),
    );
    criarZip(
      pasta,
      "Empresas0.zip",
      [
        linha(["11222333", "PADARIA SÃO JOÃO LTDA", "2062", "49", "1000,00", "01", ""]),
        linha(["11444777", "EMPRESA BAIXADA LTDA", "2062", "49", "1000,00", "01", ""]),
        linha(["12ABC345", "OFICINA MODELO LTDA", "2062", "49", "1000,00", "03", ""]),
      ].join("\n"),
    );
    criarZip(pasta, "Municipios.zip", [linha(["7107", "SAO PAULO"]), linha(["6001", "RIO DE JANEIRO"])].join("\n"));
  });

  afterAll(async () => {
    await amb.encerrar();
    rmSync(pasta, { recursive: true, force: true });
  });

  it("carrega só os estabelecimentos ativos do estado, com acento e município", async () => {
    const resumo = await importarEstado({
      repositorio: repositorioBaseCnpj(amb.db),
      pasta,
      mes: "2026-10",
      uf: "SP",
    });

    expect(resumo).toMatchObject({
      // Só as linhas que mencionam "SP" chegam a ser lidas (a do RJ é pulada antes).
      estabelecimentosLidos: 5,
      linhasForaDoFormato: 1,
      cnpjsInvalidos: 1,
      ativosDoEstado: 2,
      gravados: 2,
      empresasGravadas: 2,
    });

    const linhas = await amb.db.select().from(baseCnpjEstabelecimentos).orderBy(baseCnpjEstabelecimentos.cnpj);
    expect(linhas.map((l) => [l.cnpj, l.nomeFantasia, l.municipioNome])).toEqual([
      ["11222333000181", "PADARIA SÃO JOÃO", "SAO PAULO"],
      ["12ABC34501DE35", "FILIAL SP", "SAO PAULO"],
    ]);
    expect(linhas[0]).toMatchObject({ telefone1: "1133334444", email: "contato@exemplo.com.br", uf: "SP" });

    const empresas = await amb.db.select().from(baseCnpjEmpresas).orderBy(baseCnpjEmpresas.cnpjBasico);
    // A empresa baixada não entra: não tem estabelecimento ativo em SP.
    expect(empresas.map((e) => e.razaoSocial)).toEqual(["PADARIA SÃO JOÃO LTDA", "OFICINA MODELO LTDA"]);
  });

  it("importar de novo substitui o estado, sem duplicar", async () => {
    const resumo = await importarEstado({
      repositorio: repositorioBaseCnpj(amb.db),
      pasta,
      mes: "2026-10",
      uf: "SP",
    });
    expect(resumo.apagadosAntes).toBe(2);
    expect(await repositorioBaseCnpj(amb.db).contarEstabelecimentos("SP")).toBe(2);
    expect(await amb.db.$count(baseCnpjEmpresas)).toBe(2);
  });

  it("recria os índices de busca depois da carga, iguais aos da migração", async () => {
    // Diferença como "DESC" contra "DESC NULLS LAST" faz o PostgreSQL deixar de
    // usar o índice para ordenar a busca. Por isso a comparação é com a migração.
    expect(await indicesAtuais()).toEqual(indicesDaMigracao);
    expect(indicesDaMigracao).toEqual([
      "CREATE INDEX base_cnpj_estab_basico_idx ON public.base_cnpj_estabelecimentos (cnpj_basico)",
      "CREATE INDEX base_cnpj_estab_cnae_idx ON public.base_cnpj_estabelecimentos (cnae_principal, uf, pontuacao DESC NULLS LAST, cnpj)",
      "CREATE INDEX base_cnpj_estab_uf_municipio_idx ON public.base_cnpj_estabelecimentos (uf, municipio_codigo, pontuacao DESC NULLS LAST, cnpj)",
      "CREATE INDEX base_cnpj_estab_uf_pontuacao_idx ON public.base_cnpj_estabelecimentos (uf, pontuacao DESC NULLS LAST, cnpj)",
      "CREATE UNIQUE INDEX base_cnpj_estabelecimentos_pkey ON public.base_cnpj_estabelecimentos (cnpj)",
    ]);
  });

  it("calcula a pontuação no fim da carga", async () => {
    const [padaria] = await amb.db
      .select({ pontuacao: baseCnpjEstabelecimentos.pontuacao })
      .from(baseCnpjEstabelecimentos)
      .where(eq(baseCnpjEstabelecimentos.cnpj, "11222333000181"));
    // Telefone 15 + e-mail próprio 25 + matriz 5 + microempresa 5.
    expect(padaria.pontuacao).toBe(50);
  });

  it("avisa quando faltam os arquivos baixados", async () => {
    await expect(
      importarEstado({ repositorio: repositorioBaseCnpj(amb.db), pasta: tmpdir(), mes: "2026-10", uf: "SP" }),
    ).rejects.toThrow("npm run cnpj:baixar");
  });
});
