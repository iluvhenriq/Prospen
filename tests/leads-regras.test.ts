import { describe, expect, it } from "vitest";
import {
  classificarLinhas,
  decodificarTexto,
  lerCsv,
  mapearColunas,
} from "@/modules/leads/csv";
import {
  escaparLike,
  formatarTelefone,
  normalizarEmail,
  normalizarTelefone,
  normalizarTexto,
  telefoneValido,
} from "@/modules/leads/normalizacao";
import {
  enderecoDaLista,
  lerParametrosLista,
  temFiltroAtivo,
} from "@/modules/leads/parametros";
import { validarLead } from "@/modules/leads/validacao";
import {
  corValida,
  ehUuid,
  validarNomeEtiqueta,
  validarTextoNota,
} from "@/modules/leads/validacao-textos";
import { regraDeUnicidadeViolada } from "@/lib/erro-unico";

// Regras puras da etapa 3: sem banco, rodam em milissegundos.

describe("normalização de contatos", () => {
  it("padroniza texto sem acento, minúsculo e com espaços simples", () => {
    expect(normalizarTexto("  Ação   da  JOÃO ")).toBe("acao da joao");
    expect(normalizarTexto(null)).toBe("");
  });

  it("padroniza e-mail e trata vazio como nulo", () => {
    expect(normalizarEmail("  Ana@Teste.COM ")).toBe("ana@teste.com");
    expect(normalizarEmail("   ")).toBeNull();
    expect(normalizarEmail(undefined)).toBeNull();
  });

  it("o mesmo telefone brasileiro em vários formatos vira o mesmo valor", () => {
    const formatos = [
      "(11) 99999-0000",
      "11 99999 0000",
      "+55 11 99999-0000",
      "011 99999-0000",
      "0055 11 99999-0000",
      "5511999990000",
    ];
    for (const formato of formatos) {
      expect(normalizarTelefone(formato)).toBe("11999990000");
    }
  });

  it("não confunde o DDD 55 (Rio Grande do Sul) com o código do Brasil", () => {
    expect(normalizarTelefone("(55) 99999-0000")).toBe("55999990000");
    expect(normalizarTelefone("+55 55 99999-0000")).toBe("55999990000");
  });

  it("telefone sem dígitos vira nulo", () => {
    expect(normalizarTelefone("abc")).toBeNull();
    expect(normalizarTelefone("")).toBeNull();
    expect(normalizarTelefone(null)).toBeNull();
  });

  it("fora do Brasil, mantém os dígitos como estão", () => {
    expect(normalizarTelefone("+1 (555) 123-4567", "US")).toBe("15551234567");
  });

  it("valida telefones brasileiros: fixo e celular com DDD", () => {
    expect(telefoneValido("11999990000")).toBe(true);
    expect(telefoneValido("1133334444")).toBe(true);
    expect(telefoneValido("999990000")).toBe(false); // sem DDD
    expect(telefoneValido("11199990000")).toBe(false); // celular sem o 9
    expect(telefoneValido("0133334444")).toBe(false); // DDD começando em zero
    expect(telefoneValido("15551234567", "US")).toBe(true);
    expect(telefoneValido("123", "US")).toBe(false);
  });

  it("formata para exibição só o que é um telefone brasileiro válido", () => {
    expect(formatarTelefone("11999990000")).toBe("(11) 99999-0000");
    expect(formatarTelefone("1133334444")).toBe("(11) 3333-4444");
    expect(formatarTelefone("  abc ")).toBe("abc");
    expect(formatarTelefone(null)).toBe("");
  });

  it("protege símbolos especiais de busca", () => {
    expect(escaparLike("50%_\\")).toBe("50\\%\\_\\\\");
  });
});

