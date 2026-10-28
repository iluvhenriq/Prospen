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
import { salvarDaBaseNoLimite, temRecurso } from "@/modules/planos/acesso";
import { RESULTADOS_POR_PAGINA } from "./parametros";
import { repositorioBaseCnpj } from "./repositorio";
import { MAXIMO_DE_BUSCAS_VIGIADAS, repositorioBuscasVigiadas } from "./repositorio-buscas-vigiadas";

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
  // O limite mensal do plano vale aqui, no único caminho que salva empresas da base.
  const { adicionados, foraDoLimite, limite } = await salvarDaBaseNoLimite(
    contexto,
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
    mensagem: [
      t.resultado(adicionados, validado.data.length - adicionados - foraDoLimite),
      foraDoLimite > 0 && limite !== null ? ptBR.planos.foraDoLimite(foraDoLimite, limite) : "",
      mensagemCampanha,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

// ----------------------------------------------------------------------------
// Buscas vigiadas (etapa 9e)
// ----------------------------------------------------------------------------

export type EstadoVigiar = { mensagem?: string; sucesso?: boolean };

const filtrosParaVigiar = z
  .object({
    uf: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
    cidade: z.string().trim().regex(/^\d{0,7}$/),
    atividade: z.string().trim().max(80),
    mei: z.enum(["", "1"]),
  })
  .refine((filtros) => filtros.cidade !== "" || filtros.atividade !== "");

// Vigia a busca com os filtros do formulário (os mesmos da tela). A cidade é
// conferida contra a base: código que não é do estado é recusado.
export async function vigiarBusca(_anterior: EstadoVigiar, dados: FormData): Promise<EstadoVigiar> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const t = ptBR.busca.vigiar;
  if (!(await temRecurso(contexto, "buscasVigiadas"))) {
    return { mensagem: ptBR.planos.bloqueado(ptBR.planos.recursos.buscasVigiadas, ptBR.planos.nomes.medio, false) };
  }
  const lido = (campo: string) => {
    const valor = dados.get(campo);
    return typeof valor === "string" ? valor : "";
  };
  const validado = filtrosParaVigiar.safeParse({
    uf: lido("uf"),
    cidade: lido("cidade"),
    atividade: lido("atividade"),
    mei: lido("mei"),
  });
  if (!validado.success) return { mensagem: t.precisaFoco };

  const db = getDb();
  const { uf, cidade, atividade, mei } = validado.data;
  let municipioNome: string | null = null;
  if (cidade) {
    const municipio = (await repositorioBaseCnpj(db).municipiosDoEstado(uf)).find((m) => m.codigo === cidade);
    if (!municipio) return { mensagem: t.falhou };
    municipioNome = municipio.nome;
  }

  const resultado = await repositorioBuscasVigiadas(db, contexto.organizacao.id).vigiar(
    { uf, municipioCodigo: cidade, municipioNome, atividade, incluirMei: mei === "1" },
    contexto.usuario.id,
  );
  if (!resultado.ok) {
    return { mensagem: resultado.motivo === "limite" ? t.limite(MAXIMO_DE_BUSCAS_VIGIADAS) : t.repetida };
  }

  revalidatePath("/painel/busca");
  revalidatePath("/painel");
  return { sucesso: true, mensagem: t.feito };
}

export async function pararDeVigiar(dados: FormData): Promise<void> {
  const contexto = await exigirPermissao("trabalharComLeads");
  const id = dados.get("id");
  if (typeof id !== "string" || !ehUuid(id)) return;
  await repositorioBuscasVigiadas(getDb(), contexto.organizacao.id).excluir(id);
  revalidatePath("/painel/busca");
  revalidatePath("/painel");
}
