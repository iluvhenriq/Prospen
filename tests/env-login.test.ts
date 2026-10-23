import { describe, expect, it } from "vitest";
import { lerEnv, lerEnvLogin } from "@/lib/env";

const base = { DATABASE_URL: "postgresql://postgres:senha@localhost:5432/prospen" };
const segredo = "x".repeat(32);

describe("lerEnvLogin", () => {
  it("aceita segredo com 32 caracteres ou mais", () => {
    const env = lerEnvLogin({ ...base, AUTH_SECRET: segredo });
    expect(env.AUTH_SECRET).toBe(segredo);
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("recusa quando o segredo não existe e cita o nome da variável", () => {
    expect(() => lerEnvLogin(base)).toThrow(/AUTH_SECRET/);
  });

  it("recusa segredo curto e orienta como gerar", () => {
    expect(() => lerEnvLogin({ ...base, AUTH_SECRET: "curto" })).toThrow(
      /pelo menos 32 caracteres/,
    );
  });

  it("não mostra o valor do segredo na mensagem de erro", () => {
    try {
      lerEnvLogin({ ...base, AUTH_SECRET: "segredo-curto-demais-123" });
      expect.unreachable("deveria ter lançado erro");
    } catch (erro) {
      expect(String(erro)).not.toContain("segredo-curto-demais-123");
    }
  });

  it("o comando do banco (lerEnv) continua sem exigir o segredo", () => {
    expect(() => lerEnv(base)).not.toThrow();
  });
});
