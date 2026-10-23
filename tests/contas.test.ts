import { describe, expect, it } from "vitest";
import { traduzirErroLogin } from "@/modules/contas/erros";
import { ipDaRequisicao, mensagemDeEspera } from "@/modules/contas/limites";
import {
  errosPorCampo,
  esquemaCadastro,
  esquemaEntrada,
  esquemaOrganizacao,
  gerarSlug,
} from "@/modules/contas/validacao";

describe("gerarSlug", () => {
  it("tira acentos, usa minúsculas e junta com hífen", () => {
    expect(gerarSlug("Barbearia Ação", "abc123")).toBe("barbearia-acao-abc123");
  });

  it("usa 'empresa' quando o nome só tem símbolos", () => {
    expect(gerarSlug("!!!", "abc123")).toBe("empresa-abc123");
  });

  it("limita o tamanho sem deixar hífen sobrando antes do sufixo", () => {
    const slug = gerarSlug("a".repeat(39) + " b" + " c".repeat(10), "xyz789");
    expect(slug.endsWith("-xyz789")).toBe(true);
    expect(slug).not.toContain("--");
    expect(slug.length).toBeLessThanOrEqual(40 + 1 + 6);
  });

  it("gera sufixos diferentes e só com letras minúsculas e números", () => {
    const a = gerarSlug("Loja");
    const b = gerarSlug("Loja");
    expect(a).toMatch(/^loja-[a-z0-9]{6}$/);
    expect(a).not.toBe(b);
  });
});

describe("esquemaCadastro", () => {
  const valido = { nome: "Ana Souza", email: "ana@empresa.com.br", senha: "senha-segura-1" };

  it("aceita dados válidos e normaliza nome e e-mail", () => {
    const resultado = esquemaCadastro.safeParse({
      ...valido,
      nome: "  Ana Souza  ",
      email: "  ANA@Empresa.com.br ",
    });
    expect(resultado.success).toBe(true);
    expect(resultado.data).toMatchObject({ nome: "Ana Souza", email: "ana@empresa.com.br" });
  });

  it("recusa e-mail inválido com mensagem em português", () => {
    const resultado = esquemaCadastro.safeParse({ ...valido, email: "ana@" });
    expect(resultado.success).toBe(false);
    expect(errosPorCampo(resultado.error!).email).toBe("Informe um e-mail válido.");
  });

  it("recusa senha curta dizendo o mínimo", () => {
    const resultado = esquemaCadastro.safeParse({ ...valido, senha: "curta" });
    expect(errosPorCampo(resultado.error!).senha).toBe(
      "A senha precisa ter pelo menos 8 caracteres.",
    );
  });

  it("recusa senha longa demais", () => {
    const resultado = esquemaCadastro.safeParse({ ...valido, senha: "a".repeat(129) });
    expect(errosPorCampo(resultado.error!).senha).toMatch(/no máximo 128/);
  });

  it("recusa nome vazio ou só com espaços", () => {
    const resultado = esquemaCadastro.safeParse({ ...valido, nome: "   " });
    expect(errosPorCampo(resultado.error!).nome).toBe("Informe seu nome.");
  });

  it("recusa campos ausentes sem lançar erro", () => {
    const resultado = esquemaCadastro.safeParse({});
    expect(resultado.success).toBe(false);
    expect(Object.keys(errosPorCampo(resultado.error!)).sort()).toEqual([
      "email",
      "nome",
      "senha",
    ]);
  });
});

describe("esquemaEntrada", () => {
  it("não avalia o tamanho da senha na entrada", () => {
    expect(esquemaEntrada.safeParse({ email: "a@b.com", senha: "x" }).success).toBe(true);
  });

  it("exige a senha", () => {
    const resultado = esquemaEntrada.safeParse({ email: "a@b.com", senha: "" });
    expect(errosPorCampo(resultado.error!).senha).toBe("Informe sua senha.");
  });
});

describe("esquemaOrganizacao", () => {
  it("aceita e apara o nome da empresa", () => {
    expect(esquemaOrganizacao.parse({ nome: "  Barbearia Central " }).nome).toBe(
      "Barbearia Central",
    );
  });

  it("recusa nome curto e nome longo demais", () => {
    expect(esquemaOrganizacao.safeParse({ nome: "A" }).success).toBe(false);
    expect(esquemaOrganizacao.safeParse({ nome: "A".repeat(81) }).success).toBe(false);
  });
});

describe("errosPorCampo", () => {
  it("guarda só a primeira mensagem de cada campo", () => {
    const resultado = esquemaCadastro.safeParse({ nome: "", email: "x", senha: "" });
    const erros = errosPorCampo(resultado.error!);
    expect(typeof erros.nome).toBe("string");
    expect(Object.keys(erros)).toHaveLength(3);
  });
});

describe("traduzirErroLogin", () => {
  it("traduz o código do Better Auth", () => {
    expect(traduzirErroLogin({ body: { code: "INVALID_EMAIL_OR_PASSWORD" } })).toBe(
      "E-mail ou senha incorretos.",
    );
  });

  it("avisa quando há excesso de tentativas", () => {
    expect(traduzirErroLogin({ statusCode: 429 })).toMatch(/Muitas tentativas/);
  });

  it("usa mensagem genérica, sem detalhes técnicos, para erros desconhecidos", () => {
    const texto = traduzirErroLogin(new Error("connection refused 10.0.0.5:5432"));
    expect(texto).toBe("Algo deu errado. Tente novamente em instantes.");
    expect(texto).not.toContain("10.0.0.5");
  });

  it("lida com valores que não são erro", () => {
    expect(traduzirErroLogin(null)).toMatch(/Algo deu errado/);
    expect(traduzirErroLogin("texto")).toMatch(/Algo deu errado/);
  });
});

describe("ipDaRequisicao", () => {
  it("usa o primeiro endereço de x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1" });
    expect(ipDaRequisicao(h)).toBe("203.0.113.9");
  });

  it("cai para x-real-ip", () => {
    expect(ipDaRequisicao(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("devolve nulo quando não há informação", () => {
    expect(ipDaRequisicao(new Headers())).toBeNull();
  });

  it("limita o tamanho para o valor não virar chave gigante", () => {
    const h = new Headers({ "x-forwarded-for": "9".repeat(500) });
    expect(ipDaRequisicao(h)!.length).toBeLessThanOrEqual(64);
  });
});

describe("mensagemDeEspera", () => {
  it("arredonda para cima, em minutos, com singular e plural", () => {
    expect(mensagemDeEspera(1)).toBe("Muitas tentativas. Tente de novo em 1 minuto.");
    expect(mensagemDeEspera(61)).toBe("Muitas tentativas. Tente de novo em 2 minutos.");
    expect(mensagemDeEspera(900)).toBe("Muitas tentativas. Tente de novo em 15 minutos.");
  });
});
