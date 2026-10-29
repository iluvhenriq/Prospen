import { eq } from "drizzle-orm";
import { user } from "@/db/schema";
import type { Banco } from "@/db/tipos";

// Apoio da tela /confirmar-email. O link traz um token assinado pelo login
// (JWT) com o e-mail dentro. Aqui só se LÊ o e-mail, sem conferir a
// assinatura: quem confere é o login (verifyEmail), sempre antes de o
// resultado ser usado para qualquer coisa.
export function emailDoToken(token: string): string | null {
  const meio = token.split(".")[1];
  if (!meio) return null;
  try {
    const dados: unknown = JSON.parse(Buffer.from(meio, "base64url").toString("utf8"));
    const email = typeof dados === "object" && dados !== null ? (dados as Record<string, unknown>).email : null;
    return typeof email === "string" ? email.toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function situacaoDoEmail(db: Banco, email: string): Promise<{ id: string; confirmado: boolean } | null> {
  const [linha] = await db
    .select({ id: user.id, confirmado: user.emailVerified })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  return linha ?? null;
}
