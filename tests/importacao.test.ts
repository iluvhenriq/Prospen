import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LIMITE_BYTES, LIMITE_LINHAS, LIMITE_OCORRENCIAS } from "@/modules/leads/csv";
import {
  analisarCsv,
  executarImportacao,
  limparNomeDoArquivo,
  type AnaliseImportacao,
} from "@/modules/leads/importacao";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { repositorioImportacoes } from "@/modules/leads/repositorio-importacoes";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

const bytes = (texto: string) => new TextEncoder().encode(texto);

function aceitar(analise: Awaited<ReturnType<typeof analisarCsv>>): AnaliseImportacao {
  if (!analise.ok) throw new Error(`Análise recusada: ${analise.erro}`);
  return analise;
}

const PLANILHA = [
  "Nome;Empresa;E-mail;Celular;Cidade",
  "Ana Souza;Studio Ana;ana@teste.com;(11) 99999-0001;Santos",
  "Bia Lima;;bia@teste.com;;Recife",
  ";Sem nome;sem-nome@teste.com;;",
  "Caio Dias;;email-quebrado;;",
  "Ana de novo;;ANA@teste.com;;",
  "Duda Reis;;;+55 11 99999-0001;",
  "Eva Melo;;eva@teste.com;(21) 3333-4444;Rio",
].join("\n");

