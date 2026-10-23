"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { ptBR } from "@/lib/i18n/pt-BR";
import { cnpjValido, normalizarCnpj } from "@/modules/leads/cnpj";
import { formatarTelefone } from "@/modules/leads/normalizacao";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { exigirPermissao } from "@/modules/organizacoes/contexto";
import { RESULTADOS_POR_PAGINA } from "./parametros";
import { repositorioBaseCnpj } from "./repositorio";

export type EstadoAdicionar = { mensagem?: string; sucesso?: boolean };

// O navegador manda só a lista de CNPJs marcados. Nome, contato e todo o resto
// são lidos de novo da base no servidor: nada do que vem do formulário vira
// dado do lead além do CNPJ.
const entrada = z
  .array(z.string().transform((valor) => normalizarCnpj(valor) ?? ""))
  .max(RESULTADOS_POR_PAGINA)
  .transform((lista) => [...new Set(lista)])
  .refine((lista) => lista.length > 0 && lista.every(cnpjValido));

export async function adicionarDaBusca(_anterior: EstadoAdicionar, dados: FormData): Promise<EstadoAdicionar> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const t = ptBR.busca.adicionar;
  const validado = entrada.safeParse(dados.getAll("cnpj").filter((valor) => typeof valor === "string"));
  if (!validado.success) return { mensagem: t.nenhumMarcado };

  const db = getDb();
  const daBase = await repositorioBaseCnpj(db).paraVirarLead(validado.data);
  const adicionados = await repositorioLeads(db, contexto.organizacao.id).criarDaBaseCnpj(
    daBase.map((linha) => ({
      nome: linha.nomeFantasia ?? linha.razaoSocial ?? linha.cnpj,
      empresa: linha.razaoSocial,
      email: linha.email,
      telefone: formatarTelefone(linha.telefone) || null,
      cnpj: linha.cnpj,
    })),
    contexto.usuario.id,
  );

  revalidatePath("/painel/busca");
  revalidatePath("/painel/leads");
  revalidatePath("/painel");
  return { sucesso: adicionados > 0, mensagem: t.resultado(adicionados, validado.data.length - adicionados) };
}
