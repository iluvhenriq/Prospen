import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  contatos,
  ETAPAS_FUNIL,
  historicoEtapas,
  leadEtiquetas,
  leads,
  type EtapaFunil,
  type Lead,
  type MotivoPerda,
  type NovoLead,
  type OrigemLead,
} from "@/db/schema";
import type { Banco } from "@/db/tipos";
import { regraDeUnicidadeViolada } from "@/lib/erro-unico";
import { cnpjValido, normalizarCnpj } from "./cnpj";
import {
  escaparLike,
  normalizarEmail,
  normalizarTelefone,
  normalizarTexto,
} from "./normalizacao";
import type { DadosLead } from "./validacao";

// ÚNICO lugar que consulta a tabela de leads.
//
// Como o isolamento funciona: o repositório é criado já amarrado a UMA
// organização. Toda consulta, alteração e exclusão carrega "organizacao_id = X"
// dentro do próprio comando SQL. Não existe função aqui que aceite o
// identificador da organização como parâmetro de uma operação, então nenhuma tela
// consegue esquecer o filtro nem apontar para outra empresa.
//
// Se um identificador de outra empresa for informado, o resultado é o mesmo de
// "não existe": nulo, falso ou lista vazia.

export type DadosAtualizacaoLead = Partial<
  Pick<NovoLead, "nome" | "empresa" | "email" | "telefone" | "pais">
>;

export type IndicadoresDosLeads = {
  porEtapa: Partial<Record<EtapaFunil, number>>;
  porOrigem: Partial<Record<OrigemLead, number>>;
  // Leads em "perdido", por motivo (nulo = sem motivo informado).
  porMotivo: { motivo: MotivoPerda | null; total: number }[];
  // Vendas com valor informado, por moeda (normalmente uma só, a da empresa).
  vendas: { moeda: string; centavos: number; vendas: number }[];
  novos: number;
};

// Lead vindo da busca na base pública, com a cópia dos dados da Receita.
export type LeadDaBaseCnpj = {
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  cnpj: string;
  porte: string | null;
  naturezaJuridica: string | null;
  dataAbertura: string | null;
  matriz: boolean | null;
  cnaePrincipal: string | null;
};

export type FiltrosLeads = {
  // Texto digitado na busca. Cada palavra precisa aparecer no nome, empresa,
  // e-mail ou telefone, sem diferenciar maiúsculas nem acentos.
  busca?: string;
  origem?: OrigemLead;
  etapa?: EtapaFunil;
  // Identificador de uma etiqueta. Precisa ser um UUID válido (a tela confere).
  etiquetaId?: string;
};

export type ParametrosListagem = FiltrosLeads & {
  limite?: number;
  deslocamento?: number;
};

export type CampoDuplicado = "email" | "telefone" | "cnpj";

// Já existe um lead da mesma empresa com este CNPJ, ou, entre os leads sem
// CNPJ, com este e-mail ou telefone. A mensagem é só para registro: a tela usa
// o campo para escolher o texto.
export class ErroLeadDuplicado extends Error {
  constructor(public readonly campo: CampoDuplicado) {
    super(`Lead duplicado (${campo}).`);
    this.name = "ErroLeadDuplicado";
  }
}

// Resultado de mudarEtapa. "mudou" é falso quando o lead já estava na etapa
// pedida: nada é gravado e o histórico não ganha registro repetido.
export type MudancaDeEtapa = { lead: Lead; mudou: boolean };

// Negócio encerrado, só com o que o aprendizado do painel usa.
export type LeadEncerrado = Pick<
  Lead,
  "motivoPerda" | "origem" | "telefone" | "email" | "dataAbertura" | "porte" | "matriz" | "naturezaJuridica"
> & { etapa: "ganho" | "perdido"; tentativas: number };

// Lead com CNPJ, só com o que o Radar usa para cruzar com a base pública.
export type LeadComCnpj = Pick<Lead, "id" | "nome" | "empresa" | "etapa"> & { cnpj: string };

export type ColunaDoQuadro = {
  etapa: EtapaFunil;
  total: number;
  leads: Lead[];
};

