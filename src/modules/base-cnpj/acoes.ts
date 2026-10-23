"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { ptBR } from "@/lib/i18n/pt-BR";
import { cnpjValido, normalizarCnpj } from "@/modules/leads/cnpj";
import { formatarTelefone } from "@/modules/leads/normalizacao";
import { repositorioCampanhas } from "@/modules/campanhas/repositorio";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { ehUuid } from "@/modules/leads/validacao-textos";
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
      porte: linha.porte,
      naturezaJuridica: linha.naturezaJuridica,
      dataAbertura: linha.dataAbertura,
      matriz: linha.matriz,
      cnaePrincipal: linha.cnaePrincipal,
    })),
    contexto.usuario.id,
  );

  // Campanha opcional: entram as empresas marcadas, novas ou que já eram leads.
  let mensagemCampanha = "";
  const campanhaId = dados.get("campanhaId");
  if (typeof campanhaId === "string" && ehUuid(campanhaId)) {
    const ids = await repositorioLeads(db, contexto.organizacao.id).idsPorCnpj(validado.data);
    const naCampanha = await repositorioCampanhas(db, contexto.organizacao.id).adicionarLeads(
      campanhaId,
      ids,
      contexto.usuario.id,
    );
    mensagemCampanha =
      naCampanha === null
        ? ptBR.campanhas.naoEncontrada
        : ptBR.campanhas.adicionados(naCampanha, ids.length - naCampanha, false);
    revalidatePath("/painel/campanhas");
    revalidatePath("/painel/campanhas/[id]", "page");
  }

  revalidatePath("/painel/busca");
  revalidatePath("/painel/leads");
  revalidatePath("/painel");
  return {
    sucesso: adicionados > 0 || mensagemCampanha !== "",
    mensagem: [t.resultado(adicionados, validado.data.length - adicionados), mensagemCampanha].filter(Boolean).join(" "),
  };
}
