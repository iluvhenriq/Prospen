import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { contatos } from "@/db/schema";
import { repositorioContatos } from "@/modules/leads/repositorio-contatos";
import { repositorioLeads } from "@/modules/leads/repositorio";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

// Registro de contatos e próxima ação (27/10/2026), em um banco de verdade (em
// memória), com duas empresas lado a lado.
describe("contatos e próxima ação no banco", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let empresaA: string;
  let empresaB: string;
  let leadA: string;
  let leadB: string;

  const contatosA = () => repositorioContatos(amb.db, empresaA);
  const contatosB = () => repositorioContatos(amb.db, empresaB);
  const leadsA = () => repositorioLeads(amb.db, empresaA);
  const leadsB = () => repositorioLeads(amb.db, empresaB);

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    ana = await cadastrarPessoa(amb, "Ana Souza", "ana@empresa-a.com.br");
    bruno = await cadastrarPessoa(amb, "Bruno Lima", "bruno@empresa-b.com.br");
    empresaA = await criarEmpresa(amb, ana, "Barbearia A", "barbearia-a");
    empresaB = await criarEmpresa(amb, bruno, "Clínica B", "clinica-b");
    leadA = (await leadsA().criar({ nome: "Padaria da A" }, ana.id)).id;
    leadB = (await leadsB().criar({ nome: "Oficina da B" }, bruno.id)).id;
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  describe("contatos", () => {
    it("registra e lista do mais recente para o mais antigo, com o autor", async () => {
      await contatosA().registrar(leadA, "ligacao", "nao_atendeu", ana.id);
      await contatosA().registrar(leadA, "whatsapp", "pediu_retorno", ana.id);
      const lista = await contatosA().listar(leadA);
      expect(lista.map((c) => c.resultado)).toEqual(["pediu_retorno", "nao_atendeu"]);
      expect(lista[0].autorNome).toBe("Ana Souza");
    });

    it("resume tentativas e a data da última por lead", async () => {
      const resumo = await contatosA().resumo([leadA]);
      expect(resumo.get(leadA)?.tentativas).toBe(2);
      expect(resumo.get(leadA)?.ultimo).toBeInstanceOf(Date);
      expect((await contatosA().resumo([])).size).toBe(0);
    });

    it("uma empresa não registra nem enxerga contatos do lead da outra", async () => {
      expect(await contatosB().registrar(leadA, "ligacao", "conversou", bruno.id)).toBeNull();
      expect(await contatosA().registrar(leadB, "ligacao", "conversou", ana.id)).toBeNull();
      expect(await contatosB().listar(leadA)).toEqual([]);
      expect((await contatosB().resumo([leadA])).size).toBe(0);
    });

    it("o banco recusa contato apontando para o lead de outra empresa e valores fora da lista", async () => {
      await expect(
        amb.pg.query(
          `insert into contatos (organizacao_id, lead_id, canal, resultado) values ($1, $2, 'ligacao', 'conversou')`,
          [empresaB, leadA],
        ),
      ).rejects.toThrow();
      await expect(
        amb.pg.query(
          `insert into contatos (organizacao_id, lead_id, canal, resultado) values ($1, $2, 'pombo', 'conversou')`,
          [empresaA, leadA],
        ),
      ).rejects.toThrow();
      await expect(
        amb.pg.query(
          `insert into contatos (organizacao_id, lead_id, canal, resultado) values ($1, $2, 'ligacao', 'talvez')`,
          [empresaA, leadA],
        ),
      ).rejects.toThrow();
    });

    it("apagar o lead apaga os contatos dele", async () => {
      const lead = await leadsA().criar({ nome: "Descartável" }, ana.id);
      await contatosA().registrar(lead.id, "email", "sem_interesse", ana.id);
      await leadsA().excluir(lead.id);
      expect(await amb.db.select().from(contatos).where(eq(contatos.leadId, lead.id))).toEqual([]);
    });

    it("exige o identificador da empresa", () => {
      expect(() => repositorioContatos(amb.db, "")).toThrow();
    });
  });

  describe("negócios encerrados para o aprendizado", () => {
    it("traz só ganhos e perdidos desta empresa, com as tentativas de cada um", async () => {
      const perdido = await leadsA().criar({ nome: "Perdido por preço" }, ana.id);
      await contatosA().registrar(perdido.id, "ligacao", "nao_atendeu", ana.id);
      await contatosA().registrar(perdido.id, "ligacao", "sem_interesse", ana.id);
      await leadsA().mudarEtapa(perdido.id, "perdido", ana.id);
      await leadsA().registrarMotivoPerda(perdido.id, "preco");
      // Um lead da B encerrado não pode aparecer para a A.
      await leadsB().mudarEtapa(leadB, "ganho", bruno.id);

      const encerrados = await leadsA().encerrados();
      expect(encerrados).toHaveLength(1);
      expect(encerrados[0]).toMatchObject({ etapa: "perdido", motivoPerda: "preco", tentativas: 2 });

      const daB = await leadsB().encerrados();
      expect(daB).toHaveLength(1);
      expect(daB[0]).toMatchObject({ etapa: "ganho", tentativas: 0 });
    });
  });

  describe("próxima ação e agenda", () => {
    it("define, mostra na agenda até a data e apaga", async () => {
      const lead = await leadsA().definirProximaAcao(leadA, "2026-10-27", "  Mandar proposta  ");
      expect(lead?.proximaAcaoEm).toBe("2026-10-27");
      expect(lead?.proximaAcao).toBe("Mandar proposta");

      expect((await leadsA().agenda("2026-10-26")).total).toBe(0);
      const hoje = await leadsA().agenda("2026-10-27");
      expect(hoje.total).toBe(1);
      expect(hoje.leads[0].id).toBe(leadA);

      const apagada = await leadsA().definirProximaAcao(leadA, null, "ignorado sem data");
      expect(apagada?.proximaAcaoEm).toBeNull();
      expect(apagada?.proximaAcao).toBeNull();
      expect((await leadsA().agenda("2030-01-01")).total).toBe(0);
    });

    it("atrasados vêm antes dos do dia", async () => {
      const outro = await leadsA().criar({ nome: "Atrasado" }, ana.id);
      await leadsA().definirProximaAcao(leadA, "2026-10-27", null);
      await leadsA().definirProximaAcao(outro.id, "2026-10-20", "Ligar de novo");
      const agenda = await leadsA().agenda("2026-10-27");
      expect(agenda.leads.map((l) => l.nome)).toEqual(["Atrasado", "Padaria da A"]);
    });

    it("uma empresa não define nem vê a próxima ação da outra", async () => {
      expect(await leadsB().definirProximaAcao(leadA, "2026-10-27", "Invasão")).toBeNull();
      expect((await leadsB().agenda("2030-01-01")).leads.map((l) => l.id)).not.toContain(leadA);
    });

    it("o banco recusa texto sem data e texto longo demais", async () => {
      await expect(
        amb.pg.query(`update leads set proxima_acao_em = null, proxima_acao = 'x' where id = $1`, [leadA]),
      ).rejects.toThrow();
      await expect(
        amb.pg.query(`update leads set proxima_acao_em = '2026-10-27', proxima_acao = $2 where id = $1`, [
          leadA,
          "x".repeat(201),
        ]),
      ).rejects.toThrow();
    });
  });
});
