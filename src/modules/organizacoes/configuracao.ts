import { eq } from "drizzle-orm";
import {
  organizacaoConfig,
  type ConfiguracaoOrganizacao,
} from "@/db/schema";
import type { Banco } from "@/db/tipos";

// ÚNICO lugar que consulta a configuração regional das empresas.

// Cria a configuração padrão (Brasil) se a empresa ainda não tiver uma.
// Pode ser chamada várias vezes sem efeito colateral.
export async function garantirConfiguracao(
  db: Banco,
  organizacaoId: string,
): Promise<void> {
  await db
    .insert(organizacaoConfig)
    .values({ organizacaoId })
    .onConflictDoNothing({ target: organizacaoConfig.organizacaoId });
}

// Configuração da empresa. Se por algum motivo ela não existir (por exemplo,
// a criação automática falhou), é criada na hora com os valores padrão.
export async function obterConfiguracao(
  db: Banco,
  organizacaoId: string,
): Promise<ConfiguracaoOrganizacao> {
  const buscar = async () => {
    const [linha] = await db
      .select()
      .from(organizacaoConfig)
      .where(eq(organizacaoConfig.organizacaoId, organizacaoId))
      .limit(1);
    return linha;
  };

  const existente = await buscar();
  if (existente) return existente;

  await garantirConfiguracao(db, organizacaoId);
  const criada = await buscar();
  if (!criada) {
    throw new Error("Não foi possível criar a configuração da empresa.");
  }
  return criada;
}