describe("validação de lead", () => {
  it("aceita só o nome e aplica os padrões", () => {
    const resultado = validarLead({ nome: "Ana" });
    expect(resultado).toEqual({
      ok: true,
      dados: { nome: "Ana", empresa: null, email: null, telefone: null, pais: "BR" },
    });
  });

  it("limpa espaços repetidos e caracteres de controle", () => {
    const resultado = validarLead({ nome: "Ana\u0000\n   Souza  ", empresa: "  Loja\tX " });
    expect(resultado.ok && resultado.dados.nome).toBe("Ana Souza");
    expect(resultado.ok && resultado.dados.empresa).toBe("Loja X");
  });

  it("recusa nome curto, vazio, longo demais ou de tipo errado", () => {
    expect(validarLead({ nome: "A" }).ok).toBe(false);
    expect(validarLead({ nome: "   " }).ok).toBe(false);
    expect(validarLead({ nome: "x".repeat(121) }).ok).toBe(false);
    expect(validarLead({ nome: 123 }).ok).toBe(false);
    expect(validarLead({}).ok).toBe(false);
  });

  it("recusa e-mail inválido e aceita válido sem mudar a escrita", () => {
    const ruim = validarLead({ nome: "Ana", email: "ana@" });
    expect(ruim.ok).toBe(false);
    expect(!ruim.ok && ruim.erros.email).toBe("Informe um e-mail válido.");
    const bom = validarLead({ nome: "Ana", email: "Ana@Teste.com" });
    expect(bom.ok && bom.dados.email).toBe("Ana@Teste.com");
  });

  it("exige DDD no telefone brasileiro e aceita formatos comuns", () => {
    const ruim = validarLead({ nome: "Ana", telefone: "99999-0000" });
    expect(!ruim.ok && ruim.erros.telefone).toBe("Informe o telefone com DDD.");
    expect(validarLead({ nome: "Ana", telefone: "(11) 99999-0000" }).ok).toBe(true);
    expect(validarLead({ nome: "Ana", telefone: "+55 11 3333-4444" }).ok).toBe(true);
  });

  it("valida o país com duas letras e aceita minúsculas", () => {
    const ruim = validarLead({ nome: "Ana", pais: "brasil" });
    expect(!ruim.ok && ruim.erros.pais).toBeTruthy();
    const bom = validarLead({ nome: "Ana", pais: "pt" });
    expect(bom.ok && bom.dados.pais).toBe("PT");
  });

  it("usa a regra do país do lead para o telefone", () => {
    expect(validarLead({ nome: "Ana", pais: "US", telefone: "+1 555 123 4567" }).ok).toBe(true);
  });

  it("junta vários erros de uma vez", () => {
    const resultado = validarLead({ nome: "", email: "x", telefone: "1" });
    expect(!resultado.ok && Object.keys(resultado.erros).sort()).toEqual([
      "email",
      "nome",
      "telefone",
    ]);
  });
});

describe("validação de etiquetas e notas", () => {
  it("etiqueta: limpa o texto e respeita o limite de 40 caracteres", () => {
    expect(validarNomeEtiqueta("  Quente  ")).toEqual({ ok: true, texto: "Quente" });
    expect(validarNomeEtiqueta("a\tb")).toEqual({ ok: true, texto: "a b" });
    expect(validarNomeEtiqueta("").ok).toBe(false);
    expect(validarNomeEtiqueta("x".repeat(40)).ok).toBe(true);
    expect(validarNomeEtiqueta("x".repeat(41)).ok).toBe(false);
  });

  it("nota: mantém quebras de linha, limita as vazias e o tamanho", () => {
    const resultado = validarTextoNota("linha 1\r\nlinha 2\n\n\n\n\nlinha 3\u0007");
    expect(resultado.ok && resultado.texto).toBe("linha 1\nlinha 2\n\nlinha 3");
    expect(validarTextoNota("   \n ").ok).toBe(false);
    expect(validarTextoNota("x".repeat(2000)).ok).toBe(true);
    expect(validarTextoNota("x".repeat(2001)).ok).toBe(false);
  });

  it("reconhece identificadores e cores", () => {
    expect(ehUuid("3f2b8c1e-8d5a-4c6e-9a1b-2d3e4f5a6b7c")).toBe(true);
    expect(ehUuid("abc")).toBe(false);
    expect(ehUuid(undefined)).toBe(false);
    expect(corValida("roxo")).toBe("roxo");
    expect(corValida("rosa")).toBe("neutra");
    expect(corValida(null)).toBe("neutra");
  });
});

describe("parâmetros da lista (vêm do endereço, qualquer um digita)", () => {
  const uuid = "3f2b8c1e-8d5a-4c6e-9a1b-2d3e4f5a6b7c";

  it("lê filtros válidos", () => {
    expect(
      lerParametrosLista({ q: "  joão  ", origem: "google", etiqueta: uuid, pagina: "3" }),
    ).toEqual({ busca: "joão", origem: "google", etiquetaId: uuid, pagina: 3 });
  });

  it("descarta valores desconhecidos sem dar erro", () => {
    const resultado = lerParametrosLista({ origem: "hacker", etiqueta: "' or 1=1 --", pagina: "abc" });
    expect(resultado).toEqual({ busca: "", origem: undefined, etiquetaId: undefined, pagina: 1 });
  });

  it("limita página, tamanho da busca e usa o primeiro de vários valores", () => {
    expect(lerParametrosLista({ pagina: "-5" }).pagina).toBe(1);
    expect(lerParametrosLista({ pagina: "999999999" }).pagina).toBe(100_000);
    expect(lerParametrosLista({ q: "x".repeat(500) }).busca).toHaveLength(100);
    expect(lerParametrosLista({ q: ["primeiro", "segundo"] }).busca).toBe("primeiro");
  });

  it("monta endereços mantendo os filtros", () => {
    const parametros = lerParametrosLista({ q: "ana", origem: "manual" });
    expect(enderecoDaLista(parametros, 1)).toBe("/painel/leads?q=ana&origem=manual");
    expect(enderecoDaLista(parametros, 2)).toBe("/painel/leads?q=ana&origem=manual&pagina=2");
    expect(enderecoDaLista(lerParametrosLista({}), 1)).toBe("/painel/leads");
  });

  it("sabe quando há filtro ativo", () => {
    expect(temFiltroAtivo(lerParametrosLista({}))).toBe(false);
    expect(temFiltroAtivo(lerParametrosLista({ q: "a" }))).toBe(true);
    // A página sozinha não é um filtro.
    expect(temFiltroAtivo(lerParametrosLista({ pagina: "2" }))).toBe(false);
  });
});

