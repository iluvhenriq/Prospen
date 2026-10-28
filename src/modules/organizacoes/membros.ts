import { asc, eq } from "drizzle-orm";
import { member, organization } from "@/db/schema";
import type { Banco } from "@/db/tipos";

export type Papel = "owner" | "admin" | "member";

export type OrganizacaoDoUsuario = {
  organizacaoId: string;
  nome: string;
  papel: Papel;
};

const ORDEM: Papel[] = ["owner", "admin", "member"];

// Quem pode o quê. Cada ação diz o papel MÍNIMO exigido; papéis acima também podem.
// "Dono" e "membro" são os papéis do produto. O "admin" existe no login e fica
// entre os dois, mas as telas ainda não o oferecem.
// Toda ação nova que precise de restrição entra nesta lista.
export const PAPEL_MINIMO = {
  trabalharComLeads: "member",
  // Apagar uma etiqueta tira ela de todos os leads, por isso exige mais que criar.
  gerenciarEtiquetas: "admin",
  // Exportar leva a base inteira para fora do sistema (risco clássico de quem
  // sai da equipe levando os contatos): só administrador e dono.
  exportarLeads: "admin",
  // Criar campanha e colocar leads nela é trabalho do dia a dia; apagar uma
  // campanha some com o histórico dela, então exige mais.
  trabalharComCampanhas: "member",
  excluirCampanha: "admin",
  gerenciarEquipe: "admin",
  configurarEmpresa: "owner",
  excluirEmpresa: "owner",
} as const satisfies Record<string, Papel>;

export type Acao = keyof typeof PAPEL_MINIMO;

export function papelPode(papel: Papel, acao: Acao): boolean {
  return ORDEM.indexOf(papel) <= ORDEM.indexOf(PAPEL_MINIMO[acao]);
}

export class ErroSemPermissao extends Error {
  constructor(public readonly acao: Acao) {
    super(`Sem permissão para: ${acao}`);
    this.name = "ErroSemPermissao";
  }
}

// O Better Auth guarda o papel como texto e aceita vários separados por vírgula.
// Vale o mais alto. Qualquer valor desconhecido vira "member" (o menos poderoso).
export function papelMaisAlto(texto: string | null | undefined): Papel {
  const papeis = (texto ?? "").split(",").map((parte) => parte.trim());
  return ORDEM.find((papel) => papeis.includes(papel)) ?? "member";
}

// Descobre a qual empresa a pessoa pertence, SEMPRE pela tabela de membros.
// A empresa "ativa" guardada na sessão só vale se a pessoa realmente for
// membro dela. Nenhum identificador vindo do navegador é aceito sem essa checagem.
export async function resolverOrganizacao(
  db: Banco,
  usuarioId: string,
  ativaId?: string | null,
): Promise<OrganizacaoDoUsuario | null> {
  const linhas = await db
    .select({
      organizacaoId: member.organizationId,
      nome: organization.name,
      papel: member.role,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, usuarioId))
    .orderBy(asc(member.createdAt), asc(member.id));

  const escolhida =
    (ativaId ? linhas.find((linha) => linha.organizacaoId === ativaId) : undefined) ??
    linhas[0];
  if (!escolhida) return null;

  return {
    organizacaoId: escolhida.organizacaoId,
    nome: escolhida.nome,
    papel: papelMaisAlto(escolhida.papel),
  };
}
