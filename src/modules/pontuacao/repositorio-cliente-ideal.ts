import { eq } from "drizzle-orm";
import { clienteIdeal } from "@/db/schema";
import type { Banco } from "@/db/tipos";
import { IDADES_DO_PERFIL, PORTES_DO_PERFIL, type ClienteIdeal } from "./regras";

// ÚNICO lugar que consulta a tabela do cliente ideal. Amarrado a UMA empresa.
export function repositorioClienteIdeal(db: Banco, organizacaoId: string) {
  if (!organizacaoId) {
    throw new Error("repositorioClienteIdeal exige o identificador da organização.");
  }

  const daOrganizacao = eq(clienteIdeal.organizacaoId, organizacaoId);

  return {
    // Nulo: a empresa ainda não definiu (vale a nota geral).
    async obter(): Promise<ClienteIdeal | null> {
      const [linha] = await db.select().from(clienteIdeal).where(daOrganizacao).limit(1);
      if (!linha) return null;
      return {
        portes: PORTES_DO_PERFIL.filter((porte) => linha.portes.includes(porte)),
        idade: IDADES_DO_PERFIL.find((idade) => idade === linha.idade) ?? "novas",
        aceitaMei: linha.aceitaMei,
      };
    },

    async salvar(perfil: ClienteIdeal, autorId: string): Promise<void> {
      const valores = { portes: perfil.portes, idade: perfil.idade, aceitaMei: perfil.aceitaMei, atualizadoPorId: autorId };
      await db
        .insert(clienteIdeal)
        .values({ organizacaoId, ...valores })
        .onConflictDoUpdate({ target: clienteIdeal.organizacaoId, set: valores });
    },

    // Volta para a nota geral.
    async apagar(): Promise<void> {
      await db.delete(clienteIdeal).where(daOrganizacao);
    },
  };
}