describe("leitura de CSV", () => {
  const bytes = (texto: string) => new TextEncoder().encode(texto);

  it("decodifica UTF-8, com ou sem marca de ordem de bytes", () => {
    expect(decodificarTexto(bytes("João"))).toBe("João");
    expect(decodificarTexto(new Uint8Array([0xef, 0xbb, 0xbf, ...bytes("João")]))).toBe("João");
  });

  it("decodifica o Windows-1252 que o Excel em português costuma salvar", () => {
    expect(decodificarTexto(new Uint8Array(Buffer.from("João;Ação", "latin1")))).toBe("João;Ação");
  });

  it("decodifica UTF-16 com marca de ordem de bytes", () => {
    const utf16 = new Uint8Array([0xff, 0xfe, ...Buffer.from("Nome\nAna", "utf16le")]);
    expect(decodificarTexto(utf16)).toBe("Nome\nAna");
  });

  it("detecta ponto e vírgula e numera as linhas como na planilha", () => {
    const tabela = lerCsv("Nome;Telefone\nAna;11999990000\nBia;11988880000\n");
    expect(tabela.cabecalhos).toEqual(["Nome", "Telefone"]);
    expect(tabela.linhas.map((l) => l.numero)).toEqual([2, 3]);
  });

  it("detecta o separador mesmo com quebra de linha no fim do arquivo (caso comum no Excel)", () => {
    for (const final of ["", "\n", "\r\n", "\n\n"]) {
      const tabela = lerCsv(`Nome;Telefone\r\nAna;11999990000\r\nBia;11988880000${final}`);
      expect(tabela.cabecalhos, JSON.stringify(final)).toEqual(["Nome", "Telefone"]);
      expect(tabela.linhas.map((l) => l.celulas[0]), JSON.stringify(final)).toEqual(["Ana", "Bia"]);
    }
  });

  it("detecta tabulação e barra vertical", () => {
    expect(lerCsv("Nome\tEmail\nAna\ta@a.com\n").cabecalhos).toEqual(["Nome", "Email"]);
    expect(lerCsv("Nome|Email\nAna|a@a.com\n").cabecalhos).toEqual(["Nome", "Email"]);
  });

  it("detecta vírgula mesmo com quebra de linha no fim", () => {
    expect(lerCsv("Nome,Email\nAna,a@a.com\n").cabecalhos).toEqual(["Nome", "Email"]);
  });

  it("detecta vírgula e respeita vírgula dentro de aspas", () => {
    const tabela = lerCsv('Nome,Empresa\n"Silva, João",Loja\n');
    expect(tabela.linhas[0].celulas).toEqual(["Silva, João", "Loja"]);
  });

  it("pula linhas em branco sem perder a numeração", () => {
    const tabela = lerCsv("\n\nNome,Email\nAna,a@a.com\n\nBia,b@b.com");
    expect(tabela.cabecalhos).toEqual(["Nome", "Email"]);
    expect(tabela.linhas.map((l) => l.numero)).toEqual([4, 6]);
  });

  it("aceita planilha de uma coluna só", () => {
    const tabela = lerCsv("Nome\nAna\nBia");
    expect(tabela.problemas).toEqual([]);
    expect(tabela.linhas).toHaveLength(2);
  });

  it("avisa de aspas sem fechar", () => {
    expect(lerCsv('Nome,Email\n"Ana,a@a.com').problemas.length).toBeGreaterThan(0);
  });

  it("arquivo só com linhas vazias não tem cabeçalho", () => {
    expect(lerCsv("\n \n\t\n").cabecalhos).toEqual([]);
  });
});

