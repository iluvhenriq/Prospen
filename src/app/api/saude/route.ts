import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db/client";
import { explicarErroBanco } from "@/lib/erros-banco";

// Confere se o banco responde. Não revela detalhes de configuração.
export async function GET() {
  await connection();
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ banco: "ok" });
  } catch (erro) {
    // explicarErroBanco mostra a causa real do PostgreSQL, que o Drizzle esconde.
    console.error("Falha na verificação do banco:", explicarErroBanco(erro));
    return Response.json({ banco: "erro" }, { status: 503 });
  }
}