export type DuplicadoEncontrado = {
  campo: CampoDuplicado;
  lead: { id: string; nome: string };
};

const TAMANHO_DO_LOTE = 500;
const TAMANHO_DA_CONSULTA = 1000;

function camposNormalizados(
  email: string | null | undefined,
  telefone: string | null | undefined,
  pais: string,
) {
  return {
    emailNormalizado: normalizarEmail(email),
    telefoneNormalizado: normalizarTelefone(telefone, pais),
  };
}

// Transforma a violação de unicidade do banco em um erro que a tela entende.
function traduzirErro(erro: unknown): unknown {
  const regra = regraDeUnicidadeViolada(erro);
  if (regra === null) return erro;
  if (regra.includes("cnpj")) return new ErroLeadDuplicado("cnpj");
  if (regra.includes("email")) return new ErroLeadDuplicado("email");
  if (regra.includes("telefone")) return new ErroLeadDuplicado("telefone");
  return erro;
}

export function repositorioLeads(db: Banco, organizacaoId: string) {
  if (!organizacaoId) {
    throw new Error("repositorioLeads exige o identificador da organização.");
  }

  const daOrganizacao = eq(leads.organizacaoId, organizacaoId);

  function condicoes(filtros: FiltrosLeads): SQL {
    const extras: SQL[] = [daOrganizacao];

    if (filtros.origem) extras.push(eq(leads.origem, filtros.origem));
    if (filtros.etapa) extras.push(eq(leads.etapa, filtros.etapa));

    if (filtros.etiquetaId) {
      extras.push(
        exists(
          db
            .select({ um: sql`1` })
            .from(leadEtiquetas)
            .where(
              and(
                eq(leadEtiquetas.leadId, leads.id),
                eq(leadEtiquetas.etiquetaId, filtros.etiquetaId),
                eq(leadEtiquetas.organizacaoId, organizacaoId),
              ),
            ),
        ),
      );
    }

    const palavras = (filtros.busca ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 6);
    const campoDeBusca = sql`unaccent(lower(concat_ws(' ', ${leads.nome}, ${leads.empresa}, ${leads.email}, ${leads.telefone})))`;
    for (const palavra of palavras) {
      const padrao = `%${escaparLike(normalizarTexto(palavra))}%`;
      const digitos = palavra.replace(/\D/g, "");
      const porTexto = sql`${campoDeBusca} like ${padrao}`;
      // "99999" também acha "(11) 99999-0000", que guarda só os dígitos.
      extras.push(
        digitos.length >= 3
          ? sql`(${porTexto} or ${leads.telefoneNormalizado} like ${`%${digitos}%`})`
          : porTexto,
      );
    }

    return and(...extras) as SQL;
  }

  async function buscar(id: string): Promise<Lead | null> {
    const [linha] = await db
      .select()
      .from(leads)
      .where(and(daOrganizacao, eq(leads.id, id)))
      .limit(1);
    return linha ?? null;
  }

  return {
    async listar({
      limite = 50,
      deslocamento = 0,
      ...filtros
    }: ParametrosListagem = {}): Promise<Lead[]> {
      return db
        .select()
        .from(leads)
        .where(condicoes(filtros))
        .orderBy(desc(leads.criadoEm), desc(leads.id))
        .limit(Math.min(Math.max(limite, 1), 200))
        .offset(Math.max(deslocamento, 0));
    },

    // Exportação em CSV: os mesmos filtros da lista, sem paginação, até o limite.
    async paraExportar(filtros: FiltrosLeads, limite: number): Promise<Lead[]> {
      return db
        .select()
        .from(leads)
        .where(condicoes(filtros))
        .orderBy(desc(leads.criadoEm), desc(leads.id))
        .limit(Math.max(limite, 1));
    },

    async contar(filtros: FiltrosLeads = {}): Promise<number> {
      const [linha] = await db
        .select({ total: count() })
        .from(leads)
        .where(condicoes(filtros));
      return linha?.total ?? 0;
    },

    buscar,

    async criar(dados: NovoLead, criadoPorId: string | null): Promise<Lead> {
      const pais = dados.pais ?? "BR";
      const cnpj = normalizarCnpj(dados.cnpj);
      // Quem chama já validou. Esta checagem só impede gravar lixo por engano.
      if (cnpj && !cnpjValido(cnpj)) throw new Error("CNPJ inválido.");
      try {
        // Só os campos conhecidos são gravados, e organização e autoria vêm
        // depois, para vencerem qualquer valor extra que tenha vindo nos dados.
        const [linha] = await db
          .insert(leads)
          .values({
            nome: dados.nome,
            empresa: dados.empresa,
            email: dados.email,
            telefone: dados.telefone,
            origem: dados.origem,
            pais,
            cnpj,
            ...camposNormalizados(dados.email, dados.telefone, pais),
            organizacaoId,
            criadoPorId,
          })
          .returning();
        return linha;
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    // Grava vários leads de uma vez (importação). Quem já existe (mesmo e-mail
    // ou telefone) é pulado, mesmo que tenha sido criado há um instante por
    // outra pessoa. Devolve quantos foram realmente gravados.
    async criarVarios(
      lista: DadosLead[],
      criadoPorId: string | null,
      origem: OrigemLead,
    ): Promise<number> {
      let gravados = 0;
      for (let inicio = 0; inicio < lista.length; inicio += TAMANHO_DO_LOTE) {
        const lote = lista.slice(inicio, inicio + TAMANHO_DO_LOTE).map((dados) => ({
          nome: dados.nome,
          empresa: dados.empresa,
          email: dados.email,
          telefone: dados.telefone,
          pais: dados.pais,
          origem,
          ...camposNormalizados(dados.email, dados.telefone, dados.pais),
          organizacaoId,
          criadoPorId,
        }));
        const inseridos = await db
          .insert(leads)
          .values(lote)
          .onConflictDoNothing()
          .returning({ id: leads.id });
        gravados += inseridos.length;
      }
      return gravados;
    },

    // Leads vindos da busca na base pública. O CNPJ identifica o lead: quem já
    // existe nesta empresa é pulado. Base legal: legítimo interesse sobre dado
    // tornado público pela Receita, implícita na origem "busca_cnpj" (decisão
    // de LGPD de 23/10/2026, docs/arquitetura.md). Devolve quantos entraram.
    async criarDaBaseCnpj(lista: LeadDaBaseCnpj[], criadoPorId: string | null): Promise<number> {
      if (lista.length === 0) return 0;
      if (lista.some((item) => !cnpjValido(item.cnpj))) throw new Error("CNPJ inválido.");
      const inseridos = await db
        .insert(leads)
        .values(
          lista.map((item) => ({
            nome: item.nome,
            empresa: item.empresa,
            email: item.email,
            telefone: item.telefone,
            cnpj: item.cnpj,
            porte: item.porte,
            naturezaJuridica: item.naturezaJuridica,
            dataAbertura: item.dataAbertura,
            matriz: item.matriz,
            cnaePrincipal: item.cnaePrincipal,
            pais: "BR",
            origem: "busca_cnpj" as const,
            ...camposNormalizados(item.email, item.telefone, "BR"),
            organizacaoId,
            criadoPorId,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: leads.id });
      return inseridos.length;
    },

    // Identificadores dos leads que passam no filtro da lista (para colocar
    // numa campanha de uma vez). Até "limite", dos mais novos.
    async idsPorFiltro(filtros: FiltrosLeads, limite: number): Promise<string[]> {
      const linhas = await db
        .select({ id: leads.id })
        .from(leads)
        .where(condicoes(filtros))
        .orderBy(desc(leads.criadoEm), desc(leads.id))
        .limit(Math.max(limite, 0));
      return linhas.map((linha) => linha.id);
    },

    // Números do painel (etapa 7), só desta empresa. Contagens agrupadas no
    // banco; nenhum lead individual sai daqui.
    async indicadores(novosDesde: Date): Promise<IndicadoresDosLeads> {
      const [porEtapa, porOrigem, porMotivo, vendas, [novos]] = await Promise.all([
        db.select({ chave: leads.etapa, total: count() }).from(leads).where(daOrganizacao).groupBy(leads.etapa),
        db.select({ chave: leads.origem, total: count() }).from(leads).where(daOrganizacao).groupBy(leads.origem),
        db
          .select({ chave: leads.motivoPerda, total: count() })
          .from(leads)
          .where(and(daOrganizacao, eq(leads.etapa, "perdido")))
          .groupBy(leads.motivoPerda),
        db
          .select({
            moeda: leads.moedaVenda,
            total: sql<string>`sum(${leads.valorVendaCentavos})`,
            vendas: count(),
          })
          .from(leads)
          .where(and(daOrganizacao, eq(leads.etapa, "ganho"), isNotNull(leads.valorVendaCentavos)))
          .groupBy(leads.moedaVenda),
        db
          .select({ total: count() })
          .from(leads)
          .where(and(daOrganizacao, gte(leads.criadoEm, novosDesde))),
      ]);
      return {
        porEtapa: Object.fromEntries(porEtapa.map((linha) => [linha.chave, linha.total])),
        porOrigem: Object.fromEntries(porOrigem.map((linha) => [linha.chave, linha.total])),
        porMotivo: porMotivo.map((linha) => ({ motivo: linha.chave, total: linha.total })),
        // A soma vem como texto do PostgreSQL (bigint); cabe em número com folga.
        vendas: vendas
          .filter((linha): linha is typeof linha & { moeda: string } => Boolean(linha.moeda))
          .map((linha) => ({ moeda: linha.moeda, centavos: Number(linha.total), vendas: linha.vendas })),
        novos: novos?.total ?? 0,
      };
    },

    // Negócios encerrados (ganhos e perdidos), dos mais recentes, só com o que o
    // aprendizado do painel usa, e quantas tentativas de contato cada um teve.
    async encerrados(limite = 5000): Promise<LeadEncerrado[]> {
      // Tentativas por lead, contadas uma vez e juntadas pelo identificador.
      const tentativasPorLead = db
        .select({ leadId: contatos.leadId, total: count().as("total") })
        .from(contatos)
        .where(eq(contatos.organizacaoId, organizacaoId))
        .groupBy(contatos.leadId)
        .as("tentativas_por_lead");
      const linhas = await db
        .select({
          etapa: leads.etapa,
          motivoPerda: leads.motivoPerda,
          origem: leads.origem,
          telefone: leads.telefone,
          email: leads.email,
          dataAbertura: leads.dataAbertura,
          porte: leads.porte,
          matriz: leads.matriz,
          naturezaJuridica: leads.naturezaJuridica,
          tentativas: sql<number>`coalesce(${tentativasPorLead.total}, 0)::int`,
        })
        .from(leads)
        .leftJoin(tentativasPorLead, eq(tentativasPorLead.leadId, leads.id))
        .where(and(daOrganizacao, inArray(leads.etapa, ["ganho", "perdido"])))
        .orderBy(desc(leads.etapaAtualizadaEm))
        .limit(Math.min(Math.max(limite, 1), 20000));
      // O filtro acima garante que a etapa é "ganho" ou "perdido".
      return linhas as LeadEncerrado[];
    },

    // Motivo da perda: só grava se o lead estiver em "perdido" AGORA (a
    // condição vai no próprio comando, então não há janela entre conferir e
    // gravar). Falso se o lead não existe nesta empresa ou mudou de etapa.
    async registrarMotivoPerda(id: string, motivo: MotivoPerda | null): Promise<boolean> {
      const linhas = await db
        .update(leads)
        .set({ motivoPerda: motivo })
        .where(and(daOrganizacao, eq(leads.id, id), eq(leads.etapa, "perdido")))
        .returning({ id: leads.id });
      return linhas.length > 0;
    },

    // Valor da venda, em centavos, na moeda informada. Mesma regra: só em "ganho".
    async registrarValorVenda(id: string, centavos: number | null, moeda: string): Promise<boolean> {
      const linhas = await db
        .update(leads)
        .set({ valorVendaCentavos: centavos, moedaVenda: centavos === null ? null : moeda })
        .where(and(daOrganizacao, eq(leads.id, id), eq(leads.etapa, "ganho")))
        .returning({ id: leads.id });
      return linhas.length > 0;
    },

    // Quantos OUTROS leads desta empresa têm o mesmo e-mail ou telefone. Na
    // base pública, o contato muitas vezes é do contador e se repete entre
    // negócios diferentes; a tela avisa para ninguém achar que é do dono.
    async contatoCompartilhado(lead: Pick<Lead, "id" | "emailNormalizado" | "telefoneNormalizado">) {
      const contar = async (condicao: SQL) => {
        const [linha] = await db
          .select({ total: count() })
          .from(leads)
          .where(and(daOrganizacao, ne(leads.id, lead.id), condicao));
        return linha?.total ?? 0;
      };
      const [email, telefone] = await Promise.all([
        lead.emailNormalizado ? contar(eq(leads.emailNormalizado, lead.emailNormalizado)) : 0,
        lead.telefoneNormalizado ? contar(eq(leads.telefoneNormalizado, lead.telefoneNormalizado)) : 0,
      ]);
      return { email, telefone };
    },

    // Identificadores dos leads desta empresa com estes CNPJs.
    async idsPorCnpj(cnpjs: string[]): Promise<string[]> {
      if (cnpjs.length === 0) return [];
      const linhas = await db
        .select({ id: leads.id })
        .from(leads)
        .where(and(daOrganizacao, inArray(leads.cnpj, cnpjs)));
      return linhas.map((linha) => linha.id);
    },

    // Quais destes CNPJs já são leads nesta empresa (para marcar na busca).
    async cnpjsQueJaSaoLeads(cnpjs: string[]): Promise<Set<string>> {
      if (cnpjs.length === 0) return new Set();
      const linhas = await db
        .select({ cnpj: leads.cnpj })
        .from(leads)
        .where(and(daOrganizacao, inArray(leads.cnpj, cnpjs)));
      return new Set(linhas.map((linha) => linha.cnpj).filter((cnpj): cnpj is string => Boolean(cnpj)));
    },

    // Leads desta empresa que têm CNPJ (Radar): só o necessário para cruzar com
    // as mudanças da base pública. Os mais recentes primeiro.
    async comCnpj(limite = 5000): Promise<LeadComCnpj[]> {
      const linhas = await db
        .select({ id: leads.id, nome: leads.nome, empresa: leads.empresa, cnpj: leads.cnpj, etapa: leads.etapa })
        .from(leads)
        .where(and(daOrganizacao, isNotNull(leads.cnpj)))
        .orderBy(desc(leads.criadoEm))
        .limit(limite);
      return linhas.filter((linha): linha is LeadComCnpj => linha.cnpj !== null);
    },

    async atualizar(id: string, dados: DadosAtualizacaoLead): Promise<Lead | null> {
      const atual = await buscar(id);
      if (!atual) return null;

      // Só estes campos podem mudar. Organização, origem, autoria e CNPJ (que
      // identifica o lead) ficam de fora.
      const nome = dados.nome ?? atual.nome;
      const empresa = dados.empresa === undefined ? atual.empresa : dados.empresa;
      const email = dados.email === undefined ? atual.email : dados.email;
      const telefone = dados.telefone === undefined ? atual.telefone : dados.telefone;
      const pais = dados.pais ?? atual.pais;

      try {
        const [linha] = await db
          .update(leads)
          .set({
            nome,
            empresa,
            email,
            telefone,
            pais,
            ...camposNormalizados(email, telefone, pais),
          })
          .where(and(daOrganizacao, eq(leads.id, id)))
          .returning();
        return linha ?? null;
      } catch (erro) {
        throw traduzirErro(erro);
      }
    },

    // ÚNICO jeito de mudar a etapa de um lead. Muda a etapa e grava o histórico
    // na mesma transação: ou as duas coisas acontecem, ou nenhuma. A linha do
    // lead fica travada até o fim, então duas pessoas movendo o mesmo lead ao
    // mesmo tempo geram dois registros coerentes (A para B, depois B para C).
    // Nulo: o lead não existe nesta empresa.
    async mudarEtapa(
      id: string,
      etapa: EtapaFunil,
      alteradoPorId: string | null,
    ): Promise<MudancaDeEtapa | null> {
      return db.transaction(async (tx) => {
        const [atual] = await tx
          .select()
          .from(leads)
          .where(and(daOrganizacao, eq(leads.id, id)))
          .for("update");
        if (!atual) return null;
        if (atual.etapa === etapa) return { lead: atual, mudou: false };

        // O resultado (motivo da perda, valor da venda) só vale na etapa dele.
        const [lead] = await tx
          .update(leads)
          .set({
            etapa,
            etapaAtualizadaEm: new Date(),
            ...(etapa === "perdido" ? {} : { motivoPerda: null }),
            ...(etapa === "ganho" ? {} : { valorVendaCentavos: null, moedaVenda: null }),
          })
          .where(and(daOrganizacao, eq(leads.id, id)))
          .returning();
        await tx.insert(historicoEtapas).values({
          organizacaoId,
          leadId: id,
          etapaAnterior: atual.etapa,
          etapaNova: etapa,
          alteradoPorId,
        });
        return { lead, mudou: true };
      });
    },

    // Próxima ação do lead: data (AAAA-MM-DD) e, opcional, o que fazer. Data
    // nula apaga a próxima ação. Nulo: o lead não existe nesta empresa.
    async definirProximaAcao(id: string, em: string | null, texto: string | null): Promise<Lead | null> {
      const [lead] = await db
        .update(leads)
        .set({ proximaAcaoEm: em, proximaAcao: em ? texto?.trim() || null : null })
        .where(and(daOrganizacao, eq(leads.id, id)))
        .returning();
      return lead ?? null;
    },

    // Tela "Hoje": leads com próxima ação até a data informada (atrasados
    // primeiro, depois os do dia), e quantos são no total.
    async agenda(ate: string, limite = 100): Promise<{ leads: Lead[]; total: number }> {
      const filtro = and(daOrganizacao, isNotNull(leads.proximaAcaoEm), lte(leads.proximaAcaoEm, ate));
      const [linhas, [{ total }]] = await Promise.all([
        db
          .select()
          .from(leads)
          .where(filtro)
          .orderBy(asc(leads.proximaAcaoEm), asc(leads.nome), asc(leads.id))
          .limit(Math.min(Math.max(limite, 1), 500)),
        db.select({ total: count() }).from(leads).where(filtro),
      ]);
      return { leads: linhas, total };
    },

    // Colunas do quadro do funil, na ordem das etapas. Cada coluna traz o total
    // de leads e os mais recentemente movidos, até o limite.
    async quadro(limitePorEtapa = 30): Promise<ColunaDoQuadro[]> {
      const limite = Math.min(Math.max(limitePorEtapa, 1), 100);
      const totais = await db
        .select({ etapa: leads.etapa, total: count() })
        .from(leads)
        .where(daOrganizacao)
        .groupBy(leads.etapa);
      const totalPorEtapa = new Map(totais.map((linha) => [linha.etapa, linha.total]));

      return Promise.all(
        ETAPAS_FUNIL.map(async (etapa) => {
          const total = totalPorEtapa.get(etapa) ?? 0;
          const itens =
            total === 0
              ? []
              : await db
                  .select()
                  .from(leads)
                  .where(and(daOrganizacao, eq(leads.etapa, etapa)))
                  .orderBy(desc(leads.etapaAtualizadaEm), desc(leads.id))
                  .limit(limite);
          return { etapa, total, leads: itens };
        }),
      );
    },

    async excluir(id: string): Promise<boolean> {
      const apagados = await db
        .delete(leads)
        .where(and(daOrganizacao, eq(leads.id, id)))
        .returning({ id: leads.id });
      return apagados.length > 0;
    },

    // Leads da empresa que já ocupam esta identidade, segundo a mesma regra dos
    // índices do banco: com CNPJ, só o CNPJ conta; sem CNPJ, contam o e-mail e o
    // telefone, comparados só com outros leads sem CNPJ. Serve para avisar com
    // clareza antes de gravar. O banco continua sendo a garantia final.
    // Na edição (ignorarId), o CNPJ do próprio lead decide qual regra vale.
    async encontrarDuplicados({
      cnpj,
      email,
      telefone,
      pais = "BR",
      ignorarId,
    }: {
      cnpj?: string | null;
      email?: string | null;
      telefone?: string | null;
      pais?: string;
      ignorarId?: string;
    }): Promise<DuplicadoEncontrado[]> {
      const cnpjNormalizado = normalizarCnpj(cnpj);
      const temCnpj =
        cnpjNormalizado !== null || (ignorarId ? Boolean((await buscar(ignorarId))?.cnpj) : false);
      const emailNormalizado = temCnpj ? null : normalizarEmail(email);
      const telefoneNormalizado = temCnpj ? null : normalizarTelefone(telefone, pais);

      const criterios: SQL[] = [];
      if (cnpjNormalizado) criterios.push(eq(leads.cnpj, cnpjNormalizado));
      const contato: SQL[] = [];
      if (emailNormalizado) contato.push(eq(leads.emailNormalizado, emailNormalizado));
      if (telefoneNormalizado) contato.push(eq(leads.telefoneNormalizado, telefoneNormalizado));
      if (contato.length > 0) criterios.push(and(isNull(leads.cnpj), or(...contato)) as SQL);
      if (criterios.length === 0) return [];

      const linhas = await db
        .select({
          id: leads.id,
          nome: leads.nome,
          cnpj: leads.cnpj,
          emailNormalizado: leads.emailNormalizado,
          telefoneNormalizado: leads.telefoneNormalizado,
        })
        .from(leads)
        .where(
          and(daOrganizacao, or(...criterios), ignorarId ? ne(leads.id, ignorarId) : undefined),
        );

      const achados: DuplicadoEncontrado[] = [];
      for (const linha of linhas) {
        const lead = { id: linha.id, nome: linha.nome };
        if (cnpjNormalizado && linha.cnpj === cnpjNormalizado) {
          achados.push({ campo: "cnpj", lead });
        }
        if (linha.cnpj !== null) continue;
        if (emailNormalizado && linha.emailNormalizado === emailNormalizado) {
          achados.push({ campo: "email", lead });
        }
        if (telefoneNormalizado && linha.telefoneNormalizado === telefoneNormalizado) {
          achados.push({ campo: "telefone", lead });
        }
      }
      return achados;
    },

    // Dos e-mails e telefones informados (já padronizados), quais a empresa já tem
    // em leads sem CNPJ. Serve para a importação de planilha, que não traz CNPJ.
    async contatosExistentes(
      emails: string[],
      telefones: string[],
    ): Promise<{ emails: Set<string>; telefones: Set<string> }> {
      const encontrados = { emails: new Set<string>(), telefones: new Set<string>() };

      for (let i = 0; i < emails.length; i += TAMANHO_DA_CONSULTA) {
        const linhas = await db
          .select({ valor: leads.emailNormalizado })
          .from(leads)
          .where(
            and(
              daOrganizacao,
              isNull(leads.cnpj),
              inArray(leads.emailNormalizado, emails.slice(i, i + TAMANHO_DA_CONSULTA)),
            ),
          );
        for (const { valor } of linhas) if (valor) encontrados.emails.add(valor);
      }
      for (let i = 0; i < telefones.length; i += TAMANHO_DA_CONSULTA) {
        const linhas = await db
          .select({ valor: leads.telefoneNormalizado })
          .from(leads)
          .where(
            and(
              daOrganizacao,
              isNull(leads.cnpj),
              inArray(leads.telefoneNormalizado, telefones.slice(i, i + TAMANHO_DA_CONSULTA)),
            ),
          );
        for (const { valor } of linhas) if (valor) encontrados.telefones.add(valor);
      }
      return encontrados;
    },
  };
}

export type RepositorioLeads = ReturnType<typeof repositorioLeads>;
