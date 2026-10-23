import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { historicoEtapas, organization } from "@/db/schema";
import {
  enderecoDaLista,
  lerParametrosLista,
  temFiltroAtivo,
} from "@/modules/leads/parametros";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { repositorioHistorico } from "@/modules/leads/repositorio-historico";
import { etapaValida } from "@/modules/leads/validacao-textos";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

// Funil de vendas e histórico de etapas em um banco de verdade (em memória),
// com duas empresas lado a lado.
describe("funil de vendas", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let empresaA: string;
  let empresaB: string;

  const leadsA = () => repositorioLeads(amb.db, empresaA);
  const leadsB = () => repositorioLeads(amb.db, empresaB);
  const historicoA = () => repositorioHistorico(amb.db, empresaA);
  const historicoB = () => repositorioHistorico(amb.db, empresaB);

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    ana = await cadastrarPessoa(amb, "Ana Souza", "ana@empresa-a.com.br");
    bruno = await cadastrarPessoa(amb, "Bruno Lima", "bruno@empresa-b.com.br");
    empresaA = await criarEmpresa(amb, ana, "Barbearia A", "barbearia-a");
    empresaB = await criarEmpresa(amb, bruno, "Clínica B", "clinica-b");
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  describe("entrada no funil", () => {
    it("lead cadastrado à mão entra na etapa Novo", async () => {
      const lead = await leadsA().criar({ nome: "Entrada manual" }, ana.id);
      expect(lead.etapa).toBe("novo");
      expect(lead.etapaAtualizadaEm).toBeInstanceOf(Date);
    });

    it("lead importado também entra na etapa Novo", async () => {
      await leadsA().criarVarios(
        [{ nome: "Entrada importada", empresa: null, email: null, telefone: null, pais: "BR" }],
        ana.id,
        "importacao",
      );
      const [lead] = await leadsA().listar({ busca: "entrada importada" });
      expect(lead.etapa).toBe("novo");
    });

    it("não dá para escolher a etapa ao criar nem ao editar o lead", async () => {
      const malicioso = { nome: "Já ganho", etapa: "ganho" } as never;
      const lead = await leadsA().criar(malicioso, ana.id);
      expect(lead.etapa).toBe("novo");

      const editado = await leadsA().atualizar(lead.id, { nome: "Editado", etapa: "ganho" } as never);
      expect(editado?.etapa).toBe("novo");
      expect(await historicoA().doLead(lead.id)).toEqual([]);
    });
  });

  describe("mudança de etapa", () => {
    let leadId: string;

    beforeAll(async () => {
      leadId = (await leadsA().criar({ nome: "Cliente em andamento" }, ana.id)).id;
    });

    it("muda a etapa e grava o histórico com a etapa anterior, a nova e o autor", async () => {
      const antes = await leadsA().buscar(leadId);
      await esperar(5);
      const resultado = await leadsA().mudarEtapa(leadId, "contatado", ana.id);

      expect(resultado?.mudou).toBe(true);
      expect(resultado?.lead.etapa).toBe("contatado");
      expect(resultado!.lead.etapaAtualizadaEm.getTime()).toBeGreaterThan(
        antes!.etapaAtualizadaEm.getTime(),
      );

      const [registro] = await historicoA().doLead(leadId);
      expect(registro).toMatchObject({
        etapaAnterior: "novo",
        etapaNova: "contatado",
        alteradoPorId: ana.id,
        autorNome: "Ana Souza",
        organizacaoId: empresaA,
      });
    });

    it("lista o histórico do mais recente para o mais antigo", async () => {
      await esperar(5);
      await leadsA().mudarEtapa(leadId, "proposta", ana.id);
      await esperar(5);
      await leadsA().mudarEtapa(leadId, "perdido", ana.id);
      await esperar(5);
      // Lead perdido pode voltar a ser trabalhado.
      await leadsA().mudarEtapa(leadId, "em_conversa", ana.id);

      const historico = await historicoA().doLead(leadId);
      expect(historico.map((r) => `${r.etapaAnterior}>${r.etapaNova}`)).toEqual([
        "perdido>em_conversa",
        "proposta>perdido",
        "contatado>proposta",
        "novo>contatado",
      ]);
      expect((await leadsA().buscar(leadId))?.etapa).toBe("em_conversa");
    });

    it("pedir a etapa em que o lead já está não grava nada", async () => {
      const antes = await historicoA().doLead(leadId);
      const resultado = await leadsA().mudarEtapa(leadId, "em_conversa", ana.id);
      expect(resultado?.mudou).toBe(false);
      expect(await historicoA().doLead(leadId)).toHaveLength(antes.length);
    });

    it("se a pessoa sair do sistema, o histórico fica sem autor", async () => {
      const carla = await cadastrarPessoa(amb, "Carla", "carla@teste.com.br");
      const lead = await leadsA().criar({ nome: "Movido por Carla" }, ana.id);
      await leadsA().mudarEtapa(lead.id, "ganho", carla.id);
      await amb.pg.query(`delete from "user" where id = $1`, [carla.id]);

      const [registro] = await historicoA().doLead(lead.id);
      expect(registro.alteradoPorId).toBeNull();
      expect(registro.autorNome).toBeNull();
      expect(registro.etapaNova).toBe("ganho");
    });

    it("apagar o lead apaga o histórico dele", async () => {
      const lead = await leadsA().criar({ nome: "Será apagado" }, ana.id);
      await leadsA().mudarEtapa(lead.id, "contatado", ana.id);
      await leadsA().excluir(lead.id);
      const restantes = await amb.db
        .select()
        .from(historicoEtapas)
        .where(eq(historicoEtapas.leadId, lead.id));
      expect(restantes).toEqual([]);
    });
  });

  describe("isolamento entre empresas", () => {
    let leadDaA: string;

    beforeAll(async () => {
      leadDaA = (await leadsA().criar({ nome: "Segredo da A" }, ana.id)).id;
      await leadsA().mudarEtapa(leadDaA, "proposta", ana.id);
    });

    it("outra empresa não muda a etapa do lead", async () => {
      expect(await leadsB().mudarEtapa(leadDaA, "perdido", bruno.id)).toBeNull();
      expect((await leadsA().buscar(leadDaA))?.etapa).toBe("proposta");
      expect(await historicoA().doLead(leadDaA)).toHaveLength(1);
    });

    it("outra empresa não lê o histórico do lead", async () => {
      expect(await historicoB().doLead(leadDaA)).toEqual([]);
      expect(await historicoA().doLead(leadDaA)).toHaveLength(1);
    });

    it("o quadro de cada empresa mostra só os seus leads", async () => {
      await leadsB().criar({ nome: "Lead da B" }, bruno.id);
      const quadroB = await leadsB().quadro();
      const nomesB = quadroB.flatMap((coluna) => coluna.leads.map((l) => l.nome));
      expect(nomesB).toEqual(["Lead da B"]);
      expect(quadroB.reduce((soma, coluna) => soma + coluna.total, 0)).toBe(1);

      const quadroA = await leadsA().quadro();
      const nomesA = quadroA.flatMap((coluna) => coluna.leads.map((l) => l.nome));
      expect(nomesA).toContain("Segredo da A");
      expect(nomesA).not.toContain("Lead da B");
    });

    it("o banco recusa histórico de uma empresa preso ao lead de outra", async () => {
      await expect(
        amb.pg.query(
          `insert into historico_etapas (organizacao_id, lead_id, etapa_anterior, etapa_nova)
           values ($1, $2, 'novo', 'contatado')`,
          [empresaB, leadDaA],
        ),
      ).rejects.toThrow();
    });

    it("exige o identificador da empresa", () => {
      expect(() => repositorioHistorico(amb.db, "")).toThrow();
    });
  });

  describe("regras do banco", () => {
    it("recusa etapa inventada no lead", async () => {
      await expect(
        amb.pg.query(`insert into leads (organizacao_id, nome, etapa) values ($1, 'x', 'fechado')`, [
          empresaA,
        ]),
      ).rejects.toThrow();
    });

    it("recusa histórico com etapa inventada ou sem mudança de verdade", async () => {
      const lead = await leadsA().criar({ nome: "Regras do histórico" }, ana.id);
      for (const [anterior, nova] of [
        ["novo", "fechado"],
        ["novo", "novo"],
      ]) {
        await expect(
          amb.pg.query(
            `insert into historico_etapas (organizacao_id, lead_id, etapa_anterior, etapa_nova)
             values ($1, $2, $3, $4)`,
            [empresaA, lead.id, anterior, nova],
          ),
        ).rejects.toThrow();
      }
    });
  });

  describe("quadro e filtro por etapa", () => {
    let quadroC: ReturnType<typeof repositorioLeads>;

    beforeAll(async () => {
      // Empresa só para este grupo, para as contagens não dependerem dos testes acima.
      const dani = await cadastrarPessoa(amb, "Dani", "dani@empresa-c.com.br");
      const empresaC = await criarEmpresa(amb, dani, "Loja C", "loja-c");
      quadroC = repositorioLeads(amb.db, empresaC);
      for (const nome of ["C1", "C2", "C3", "C4"]) {
        await quadroC.criar({ nome }, dani.id);
      }
      const [c1, c2, c3] = await quadroC.listar({ busca: "C" }).then((lista) =>
        ["C1", "C2", "C3"].map((nome) => lista.find((l) => l.nome === nome)!.id),
      );
      await quadroC.mudarEtapa(c1, "ganho", dani.id);
      await esperar(5);
      await quadroC.mudarEtapa(c2, "ganho", dani.id);
      await quadroC.mudarEtapa(c3, "contatado", dani.id);
    });

    it("traz as seis colunas na ordem do funil, mesmo vazias", async () => {
      const quadro = await quadroC.quadro();
      expect(quadro.map((coluna) => coluna.etapa)).toEqual([
        "novo",
        "contatado",
        "em_conversa",
        "proposta",
        "ganho",
        "perdido",
      ]);
      expect(quadro.map((coluna) => coluna.total)).toEqual([1, 1, 0, 0, 2, 0]);
      expect(quadro.find((c) => c.etapa === "perdido")?.leads).toEqual([]);
    });

    it("em cada coluna, o movido mais recentemente vem primeiro", async () => {
      const ganho = (await quadroC.quadro()).find((c) => c.etapa === "ganho")!;
      expect(ganho.leads.map((l) => l.nome)).toEqual(["C2", "C1"]);
    });

    it("respeita o limite por coluna, mas o total conta todos", async () => {
      const ganho = (await quadroC.quadro(1)).find((c) => c.etapa === "ganho")!;
      expect(ganho.leads).toHaveLength(1);
      expect(ganho.total).toBe(2);
    });

    it("a lista filtra e conta por etapa", async () => {
      expect(await quadroC.contar({ etapa: "ganho" })).toBe(2);
      expect((await quadroC.listar({ etapa: "contatado" })).map((l) => l.nome)).toEqual(["C3"]);
      expect(await quadroC.contar({ etapa: "perdido" })).toBe(0);
    });
  });

  describe("apagar a empresa", () => {
    it("apaga o histórico dela, e só dela", async () => {
      const antesA = (await amb.db.select().from(historicoEtapas).where(eq(historicoEtapas.organizacaoId, empresaA))).length;
      const lead = await leadsB().criar({ nome: "Movido da B" }, bruno.id);
      await leadsB().mudarEtapa(lead.id, "contatado", bruno.id);

      await amb.db.delete(organization).where(eq(organization.id, empresaB));

      const restantesB = await amb.db
        .select()
        .from(historicoEtapas)
        .where(eq(historicoEtapas.organizacaoId, empresaB));
      expect(restantesB).toEqual([]);
      const depoisA = await amb.db
        .select()
        .from(historicoEtapas)
        .where(eq(historicoEtapas.organizacaoId, empresaA));
      expect(depoisA).toHaveLength(antesA);
    });
  });
});

