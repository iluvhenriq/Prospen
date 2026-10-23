import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Aplica as migrações reais em um PostgreSQL de teste (em memória).
// Se uma migração estiver quebrada, este teste falha antes de chegar ao seu banco.
describe("migrações", () => {
  let banco: PGlite;

  beforeAll(async () => {
    banco = new PGlite({ extensions: { pg_trgm, unaccent } });
    await migrate(drizzle(banco), { migrationsFolder: "./src/db/migrations" });
  });

  afterAll(async () => {
    await banco.close();
  });

  it("aplica todas as migrações sem erro", async () => {
    const resultado = await banco.query<{ total: number }>(
      "select count(*)::int as total from drizzle.__drizzle_migrations",
    );
    expect(resultado.rows[0].total).toBeGreaterThanOrEqual(1);
  });

  it("pode ser aplicada mais de uma vez (idempotente)", async () => {
    await expect(
      migrate(drizzle(banco), { migrationsFolder: "./src/db/migrations" }),
    ).resolves.not.toThrow();
  });

  it("instala a extensão que ignora acentos", async () => {
    const resultado = await banco.query<{ texto: string }>(
      "select unaccent('São Paulo, Ação') as texto",
    );
    expect(resultado.rows[0].texto).toBe("Sao Paulo, Acao");
  });

  it("instala a extensão de busca por parte do nome", async () => {
    const resultado = await banco.query<{ parecido: boolean }>(
      "select similarity('barbearia', 'barberia') > 0.3 as parecido",
    );
    expect(resultado.rows[0].parecido).toBe(true);
  });
});
