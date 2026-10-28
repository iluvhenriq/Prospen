import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { member, organization, registrosAcesso, user } from "@/db/schema";
import { registrarAcesso } from "@/modules/contas/registros-acesso";
import { excluirConta, exportarDadosDaConta } from "@/modules/contas/titular";
import { repositorioLeads } from "@/modules/leads/repositorio";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

// Pedidos de titulares sobre a própria conta: exportar e excluir.
describe("pedidos do titular sobre a conta", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let carla: PessoaDeTeste;
  let empresaAna: string;
  let empresaBruno: string;
  let compartilhada: string;

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    ana = await cadastrarPessoa(amb, "Ana Souza", "ana@empresa-a.com.br");
    bruno = await cadastrarPessoa(amb, "Bruno Lima", "bruno@empresa-b.com.br");
    carla = await cadastrarPessoa(amb, "Carla Dias", "carla@empresa-c.com.br");
    empresaAna = await criarEmpresa(amb, ana, "Agência A", "agencia-a");
    empresaBruno = await criarEmpresa(amb, bruno, "Agência B", "agencia-b");
    compartilhada = await criarEmpresa(amb, carla, "Agência C", "agencia-c");
    // Ana também participa da empresa da Carla.
    await amb.db.insert(member).values({
      id: "membro-ana-c",
      organizationId: compartilhada,
      userId: ana.id,
      role: "member",
      createdAt: new Date(),
    });
    await repositorioLeads(amb.db, empresaAna).criar({ nome: "Lead da Ana", origem: "manual" }, ana.id);
    await repositorioLeads(amb.db, empresaBruno).criar({ nome: "Lead do Bruno", origem: "manual" }, bruno.id);
    await registrarAcesso(amb.db, ana.id, "203.0.113.7");
  });
  afterAll(async () => amb?.encerrar());

  it("exporta os dados da pessoa como usuária, sem os leads das empresas", async () => {
    const dados = await exportarDadosDaConta(amb.db, " ANA@empresa-a.com.br ");
    expect(dados?.usuario).toMatchObject({ nome: "Ana Souza", email: "ana@empresa-a.com.br" });
    expect(dados?.empresas.map((empresa) => empresa.nome).sort()).toEqual(["Agência A", "Agência C"]);
    expect(dados?.acessos).toEqual([expect.objectContaining({ ip: "203.0.113.7" })]);
    expect(JSON.stringify(dados)).not.toContain("Lead da Ana");
    expect(await exportarDadosDaConta(amb.db, "ninguem@exemplo.com.br")).toBeNull();
  });

  it("exclui a pessoa e a empresa só dela; mantém a compartilhada e não toca nas outras", async () => {
    const resultado = await excluirConta(amb.db, "ana@empresa-a.com.br");
    // A Carla continua dona da Agência C: ninguém precisa assumir.
    expect(resultado).toEqual({
      ok: true,
      empresasApagadas: ["Agência A"],
      empresasMantidas: ["Agência C"],
      novosDonos: [],
    });

    expect(await amb.db.select().from(user).where(eq(user.id, ana.id))).toEqual([]);
    expect(await amb.db.select().from(organization).where(eq(organization.id, empresaAna))).toEqual([]);
    expect(await repositorioLeads(amb.db, empresaAna).contar()).toBe(0);

    // A empresa compartilhada continua, agora só com a Carla.
    const integrantes = await amb.db.select().from(member).where(eq(member.organizationId, compartilhada));
    expect(integrantes.map((m) => m.userId)).toEqual([carla.id]);
    // A outra empresa e os dados dela não foram tocados.
    expect(await repositorioLeads(amb.db, empresaBruno).contar()).toBe(1);
    // O registro de acesso fica pelo prazo do Marco Civil.
    expect(await amb.db.select().from(registrosAcesso).where(eq(registrosAcesso.usuarioId, ana.id))).toHaveLength(1);
  });

  it("e-mail desconhecido não apaga nada", async () => {
    expect(await excluirConta(amb.db, "ninguem@exemplo.com.br")).toEqual({ ok: false, motivo: "nao_encontrado" });
  });

  // Desde a equipe por convite (28/10/2026), a empresa pode ter outras pessoas.
  // Sem dono, ninguém mais gerencia a equipe nem o plano.
  async function entrarNaEmpresa(empresa: string, pessoa: PessoaDeTeste, papel: string, criadoEm: Date) {
    await amb.db.insert(member).values({
      id: `membro-${pessoa.id}`,
      organizationId: empresa,
      userId: pessoa.id,
      role: papel,
      createdAt: criadoEm,
    });
  }

  // Cada pessoa destes casos participa de uma empresa só.
  async function papelDe(pessoa: PessoaDeTeste): Promise<string | undefined> {
    const [linha] = await amb.db.select({ papel: member.role }).from(member).where(eq(member.userId, pessoa.id));
    return linha?.papel;
  }

  it("a única dona sai: quem tem o papel mais alto assume, mesmo chegando depois", async () => {
    const dani = await cadastrarPessoa(amb, "Dani Rocha", "dani@empresa-d.com.br");
    const eva = await cadastrarPessoa(amb, "Eva Melo", "eva@empresa-d.com.br");
    const fabio = await cadastrarPessoa(amb, "Fábio Reis", "fabio@empresa-d.com.br");
    const empresaDani = await criarEmpresa(amb, dani, "Agência D", "agencia-d");
    await entrarNaEmpresa(empresaDani, eva, "member", new Date("2026-10-01T10:00:00Z"));
    await entrarNaEmpresa(empresaDani, fabio, "admin", new Date("2026-10-20T10:00:00Z"));

    const resultado = await excluirConta(amb.db, "dani@empresa-d.com.br");
    expect(resultado).toEqual({
      ok: true,
      empresasApagadas: [],
      empresasMantidas: ["Agência D"],
      novosDonos: [{ empresa: "Agência D", email: "fabio@empresa-d.com.br" }],
    });
    expect(await papelDe(fabio)).toBe("owner");
    expect(await papelDe(eva)).toBe("member");
  });

  it("no mesmo papel, assume quem está há mais tempo na empresa", async () => {
    const gil = await cadastrarPessoa(amb, "Gil Prado", "gil@empresa-g.com.br");
    const hugo = await cadastrarPessoa(amb, "Hugo Sá", "hugo@empresa-g.com.br");
    const iara = await cadastrarPessoa(amb, "Iara Luz", "iara@empresa-g.com.br");
    const empresaGil = await criarEmpresa(amb, gil, "Agência G", "agencia-g");
    // A Iara entra no banco primeiro, mas com data mais recente que a do Hugo.
    await entrarNaEmpresa(empresaGil, iara, "member", new Date("2026-10-25T10:00:00Z"));
    await entrarNaEmpresa(empresaGil, hugo, "member", new Date("2026-10-05T10:00:00Z"));

    const resultado = await excluirConta(amb.db, "gil@empresa-g.com.br");
    expect(resultado).toMatchObject({ ok: true, novosDonos: [{ empresa: "Agência G", email: "hugo@empresa-g.com.br" }] });
    expect(await papelDe(hugo)).toBe("owner");
    expect(await papelDe(iara)).toBe("member");
  });
});
