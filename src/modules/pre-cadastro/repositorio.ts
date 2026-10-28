import { asc, count, eq } from "drizzle-orm";
import { preCadastros, type InteressePreCadastro, type PreCadastro, type SegmentoPreCadastro } from "@/db/schema";
import type { Banco } from "@/db/tipos";

// ÚNICO lugar que mexe na tabela de pré-cadastros.

export function repositorioPreCadastros(db: Banco) {
  return {
    // Grava; se o e-mail já estava, não faz nada. Devolve se entrou agora.
    async registrar(dados: {
      nome: string;
      email: string;
      empresa: string | null;
      segmento?: SegmentoPreCadastro | null;
      interesses?: InteressePreCadastro[];
    }): Promise<boolean> {
      const linhas = await db
        .insert(preCadastros)
        .values({ ...dados, email: dados.email.toLowerCase() })
        .onConflictDoNothing()
        .returning({ id: preCadastros.id });
      return linhas.length > 0;
    },

    // Para o responsável acompanhar a pré-venda (npm run pre-cadastro:listar).
    async listar(): Promise<PreCadastro[]> {
      return db.select().from(preCadastros).orderBy(asc(preCadastros.criadoEm));
    },

    async contar(): Promise<number> {
      const [linha] = await db.select({ total: count() }).from(preCadastros);
      return linha?.total ?? 0;
    },

    // Pedido da pessoa para sair da lista (LGPD, art. 18).
    async excluir(email: string): Promise<boolean> {
      const linhas = await db
        .delete(preCadastros)
        .where(eq(preCadastros.email, email.trim().toLowerCase()))
        .returning({ id: preCadastros.id });
      return linhas.length > 0;
    },
  };
}
