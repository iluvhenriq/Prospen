import "server-only";
import { connection } from "next/server";
import { getDb } from "@/db/client";
import { VAGAS_DE_FUNDADOR } from "./planos";
import { fundadoresUsados } from "./repositorio";

// Vagas de fundador que ainda restam, contadas no banco a cada acesso (a
// página inicial é estática; quem chama fica dentro de <Suspense>).
export async function vagasDeFundadorRestantes(): Promise<number> {
  await connection();
  return Math.max(0, VAGAS_DE_FUNDADOR - (await fundadoresUsados(getDb())));
}
