import { describe, expect, it } from "vitest";
import { lerEnv } from "@/lib/env";

const valida = {
  DATABASE_URL: "postgresql://postgres:senha@localhost:5432/prospen",
};

describe("lerEnv", () => {
  it("aceita uma configuração válida e aplica o valor padrão de APP_URL", () => {
    const env = lerEnv(valida);
    expect(env.DATABASE_URL).toBe(valida.DATABASE_URL);
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("aceita o prefixo postgres://", () => {
    expect(() => lerEnv({ DATABASE_URL: "postgres://u:s@h:5432/db" })).not.toThrow();
  });

  it("rejeita quando DATABASE_URL não existe", () => {
    expect(() => lerEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejeita DATABASE_URL de outro tipo de banco", () => {
    expect(() => lerEnv({ DATABASE_URL: "mysql://u:s@h/db" })).toThrow(
      /postgresql:\/\//,
    );
  });

  it("rejeita APP_URL inválida", () => {
    expect(() => lerEnv({ ...valida, APP_URL: "isto nao e um endereco" })).toThrow(
      /APP_URL/,
    );
  });

  it("não vaza a senha na mensagem de erro", () => {
    try {
      lerEnv({ DATABASE_URL: "mysql://usuario:segredo123@host/db" });
      expect.unreachable("deveria ter lançado erro");
    } catch (erro) {
      expect(String(erro)).not.toContain("segredo123");
    }
  });
});
