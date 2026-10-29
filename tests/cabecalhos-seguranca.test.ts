import { describe, expect, it } from "vitest";
import nextConfig, { CABECALHOS_DE_SEGURANCA } from "../next.config";

// Cabeçalhos de segurança do site (28/10/2026).
describe("cabeçalhos de segurança", () => {
  it("valem para todas as páginas", async () => {
    const regras = await nextConfig.headers?.();
    expect(regras).toEqual([{ source: "/:path*", headers: CABECALHOS_DE_SEGURANCA }]);
  });

  it("o site não abre dentro de outro e formulários só enviam para ele mesmo", () => {
    const valor = (nome: string) => CABECALHOS_DE_SEGURANCA.find((c) => c.key === nome)?.value ?? "";
    expect(valor("X-Frame-Options")).toBe("DENY");
    expect(valor("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(valor("Content-Security-Policy")).toContain("form-action 'self'");
    // O token dos links de confirmação e de senha nova não vaza para outros sites.
    expect(valor("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("não anuncia a tecnologia do servidor", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