describe("importação de planilha CSV", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let empresaA: string;
  let empresaB: string;

  const leadsA = () => repositorioLeads(amb.db, empresaA);
  const leadsB = () => repositorioLeads(amb.db, empresaB);

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    ana = await cadastrarPessoa(amb, "Ana", "ana@empresa-a.com.br");
    bruno = await cadastrarPessoa(amb, "Bruno", "bruno@empresa-b.com.br");
    empresaA = await criarEmpresa(amb, ana, "Empresa A", "empresa-a");
    empresaB = await criarEmpresa(amb, bruno, "Empresa B", "empresa-b");
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  describe("arquivos que não podem ser importados", () => {
    const analisar = (conteudo: Uint8Array, nome = "leads.csv") =>
      analisarCsv(leadsA(), conteudo, nome, "BR");

    it("arquivo vazio", async () => {
      expect(await analisar(new Uint8Array())).toEqual({ ok: false, erro: "O arquivo está vazio." });
    });

    it("arquivo maior que o limite", async () => {
      const resultado = await analisar(new Uint8Array(LIMITE_BYTES + 1).fill(97));
      expect(!resultado.ok && resultado.erro).toMatch(/grande demais/);
    });

    it("planilha do Excel (xlsx) e PDF, com orientação de como salvar", async () => {
      const xlsx = await analisar(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]), "leads.csv");
      expect(!xlsx.ok && xlsx.erro).toMatch(/Salvar como, CSV/);
      const pdf = await analisar(bytes("%PDF-1.7 conteudo"));
      expect(!pdf.ok && pdf.erro).toMatch(/não é um CSV/);
    });

    it("só linhas em branco", async () => {
      const resultado = await analisar(bytes("\n \n\t\n"));
      expect(!resultado.ok && resultado.erro).toBe("O arquivo não tem nenhum dado.");
    });

    it("sem coluna de nome", async () => {
      const resultado = await analisar(bytes("Email,Telefone\na@a.com,11999990000"));
      expect(!resultado.ok && resultado.erro).toMatch(/coluna com o nome/);
    });

    it("só a linha de títulos", async () => {
      const resultado = await analisar(bytes("Nome,Email"));
      expect(!resultado.ok && resultado.erro).toMatch(/só a linha de títulos/);
    });

    it("mais linhas que o limite", async () => {
      const linhas = ["Nome", ...Array.from({ length: LIMITE_LINHAS + 1 }, (_, i) => `Lead ${i}`)];
      const resultado = await analisar(bytes(linhas.join("\n")));
      expect(!resultado.ok && resultado.erro).toMatch(/5\.000/);
    });

    it("aspas sem fechar", async () => {
      const resultado = await analisar(bytes('Nome,Email\n"Ana,a@a.com'));
      expect(!resultado.ok && resultado.erro).toMatch(/aspas/);
    });
  });

  describe("conferência (não grava nada)", () => {
    it("classifica cada linha e reconhece as colunas", async () => {
      const analise = aceitar(await analisarCsv(leadsA(), bytes(PLANILHA), "leads.csv", "BR"));

      expect(analise.totalLinhas).toBe(7);
      expect(analise.aceitas.map((l) => l.nome)).toEqual(["Ana Souza", "Bia Lima", "Eva Melo"]);
      expect(analise.rejeitadas).toBe(2); // sem nome, e-mail quebrado
      expect(analise.duplicadas).toBe(2); // e-mail repetido, telefone repetido
      expect(analise.aceitas.length + analise.rejeitadas + analise.duplicadas).toBe(analise.totalLinhas);
      expect(analise.colunas).toMatchObject({
        nome: "Nome",
        empresa: "Empresa",
        email: "E-mail",
        telefone: "Celular",
        ignoradas: ["Cidade"],
      });
      expect(analise.ocorrencias.map((o) => [o.linha, o.tipo])).toEqual([
        [4, "rejeitada"],
        [5, "rejeitada"],
        [6, "duplicada"],
        [7, "duplicada"],
      ]);
    });

    it("não grava nada", async () => {
      const antes = await leadsA().contar();
      aceitar(await analisarCsv(leadsA(), bytes(PLANILHA), "leads.csv", "BR"));
      expect(await leadsA().contar()).toBe(antes);
      expect(await repositorioImportacoes(amb.db, empresaA).listarRecentes()).toEqual([]);
    });

    it("entende a planilha salva em Windows-1252 (ANSI)", async () => {
      const ansi = new Uint8Array(Buffer.from("Nome;Email\nJoão Conceição;joao@ansi.com\n", "latin1"));
      const analise = aceitar(await analisarCsv(leadsA(), ansi, "ansi.csv", "BR"));
      expect(analise.aceitas.map((l) => l.nome)).toEqual(["João Conceição"]);
    });

    it("sem coluna de nome, usa a empresa como nome do lead", async () => {
      const analise = aceitar(
        await analisarCsv(leadsA(), bytes("Razão Social,Telefone\nLoja Azul,(11) 98888-0000"), "x.csv", "BR"),
      );
      expect(analise.aceitas[0]).toMatchObject({ nome: "Loja Azul", empresa: null });
      expect(analise.colunas.nomeVemDaEmpresa).toBe(true);
    });

    it("avisa quando a planilha não tem nenhum contato", async () => {
      const analise = aceitar(await analisarCsv(leadsA(), bytes("Nome\nZé\nMaria"), "x.csv", "BR"));
      expect(analise.avisos).toHaveLength(1);
      expect(analise.aceitas).toHaveLength(2);
    });

    it("mostra só as primeiras ocorrências, mas conta todas", async () => {
      const total = LIMITE_OCORRENCIAS + 100;
      const linhas = ["Nome,Email", ...Array.from({ length: total }, (_, i) => `Lead ${i},invalido`)];
      const analise = aceitar(await analisarCsv(leadsA(), bytes(linhas.join("\n")), "x.csv", "BR"));
      expect(analise.rejeitadas).toBe(total);
      expect(analise.ocorrencias).toHaveLength(LIMITE_OCORRENCIAS);
      expect(analise.ocorrenciasOmitidas).toBe(100);
    });

    it("os motivos guardados nunca carregam o conteúdo da planilha", async () => {
      const analise = aceitar(
        await analisarCsv(
          leadsA(),
          bytes("Nome,Email,Telefone\nCláudio Segredo,email-ruim,11977776666"),
          "x.csv",
          "BR",
        ),
      );
      const texto = JSON.stringify(analise.ocorrencias);
      expect(texto).not.toMatch(/Segredo|email-ruim|11977776666/);
    });
  });

  describe("gravação", () => {
    it("grava só as aceitas, marca a origem e registra o histórico", async () => {
      const analise = aceitar(await analisarCsv(leadsA(), bytes(PLANILHA), "C:\\fakepath\\leads.csv", "BR"));
      const resumo = await executarImportacao(amb.db, empresaA, ana.id, analise);

      expect(resumo).toEqual({ totalLinhas: 7, aceitas: 3, duplicadas: 2, rejeitadas: 2 });
      const lista = await leadsA().listar();
      expect(lista.map((l) => l.nome).sort()).toEqual(["Ana Souza", "Bia Lima", "Eva Melo"]);
      expect(lista.every((l) => l.origem === "importacao" && l.criadoPorId === ana.id)).toBe(true);
      expect(lista.find((l) => l.nome === "Eva Melo")?.telefoneNormalizado).toBe("2133334444");

      const [historico] = await repositorioImportacoes(amb.db, empresaA).listarRecentes();
      expect(historico).toMatchObject({
        nomeArquivo: "leads.csv",
        totalLinhas: 7,
        aceitas: 3,
        duplicadas: 2,
        rejeitadas: 2,
        criadaPorId: ana.id,
      });
      expect(historico.ocorrencias).toHaveLength(4);
    });

    it("importar a mesma planilha de novo não cria nada: tudo vira repetido", async () => {
      const antes = await leadsA().contar();
      const analise = aceitar(await analisarCsv(leadsA(), bytes(PLANILHA), "leads.csv", "BR"));
      expect(analise.aceitas).toHaveLength(0);
      expect(analise.duplicadas).toBe(5);
      const resumo = await executarImportacao(amb.db, empresaA, ana.id, analise);
      expect(resumo).toMatchObject({ aceitas: 0, duplicadas: 5, rejeitadas: 2 });
      expect(await leadsA().contar()).toBe(antes);
    });

    it("a outra empresa importa a mesma planilha sem ser afetada pela primeira", async () => {
      const analise = aceitar(await analisarCsv(leadsB(), bytes(PLANILHA), "leads.csv", "BR"));
      expect(analise.aceitas).toHaveLength(3);
      await executarImportacao(amb.db, empresaB, bruno.id, analise);

      expect(await leadsB().contar()).toBe(3);
      expect(await leadsA().contar()).toBe(3);
      expect((await leadsB().listar()).every((l) => l.organizacaoId === empresaB)).toBe(true);
      expect(await repositorioImportacoes(amb.db, empresaB).listarRecentes()).toHaveLength(1);
    });

    it("se alguém cadastra o mesmo contato entre a conferência e a gravação, vira repetido", async () => {
      const csv = "Nome,Email\nNova 1,nova1@teste.com\nNova 2,nova2@teste.com\nNova 3,nova3@teste.com";
      const analise = aceitar(await analisarCsv(leadsA(), bytes(csv), "x.csv", "BR"));
      expect(analise.aceitas).toHaveLength(3);

      await leadsA().criar({ nome: "Chegou antes", email: "NOVA2@teste.com" }, ana.id);
      const resumo = await executarImportacao(amb.db, empresaA, ana.id, analise);

      expect(resumo).toEqual({ totalLinhas: 3, aceitas: 2, duplicadas: 1, rejeitadas: 0 });
      expect(resumo.aceitas + resumo.duplicadas + resumo.rejeitadas).toBe(resumo.totalLinhas);
      expect(await leadsA().contar({ busca: "nova" })).toBe(3);
    });

    it("se a gravação falha no meio, nada fica pela metade", async () => {
      const antes = await leadsA().contar();
      const historicoAntes = (await repositorioImportacoes(amb.db, empresaA).listarRecentes(50)).length;
      const analiseRuim: AnaliseImportacao = {
        ok: true,
        nomeArquivo: "ruim.csv",
        totalLinhas: 2,
        aceitas: [
          { nome: "Válido", empresa: null, email: "valido-atomico@teste.com", telefone: null, pais: "BR" },
          // O banco recusa nome vazio: a transação inteira precisa voltar atrás.
          { nome: "   ", empresa: null, email: null, telefone: null, pais: "BR" },
        ],
        duplicadas: 0,
        rejeitadas: 0,
        ocorrencias: [],
        ocorrenciasOmitidas: 0,
        colunas: { nome: "Nome", empresa: null, email: null, telefone: null, nomeVemDaEmpresa: false, ignoradas: [] },
        avisos: [],
      };

      await expect(executarImportacao(amb.db, empresaA, ana.id, analiseRuim)).rejects.toThrow();
      expect(await leadsA().contar()).toBe(antes);
      expect(await leadsA().contar({ busca: "valido-atomico" })).toBe(0);
      expect((await repositorioImportacoes(amb.db, empresaA).listarRecentes(50)).length).toBe(historicoAntes);
    });

    it("importa as 5.000 linhas do limite em tempo razoável", async () => {
      const linhas = [
        "Nome,Email,Telefone",
        ...Array.from(
          { length: LIMITE_LINHAS },
          (_, i) => `Massa ${i},massa${i}@teste.com,11${String(900000000 + i)}`,
        ),
      ];
      const inicio = Date.now();
      const analise = aceitar(await analisarCsv(leadsB(), bytes(linhas.join("\n")), "massa.csv", "BR"));
      expect(analise.aceitas).toHaveLength(LIMITE_LINHAS);
      const resumo = await executarImportacao(amb.db, empresaB, bruno.id, analise);
      expect(resumo.aceitas).toBe(LIMITE_LINHAS);
      expect(await leadsB().contar({ busca: "massa" })).toBe(LIMITE_LINHAS);
      expect(Date.now() - inicio).toBeLessThan(30_000);
    }, 60_000);
  });

  describe("nome do arquivo", () => {
    it("guarda só o nome, sem caminho nem caracteres de controle", () => {
      expect(limparNomeDoArquivo("C:\\fakepath\\leads.csv")).toBe("leads.csv");
      expect(limparNomeDoArquivo("../../etc/passwd")).toBe("passwd");
      expect(limparNomeDoArquivo("le\u0000ads\n.csv")).toBe("leads.csv");
      expect(limparNomeDoArquivo("")).toBe("planilha.csv");
      expect(limparNomeDoArquivo("a/")).toBe("planilha.csv");
      expect(limparNomeDoArquivo("x".repeat(300))).toHaveLength(120);
    });
  });
});
