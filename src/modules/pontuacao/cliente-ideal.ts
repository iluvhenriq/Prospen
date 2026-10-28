import "server-only";
import { getDb } from "@/db/client";
import type { Contexto } from "@/modules/organizacoes/contexto";
import { temRecurso } from "@/modules/planos/acesso";
import type { ClienteIdeal } from "./regras";
import { repositorioClienteIdeal } from "./repositorio-cliente-ideal";

// Cliente ideal da empresa do contexto, para as telas ajustarem a nota.
// Nulo: ainda não definido, ou o plano não tem o recurso (vale a nota geral).
// O perfil gravado fica guardado: volta a valer se a empresa mudar de plano.
export async function obterClienteIdeal(contexto: Contexto): Promise<ClienteIdeal | null> {
  if (!(await temRecurso(contexto, "clienteIdeal"))) return null;
  return repositorioClienteIdeal(getDb(), contexto.organizacao.id).obter();
}
