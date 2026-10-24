import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registrosAcesso } from "@/db/schema";
import { DIAS_DE_GUARDA, registrarAcesso } from "@/modules/contas/registros-acesso";
import { criarAmbienteDeTeste, type AmbienteDeTeste } from "./ajuda/banco-teste";

// Registros de acesso do Marco Civil (art. 15): 6 meses e depois apagados.
const DIA = 24 * 60 * 60 * 1000;

describe("registros de acesso", () => {
  let amb: AmbienteDeTeste;

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
  });
  afterAll(async () => amb?.encerrar());

  it("guarda só usuário, IP e data, e apaga o que passou de 6 meses", async () => {
    const hoje = new Date("2026-10-23T12:00:00Z");
    const antigo = new Date(hoje.getTime() - (DIAS_DE_GUARDA + 1) * DIA);
    const quaseNoPrazo = new Date(hoje.getTime() - (DIAS_DE_GUARDA - 1) * DIA);

    await registrarAcesso(amb.db, "usuario-1", "203.0.113.7", antigo);
    await registrarAcesso(amb.db, "usuario-1", "203.0.113.8", quaseNoPrazo);
    await registrarAcesso(amb.db, "usuario-2", null, hoje);

    const linhas = await amb.db.select().from(registrosAcesso);
    expect(linhas.map((linha) => linha.ip).sort()).toEqual(["203.0.113.8", null].sort());
    expect(Object.keys(linhas[0]).sort()).toEqual(["criadoEm", "id", "ip", "usuarioId"]);
  });

  it("seis meses de guarda cobrem os meses de 31 dias", () => {
    expect(DIAS_DE_GUARDA).toBeGreaterThanOrEqual(184);
  });

  it("o registro continua depois que a conta é apagada (sem ligação com a tabela de usuários)", async () => {
    // Usuário que nunca existiu na tabela de login: o banco aceita, então
    // apagar a conta também não apaga o registro.
    await expect(registrarAcesso(amb.db, "conta-ja-apagada", "198.51.100.1")).resolves.toBeUndefined();
  });
});