describe("reconhecimento de colunas", () => {
  it("entende títulos comuns, com acento, maiúsculas e símbolos", () => {
    const mapa = mapearColunas(["NOME COMPLETO", "E-mail", "WhatsApp", "Razão Social", "Cidade"]);
    expect(mapa).toMatchObject({ nome: 0, email: 1, telefone: 2, empresa: 3, nomeVemDaEmpresa: false });
    expect(mapa.ignoradas).toEqual(["Cidade"]);
  });

  it("sem coluna de nome, usa a de empresa como nome", () => {
    const mapa = mapearColunas(["Razão Social", "Telefone"]);
    expect(mapa).toMatchObject({ nome: 0, empresa: null, telefone: 1, nomeVemDaEmpresa: true });
  });

  it("não usa a mesma coluna duas vezes", () => {
    const mapa = mapearColunas(["Nome", "Empresa", "Nome Fantasia"]);
    expect(mapa).toMatchObject({ nome: 0, empresa: 1 });
    expect(mapa.ignoradas).toEqual(["Nome Fantasia"]);
  });

  it("sem nome nem empresa, não há coluna de nome", () => {
    expect(mapearColunas(["Email", "Telefone"]).nome).toBeNull();
  });
});

describe("classificação das linhas de uma planilha", () => {
  const mapa = mapearColunas(["Nome", "Email", "Telefone"]);
  const linha = (numero: number, nome: string, email: string, telefone: string) => ({
    numero,
    celulas: [nome, email, telefone],
  });

  it("separa válidas, rejeitadas e repetidas dentro do próprio arquivo", () => {
    const resultado = classificarLinhas(
      [
        linha(2, "Ana", "ana@teste.com", "(11) 99999-0000"),
        linha(3, "", "sem-nome@teste.com", ""),
        linha(4, "Ana de novo", "ANA@teste.com", ""),
        linha(5, "Outra Ana", "", "+55 11 99999-0000"),
        linha(6, "Bia", "bia@teste.com", ""),
      ],
      mapa,
      "BR",
    );

    expect(resultado.totalLinhas).toBe(5);
    expect(resultado.validas.map((v) => v.linha)).toEqual([2, 6]);
    expect(resultado.rejeitadas).toBe(1);
    expect(resultado.duplicadas).toBe(2);
    expect(resultado.ocorrencias).toEqual([
      { linha: 3, tipo: "rejeitada", motivo: "Nome: Informe o nome do lead." },
      { linha: 4, tipo: "duplicada", motivo: "E-mail repetido da linha 2." },
      { linha: 5, tipo: "duplicada", motivo: "Telefone repetido da linha 2." },
    ]);
  });

  it("os motivos nunca carregam dados pessoais da planilha", () => {
    const resultado = classificarLinhas(
      [
        linha(2, "Ana", "ana@teste.com", "(11) 99999-0000"),
        linha(3, "Ana", "ana@teste.com", ""),
        linha(4, "Cláudio Segredo", "email-invalido", "11977776666"),
      ],
      mapa,
      "BR",
    );
    const texto = JSON.stringify(resultado.ocorrencias);
    expect(texto).not.toContain("ana@teste.com");
    expect(texto).not.toContain("Segredo");
    expect(texto).not.toContain("11977776666");
    expect(texto).not.toContain("email-invalido");
  });

  it("soma sempre fecha: válidas + rejeitadas + repetidas = total", () => {
    const resultado = classificarLinhas(
      [
        linha(2, "A", "", ""),
        linha(3, "Bia", "x", ""),
        linha(4, "Caio", "c@c.com", ""),
        linha(5, "Caio 2", "c@c.com", ""),
      ],
      mapa,
      "BR",
    );
    expect(resultado.validas.length + resultado.rejeitadas + resultado.duplicadas).toBe(
      resultado.totalLinhas,
    );
  });
});

describe("erro de unicidade do banco", () => {
  it("acha o código 23505 e o nome da regra, mesmo embrulhado", () => {
    const original = Object.assign(new Error("duplicate key"), {
      code: "23505",
      constraint: "leads_organizacao_email_unico",
    });
    expect(regraDeUnicidadeViolada(original)).toBe("leads_organizacao_email_unico");
    expect(regraDeUnicidadeViolada(new Error("falhou", { cause: original }))).toBe(
      "leads_organizacao_email_unico",
    );
    expect(regraDeUnicidadeViolada(new AggregateError([original]))).toBe(
      "leads_organizacao_email_unico",
    );
  });

  it("ignora outros erros e não entra em laço", () => {
    expect(regraDeUnicidadeViolada(new Error("outro"))).toBeNull();
    expect(regraDeUnicidadeViolada({ code: "23503" })).toBeNull();
    expect(regraDeUnicidadeViolada(null)).toBeNull();
    const a: Error & { cause?: unknown } = new Error("a");
    a.cause = a;
    expect(regraDeUnicidadeViolada(a)).toBeNull();
  });
});
