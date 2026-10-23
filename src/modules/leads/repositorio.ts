import {
  and,
  count,
  desc,
  eq,
  exists,
  inArray,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  leadEtiquetas,
  leads,
  type Lead,
  type NovoLead,
  type OrigemLead,
} from "@/db/schema";
import type { Banco } from "@/db/tipos";
import { regraDeUnicidadeViolada } from "@/lib/erro-unico";
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

export type FiltrosLeads = {
  // Texto digitado na busca. Cada palavra precisa aparecer no nome, empresa,
  // e-mail ou telefone, sem diferenciar maiúsculas nem acentos.
  busca?: string;
  origem?: OrigemLead;
  // Identificador de uma etiqueta. Precisa ser um UUID válido (a tela confere).
  etiquetaId?: string;
};

export type ParametrosListagem = FiltrosLeads & {
  limite?: number;
  deslocamento?: number;
};

export type CampoDuplicado = "email" | "telefone";

// Já existe um lead da mesma empresa com este e-mail ou telefone.
export class ErroLeadDuplicado extends Error {
  constructor(public readonly campo: CampoDuplicado) {
    super(`Já existe um lead com este ${campo === "email" ? "e-mail" : "telefone"}.`);
    this.name = "ErroLeadDuplicado";
  }
}

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

    async atualizar(id: string, dados: DadosAtualizacaoLead): Promise<Lead | null> {
      const atual = await buscar(id);
      if (!atual) return null;

      // Só estes campos podem mudar. Organização, origem e autoria ficam de fora.
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

    async excluir(id: string): Promise<boolean> {
      const apagados = await db
        .delete(leads)
        .where(and(daOrganizacao, eq(leads.id, id)))
        .returning({ id: leads.id });
      return apagados.length > 0;
    },

    // Leads da empresa que já usam este e-mail ou telefone. Serve para avisar
    // com clareza antes de gravar. O banco continua sendo a garantia final.
    async encontrarDuplicados({
      email,
      telefone,
      pais = "BR",
      ignorarId,
    }: {
      email?: string | null;
      telefone?: string | null;
      pais?: string;
      ignorarId?: string;
    }): Promise<DuplicadoEncontrado[]> {
      const emailNormalizado = normalizarEmail(email);
      const telefoneNormalizado = normalizarTelefone(telefone, pais);
      const criterios: SQL[] = [];
      if (emailNormalizado) criterios.push(eq(leads.emailNormalizado, emailNormalizado));
      if (telefoneNormalizado) {
        criterios.push(eq(leads.telefoneNormalizado, telefoneNormalizado));
      }
      if (criterios.length === 0) return [];

      const linhas = await db
        .select({
          id: leads.id,
          nome: leads.nome,
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
        if (emailNormalizado && linha.emailNormalizado === emailNormalizado) {
          achados.push({ campo: "email", lead });
        }
        if (telefoneNormalizado && linha.telefoneNormalizado === telefoneNormalizado) {
          achados.push({ campo: "telefone", lead });
        }
      }
      return achados;
    },

    // Dos e-mails e telefones informados (já padronizados), quais a empresa já tem.
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
            and(daOrganizacao, inArray(leads.emailNormalizado, emails.slice(i, i + TAMANHO_DA_CONSULTA))),
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
