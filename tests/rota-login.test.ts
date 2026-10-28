import { describe, expect, it } from "vitest";
import { CAMINHOS_HTTP_LIBERADOS, caminhoHttpLiberado } from "@/lib/auth-config";

// Rota HTTP do login (/api/auth). As telas não usam: entrar, criar conta e
// convites passam pelas ações do servidor, que têm os limites de tentativas e
// o registro de acesso. Caminho liberado é decisão de propósito.
describe("rota HTTP do login", () => {
  it("hoje não libera nada", () => {
    expect(CAMINHOS_HTTP_LIBERADOS).toEqual([]);
    for (const caminho of [
      "/api/auth/sign-in/email",
      "/api/auth/sign-up/email",
      "/api/auth/get-session",
      "/api/auth/organization/accept-invitation",
      "/api/auth/organization/invite-member",
    ]) {
      expect(caminhoHttpLiberado(caminho)).toBe(false);
    }
  });

  it("um caminho liberado vale para ele e para o que vem abaixo, nunca para vizinhos", () => {
    const liberados = ["/verify-email", "/reset-password"];
    expect(caminhoHttpLiberado("/api/auth/verify-email", liberados)).toBe(true);
    expect(caminhoHttpLiberado("/api/auth/reset-password/abc123", liberados)).toBe(true);
    expect(caminhoHttpLiberado("/api/auth/verify-emailx", liberados)).toBe(false);
    expect(caminhoHttpLiberado("/api/auth/sign-in/email", liberados)).toBe(false);
    expect(caminhoHttpLiberado("/api/authverify-email", liberados)).toBe(false);
    expect(caminhoHttpLiberado("/verify-email", liberados)).toBe(false);
  });
});
