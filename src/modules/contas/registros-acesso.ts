import { lt } from "drizzle-orm";
import { registrosAcesso } from "@/db/schema";
import type { Banco } from "@/db/tipos";

// ÚNICO lugar que mexe nos registros de acesso (Marco Civil, art. 15).
// Guarda só usuário, IP e data e hora; nada de e-mail, senha ou navegador.
// Os registros só podem ser entregues a terceiros com ordem judicial (art. 15,
// § 3º): não existe tela nem consulta que os mostre.

// "Seis meses" contado em dias, com folga para os meses de 31 dias.
export const DIAS_DE_GUARDA = 184;

function limite(agora: Date): Date {
  return new Date(agora.getTime() - DIAS_DE_GUARDA * 24 * 60 * 60 * 1000);
}

// Anota uma entrada na conta e, de carona, apaga o que passou do prazo. Não
// precisa de tarefa agendada: cada entrada limpa o vencido (há índice na data).
export async function registrarAcesso(
  db: Banco,
  usuarioId: string,
  ip: string | null,
  agora: Date = new Date(),
): Promise<void> {
  await db.insert(registrosAcesso).values({ usuarioId, ip, criadoEm: agora });
  await db.delete(registrosAcesso).where(lt(registrosAcesso.criadoEm, limite(agora)));
}
