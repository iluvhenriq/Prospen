import { and, asc, count, eq, gt } from "drizzle-orm";
import { invitation, member, organization, user } from "@/db/schema";
import type { Banco } from "@/db/tipos";
import { papelMaisAlto, type Papel } from "./membros";

// Leitura da equipe de uma empresa: pessoas e convites pendentes. Criar,
// aceitar e cancelar convites passa pelo login (Better Auth), que guarda as
// regras dele; aqui é só leitura, amarrada a UMA empresa.

export type PessoaDaEquipe = { id: string; usuarioId: string; nome: string; email: string; papel: Papel };
export type ConvitePendente = { id: string; email: string; expiraEm: Date };

export function repositorioEquipe(db: Banco, organizacaoId: string) {
  if (!organizacaoId) {
    throw new Error("repositorioEquipe exige o identificador da organização.");
  }

  const pendentes = () =>
    and(
      eq(invitation.organizationId, organizacaoId),
      eq(invitation.status, "pending"),
      gt(invitation.expiresAt, new Date()),
    );

  return {
    async pessoas(): Promise<PessoaDaEquipe[]> {
      const linhas = await db
        .select({ id: member.id, usuarioId: member.userId, nome: user.name, email: user.email, papel: member.role })
        .from(member)
        .innerJoin(user, eq(user.id, member.userId))
        .where(eq(member.organizationId, organizacaoId))
        .orderBy(asc(member.createdAt), asc(member.id));
      return linhas.map((linha) => ({ ...linha, papel: papelMaisAlto(linha.papel) }));
    },

    async convitesPendentes(): Promise<ConvitePendente[]> {
      return db
        .select({ id: invitation.id, email: invitation.email, expiraEm: invitation.expiresAt })
        .from(invitation)
        .where(pendentes())
        .orderBy(asc(invitation.createdAt));
    },

    // Vagas ocupadas no plano: pessoas da equipe mais convites pendentes.
    async ocupacao(): Promise<{ pessoas: number; convites: number }> {
      const [[pessoas], [convites]] = await Promise.all([
        db.select({ total: count() }).from(member).where(eq(member.organizationId, organizacaoId)),
        db.select({ total: count() }).from(invitation).where(pendentes()),
      ]);
      return { pessoas: pessoas?.total ?? 0, convites: convites?.total ?? 0 };
    },
  };
}

export type ConviteParaAceitar = { id: string; email: string; empresa: string };

// O que a página do convite mostra a quem recebeu o link (que ainda não é da
// equipe): o nome da empresa e o e-mail convidado. Nulo se não existe, já foi
// usado, foi cancelado ou venceu. O identificador é longo e aleatório: quem
// não recebeu o link não tem como adivinhar.
export async function lerConvite(db: Banco, conviteId: string): Promise<ConviteParaAceitar | null> {
  const [linha] = await db
    .select({ id: invitation.id, email: invitation.email, empresa: organization.name })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .where(and(eq(invitation.id, conviteId), eq(invitation.status, "pending"), gt(invitation.expiresAt, new Date())))
    .limit(1);
  return linha ?? null;
}

// Formato do identificador do convite no endereço, antes de ir ao banco.
export function conviteIdValido(valor: unknown): valor is string {
  return typeof valor === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(valor);
}