describe("etapa vinda do formulário ou do endereço", () => {
  it("aceita só as etapas conhecidas", () => {
    expect(etapaValida("em_conversa")).toBe("em_conversa");
    expect(etapaValida("Ganho")).toBeNull();
    expect(etapaValida("fechado")).toBeNull();
    expect(etapaValida("")).toBeNull();
    expect(etapaValida(undefined)).toBeNull();
  });

  it("lê a etapa do endereço da lista e descarta valor desconhecido", () => {
    expect(lerParametrosLista({ etapa: "proposta" }).etapa).toBe("proposta");
    expect(lerParametrosLista({ etapa: "' or 1=1 --" }).etapa).toBeUndefined();
    expect(temFiltroAtivo(lerParametrosLista({ etapa: "ganho" }))).toBe(true);
  });

  it("mantém a etapa ao montar o endereço das páginas", () => {
    const parametros = lerParametrosLista({ q: "ana", etapa: "ganho" });
    expect(enderecoDaLista(parametros, 2)).toBe("/painel/leads?q=ana&etapa=ganho&pagina=2");
  });
});

// Confere a conversão dos leads que já existiam antes da migração do funil.
describe("migração do funil em um banco com leads antigos", () => {
  let pasta: string;
  let banco: PGlite;

  beforeAll(() => {
    pasta = mkdtempSync(join(tmpdir(), "prospen-migracoes-"));
    cpSync("./src/db/migrations", pasta, { recursive: true });
    banco = new PGlite({ extensions: { pg_trgm, unaccent } });
  });

  afterAll(async () => {
    await banco.close();
    rmSync(pasta, { recursive: true, force: true });
  });

  it("leads antigos entram em Novo, com a data de cadastro como data da etapa", async () => {
    // Primeiro, só as migrações anteriores ao funil.
    const caminhoDoDiario = join(pasta, "meta", "_journal.json");
    const diario = JSON.parse(readFileSync(caminhoDoDiario, "utf8")) as {
      entries: { tag: string }[];
    };
    const completo = structuredClone(diario);
    diario.entries = diario.entries.filter((entrada) => entrada.tag < "0004");
    writeFileSync(caminhoDoDiario, JSON.stringify(diario));
    await migrate(drizzle(banco), { migrationsFolder: pasta });

    await banco.query(`insert into organization (id, name, slug, created_at) values ('org', 'Org', 'org', now())`);
    await banco.query(
      `insert into leads (organizacao_id, nome, criado_em) values ('org', 'Antigo', '2026-01-15T12:00:00Z')`,
    );

    // Depois, a migração do funil.
    writeFileSync(caminhoDoDiario, JSON.stringify(completo));
    await migrate(drizzle(banco), { migrationsFolder: pasta });

    const { rows } = await banco.query<{ etapa: string; etapa_atualizada_em: Date }>(
      `select etapa, etapa_atualizada_em from leads where nome = 'Antigo'`,
    );
    expect(rows[0].etapa).toBe("novo");
    expect(new Date(rows[0].etapa_atualizada_em).toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });
});
