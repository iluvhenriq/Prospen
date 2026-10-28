"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { ptBR } from "@/lib/i18n/pt-BR";
import { exigirPermissao } from "@/modules/organizacoes/contexto";
import { IDADES_DO_PERFIL, PORTES_DO_PERFIL } from "./regras";
import { repositorioClienteIdeal } from "./repositorio-cliente-ideal";

export type EstadoClienteIdeal = { mensagem?: string; sucesso?: boolean };

const entrada = z.object({
  portes: z.array(z.enum(PORTES_DO_PERFIL)).max(PORTES_DO_PERFIL.length).transform((lista) => [...new Set(lista)]),
  idade: z.enum(IDADES_DO_PERFIL),
  aceitaMei: z.boolean(),
});

// Telas que mostram a nota dos leads.
function atualizarTelas(): void {
  for (const caminho of ["/painel", "/painel/leads", "/painel/hoje", "/painel/busca", "/painel/cliente-ideal"]) {
    revalidatePath(caminho);
  }
  revalidatePath("/painel/leads/[id]", "page");
  revalidatePath("/painel/campanhas/[id]", "page");
}

export async function salvarClienteIdeal(_anterior: EstadoClienteIdeal, dados: FormData): Promise<EstadoClienteIdeal> {
  const contexto = await exigirPermissao("definirClienteIdeal");
  const t = ptBR.clienteIdeal;
  const validado = entrada.safeParse({
    portes: dados.getAll("porte").filter((valor) => typeof valor === "string"),
    idade: dados.get("idade"),
    aceitaMei: dados.get("aceitaMei") === "1",
  });
  if (!validado.success) return { mensagem: t.invalido };
  await repositorioClienteIdeal(getDb(), contexto.organizacao.id).salvar(validado.data, contexto.usuario.id);
  atualizarTelas();
  return { mensagem: t.salvo, sucesso: true };
}

export async function voltarNotaGeral(): Promise<void> {
  const contexto = await exigirPermissao("definirClienteIdeal");
  await repositorioClienteIdeal(getDb(), contexto.organizacao.id).apagar();
  atualizarTelas();
}
