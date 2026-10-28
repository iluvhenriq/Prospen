import "server-only";
import { getDb } from "@/db/client";
import type { Contexto } from "@/modules/organizacoes/contexto";
import type { ClienteIdeal } from "./regras";
import { repositorioClienteIdeal } from "./repositorio-cliente-ideal";

// Cliente ideal da empresa do contexto, para as telas ajustarem a nota.
// Nulo: ainda não definido (vale a nota geral).
export async function obterClienteIdeal(contexto: Contexto): Promise<ClienteIdeal | null> {
  return repositorioClienteIdeal(getDb(), contexto.organizacao.id).obter();
}
