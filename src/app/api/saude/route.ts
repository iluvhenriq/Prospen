import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db/client";

// Confere se o banco responde. Não revela detalhes de configuração.
export async function GET() {
  await connection();
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ banco: "ok" });
  } catch (erro) {
    console.error(
      "Falha na verificação do banco:",
      erro instanceof Error ? erro.message : erro,
    );
    return Response.json({ banco: "erro" }, { status: 503 });
  }
}
