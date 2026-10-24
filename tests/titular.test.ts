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
    expect(resultado).toEqual({ ok: true, empresasApagadas: ["Agência A"], empresasMantidas: ["Agência C"] });

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
});
