import { describe, expect, it } from "vitest";
import { explicarErroBanco } from "@/lib/erros-banco";

describe("explicarErroBanco", () => {
  it("explica banco desligado", () => {
    expect(explicarErroBanco({ code: "ECONNREFUSED" })).toMatch(/PostgreSQL/);
  });

  it("explica senha incorreta e orienta sobre símbolos", () => {
    expect(explicarErroBanco({ code: "28P01" })).toMatch(/%40/);
  });

  it("explica banco inexistente indicando o comando", () => {
    expect(explicarErroBanco({ code: "3D000" })).toMatch(/db:criar/);
  });

  it("explica host não encontrado", () => {
    expect(explicarErroBanco({ code: "ENOTFOUND" })).toMatch(/host/);
  });

  it("encontra o código quando o Drizzle embrulha o erro em 'cause'", () => {
    const embrulhado = new Error("Failed query: CREATE SCHEMA", {
      cause: Object.assign(new Error("database does not exist"), {
        code: "3D000",
      }),
    });
    expect(explicarErroBanco(embrulhado)).toMatch(/db:criar/);
  });

  it("encontra o código dentro de um AggregateError (IPv4 e IPv6)", () => {
    const agregado = new AggregateError([
      Object.assign(new Error("recusado"), { code: "ECONNREFUSED" }),
    ]);
    expect(explicarErroBanco(agregado)).toMatch(/PostgreSQL/);
  });

  it("encontra o código em vários níveis de 'cause'", () => {
    const fundo = Object.assign(new Error("senha"), { code: "28P01" });
    const meio = new Error("meio", { cause: fundo });
    const topo = new Error("topo", { cause: meio });
    expect(explicarErroBanco(topo)).toMatch(/senha/i);
  });

  it("usa a mensagem original quando não conhece o código", () => {
    expect(explicarErroBanco(new Error("algo inesperado"))).toBe("algo inesperado");
  });

  it("prefere a mensagem da causa, sem repetir a consulta, quando o código é desconhecido", () => {
    const embrulhado = new Error("Failed query: select 1 params: segredo", {
      cause: new Error("syntax error at or near x"),
    });
    const texto = explicarErroBanco(embrulhado);
    expect(texto).toBe("syntax error at or near x");
    expect(texto).not.toContain("segredo");
  });

  it("não entra em laço com causas circulares", () => {
    const a: Error & { cause?: unknown } = new Error("a");
    const b = new Error("b", { cause: a });
    a.cause = b;
    expect(() => explicarErroBanco(a)).not.toThrow();
  });

  it("lida com valores que não são erro", () => {
    expect(explicarErroBanco("texto")).toBe("Erro desconhecido.");
    expect(explicarErroBanco(null)).toBe("Erro desconhecido.");
  });
});
