import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { member, organization, registrosAcesso, user } from "@/db/schema";
import type { Banco } from "@/db/tipos";

// Pedidos de titulares sobre a PRÓPRIA conta (LGPD, art. 18), atendidos pelo
// responsável com os comandos `npm run conta:exportar` e `npm run conta:excluir`.
// Não há tela: o pedido chega pelo e-mail de privacidade e o responsável
// confere a identidade antes de rodar (procedimento em docs/lgpd/).
// Exceção consciente à regra "operação amarrada a uma empresa": aqui o ponto de
// partida é a pessoa, e só o responsável pelo sistema roda estes comandos.

export type DadosDaConta = {
  usuario: { nome: string; email: string; criadoEm: Date };
  empresas: { nome: string; papel: string; desde: Date }[];
  acessos: { ip: string | null; em: Date }[];
};

async function acharUsuario(db: Banco, email: string) {
  const [linha] = await db
    .select({ id: user.id, nome: user.name, email: user.email, criadoEm: user.createdAt })
    .from(user)
    .where(eq(user.email, email.trim().toLowerCase()))
    .limit(1);
  return linha ?? null;
}

// Acesso e portabilidade: tudo o que o PROSPEN guarda sobre a pessoa como
// usuária. Leads das empresas não entram: são dados da empresa cliente.
export async function exportarDadosDaConta(db: Banco, email: string): Promise<DadosDaConta | null> {
  const pessoa = await acharUsuario(db, email);
  if (!pessoa) return null;
  const [empresas, acessos] = await Promise.all([
    db
      .select({ nome: organization.name, papel: member.role, desde: member.createdAt })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(member.userId, pessoa.id))
      .orderBy(asc(member.createdAt)),
    db
      .select({ ip: registrosAcesso.ip, em: registrosAcesso.criadoEm })
      .from(registrosAcesso)
      .where(eq(registrosAcesso.usuarioId, pessoa.id))
      .orderBy(asc(registrosAcesso.criadoEm)),
  ]);
  return { usuario: { nome: pessoa.nome, email: pessoa.email, criadoEm: pessoa.criadoEm }, empresas, acessos };
}

export type ResultadoExclusao =
  | { ok: false; motivo: "nao_encontrado" }
  | { ok: true; empresasApagadas: string[]; empresasMantidas: string[] };

// Eliminação: apaga a pessoa (sessões, senha e vínculos vão junto, pelo banco)
// e as empresas em que ela era a ÚNICA integrante, com todos os dados delas.
// Empresa com outras pessoas continua: os dados são dela, não de quem saiu.
// Os registros de acesso ficam até o fim dos 6 meses (Marco Civil, art. 15).
export async function excluirConta(db: Banco, email: string): Promise<ResultadoExclusao> {
  const pessoa = await acharUsuario(db, email);
  if (!pessoa) return { ok: false, motivo: "nao_encontrado" };

  return db.transaction(async (tx) => {
    const minhas = await tx
      .select({ id: organization.id, nome: organization.name })
      .from(member)
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .where(eq(member.userId, pessoa.id));

    const outrosIntegrantes =
      minhas.length === 0
        ? []
        : await tx
            .select({ organizacaoId: member.organizationId, total: count() })
            .from(member)
            .where(and(inArray(member.organizationId, minhas.map((m) => m.id)), ne(member.userId, pessoa.id)))
            .groupBy(member.organizationId);
    const compartilhadas = new Set(outrosIntegrantes.filter((linha) => linha.total > 0).map((linha) => linha.organizacaoId));

    const apagar = minhas.filter((empresa) => !compartilhadas.has(empresa.id));
    if (apagar.length > 0) {
      // Leads, notas, etiquetas, funil, campanhas e importações vão junto (cascata).
      await tx.delete(organization).where(inArray(organization.id, apagar.map((empresa) => empresa.id)));
    }
    await tx.delete(user).where(eq(user.id, pessoa.id));

    return {
      ok: true,
      empresasApagadas: apagar.map((empresa) => empresa.nome),
      empresasMantidas: minhas.filter((empresa) => compartilhadas.has(empresa.id)).map((empresa) => empresa.nome),
    };
  });
}
