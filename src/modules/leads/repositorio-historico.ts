import { and, desc, eq } from "drizzle-orm";
import { historicoEtapas, user, type RegistroEtapa } from "@/db/schema";
import type { Banco } from "@/db/tipos";

// Leitura do histórico de etapas do funil. Amarrado a UMA empresa. A gravação
// fica em mudarEtapa, no repositório de leads, para acontecer na mesma
// transação que a mudança do lead.

export type RegistroEtapaComAutor = RegistroEtapa & { autorNome: string | null };

export function repositorioHistorico(db: Banco, organizacaoId: string) {
  if (!organizacaoId) {
    throw new Error("repositorioHistorico exige o identificador da organização.");
  }

  const daOrganizacao = eq(historicoEtapas.organizacaoId, organizacaoId);

  return {
    // Mudanças de etapa de um lead, da mais recente para a mais antiga.
    async doLead(leadId: string, limite = 100): Promise<RegistroEtapaComAutor[]> {
      const linhas = await db
        .select({ registro: historicoEtapas, autorNome: user.name })
        .from(historicoEtapas)
        .leftJoin(user, eq(user.id, historicoEtapas.alteradoPorId))
        .where(and(daOrganizacao, eq(historicoEtapas.leadId, leadId)))
        .orderBy(desc(historicoEtapas.criadoEm), desc(historicoEtapas.id))
        .limit(Math.min(Math.max(limite, 1), 500));
      return linhas.map(({ registro, autorNome }) => ({ ...registro, autorNome }));
    },
  };
}

export type RepositorioHistorico = ReturnType<typeof repositorioHistorico>;
