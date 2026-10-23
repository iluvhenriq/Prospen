import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { leads, member, organization } from "@/db/schema";
import { traduzirErroLogin } from "@/modules/contas/erros";
import { repositorioLeads } from "@/modules/leads/repositorio";
import { resolverOrganizacao } from "@/modules/organizacoes/membros";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

// O teste mais importante do produto: duas empresas no mesmo banco nunca
// enxergam, alteram nem apagam os dados uma da outra.
describe("isolamento entre empresas", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let empresaA: string;
  let empresaB: string;
  let leadA: string;

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    ana = await cadastrarPessoa(amb, "Ana", "ana@empresa-a.com.br");
    bruno = await cadastrarPessoa(amb, "Bruno", "bruno@empresa-b.com.br");
    empresaA = await criarEmpresa(amb, ana, "Barbearia A", "barbearia-a");
    empresaB = await criarEmpresa(amb, bruno, "Clínica B", "clinica-b");

    const repoA = repositorioLeads(amb.db, empresaA);
    const criado = await repoA.criar({ nome: "Lead da A" }, ana.id);
    leadA = criado.id;
    await repoA.criar({ nome: "Outro lead da A", empresa: "Loja X" }, ana.id);
    await repositorioLeads(amb.db, empresaB).criar({ nome: "Lead da B" }, bruno.id);
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  describe("leads", () => {
    it("cada empresa lista só os seus leads", async () => {
      const daA = await repositorioLeads(amb.db, empresaA).listar();
      const daB = await repositorioLeads(amb.db, empresaB).listar();
      expect(daA.map((l) => l.nome).sort()).toEqual(["Lead da A", "Outro lead da A"]);
      expect(daB.map((l) => l.nome)).toEqual(["Lead da B"]);
      expect(daA.every((l) => l.organizacaoId === empresaA)).toBe(true);
    });

    it("a contagem considera só a própria empresa", async () => {
      expect(await repositorioLeads(amb.db, empresaA).contar()).toBe(2);
      expect(await repositorioLeads(amb.db, empresaB).contar()).toBe(1);
    });

    it("buscar o lead de outra empresa pelo identificador devolve nada", async () => {
      expect(await repositorioLeads(amb.db, empresaB).buscar(leadA)).toBeNull();
      expect(await repositorioLeads(amb.db, empresaA).buscar(leadA)).not.toBeNull();
    });

    it("alterar o lead de outra empresa não muda nada", async () => {
      const resultado = await repositorioLeads(amb.db, empresaB).atualizar(leadA, {
        nome: "INVADIDO",
      });
      expect(resultado).toBeNull();
      const original = await repositorioLeads(amb.db, empresaA).buscar(leadA);
      expect(original?.nome).toBe("Lead da A");
    });

    it("apagar o lead de outra empresa não apaga", async () => {
      expect(await repositorioLeads(amb.db, empresaB).excluir(leadA)).toBe(false);
      expect(await repositorioLeads(amb.db, empresaA).buscar(leadA)).not.toBeNull();
    });

    it("não dá para criar lead em outra empresa mandando o identificador dela junto", async () => {
      const malicioso = { nome: "Plantado", organizacaoId: empresaA } as never;
      const criado = await repositorioLeads(amb.db, empresaB).criar(malicioso, bruno.id);
      expect(criado.organizacaoId).toBe(empresaB);
      const daA = await repositorioLeads(amb.db, empresaA).listar();
      expect(daA.some((l) => l.nome === "Plantado")).toBe(false);
    });

    it("não dá para mover um lead para outra empresa pela atualização", async () => {
      const repoB = repositorioLeads(amb.db, empresaB);
      const [meu] = await repoB.listar();
      const malicioso = { nome: "Renomeado", organizacaoId: empresaA } as never;
      const atualizado = await repoB.atualizar(meu.id, malicioso);
      expect(atualizado?.organizacaoId).toBe(empresaB);
    });

    it("atualizar só os campos informados mantém os demais", async () => {
      const repoA = repositorioLeads(amb.db, empresaA);
      const atualizado = await repoA.atualizar(leadA, { telefone: "11999990000" });
      expect(atualizado?.telefone).toBe("11999990000");
      expect(atualizado?.nome).toBe("Lead da A");
    });

    it("exige o identificador da empresa para criar o repositório", () => {
      expect(() => repositorioLeads(amb.db, "")).toThrow();
    });

    it("rejeita origem e país inválidos direto no banco", async () => {
      await expect(
        amb.pg.query(
          `insert into leads (organizacao_id, nome, origem) values ($1, 'x', 'inventada')`,
          [empresaA],
        ),
      ).rejects.toThrow();
      await expect(
        amb.pg.query(
          `insert into leads (organizacao_id, nome, pais) values ($1, 'x', 'brasil')`,
          [empresaA],
        ),
      ).rejects.toThrow();
    });
  });

  describe("empresa e papel da pessoa", () => {
    it("quem cria a empresa vira dono dela", async () => {
      const daAna = await resolverOrganizacao(amb.db, ana.id);
      expect(daAna).toMatchObject({ organizacaoId: empresaA, nome: "Barbearia A", papel: "owner" });
    });

    it("cada pessoa resolve a sua própria empresa", async () => {
      const daAna = await resolverOrganizacao(amb.db, ana.id);
      const doBruno = await resolverOrganizacao(amb.db, bruno.id);
      expect(daAna?.organizacaoId).toBe(empresaA);
      expect(doBruno?.organizacaoId).toBe(empresaB);
    });

    it("uma empresa 'ativa' na sessão que não é da pessoa é ignorada", async () => {
      const resolvida = await resolverOrganizacao(amb.db, ana.id, empresaB);
      expect(resolvida?.organizacaoId).toBe(empresaA);
    });

    it("quem ainda não tem empresa recebe nulo", async () => {
      const carla = await cadastrarPessoa(amb, "Carla", "carla@sem-empresa.com.br");
      expect(await resolverOrganizacao(amb.db, carla.id)).toBeNull();
    });
  });

  describe("API de login: tentativas de acessar outra empresa", () => {
    it("uma pessoa não consegue ler os dados da empresa de outra", async () => {
      await expect(
        amb.auth.api.getFullOrganization({
          query: { organizationId: empresaB },
          headers: ana.cabecalhos,
        }),
      ).rejects.toThrow();
    });

    it("uma pessoa não consegue ativar a empresa de outra", async () => {
      await expect(
        amb.auth.api.setActiveOrganization({
          body: { organizationId: empresaB },
          headers: ana.cabecalhos,
        }),
      ).rejects.toThrow();
    });

    it("uma pessoa não consegue apagar a empresa de outra", async () => {
      await expect(
        amb.auth.api.deleteOrganization({
          body: { organizationId: empresaB },
          headers: ana.cabecalhos,
        }),
      ).rejects.toThrow();
      const linhas = await amb.pg.query(`select 1 from organization where id = $1`, [empresaB]);
      expect(linhas.rows).toHaveLength(1);
    });

    it("sem login, a API de organização é recusada", async () => {
      await expect(
        amb.auth.api.getFullOrganization({
          query: { organizationId: empresaA },
          headers: new Headers(),
        }),
      ).rejects.toThrow();
    });
  });

  describe("regras de conta", () => {
    it("uma pessoa não consegue criar uma segunda empresa", async () => {
      await expect(
        amb.auth.api.createOrganization({
          body: { name: "Segunda empresa", slug: "segunda-empresa" },
          headers: ana.cabecalhos,
        }),
      ).rejects.toThrow();
      const total = await amb.pg.query(`select count(*)::int as n from member where user_id = $1`, [ana.id]);
      expect((total.rows[0] as { n: number }).n).toBe(1);
    });

    it("o mesmo usuário não entra duas vezes na mesma empresa", async () => {
      await expect(
        amb.db.insert(member).values({
          id: "duplicado",
          organizationId: empresaA,
          userId: ana.id,
          role: "member",
          createdAt: new Date(),
        }),
      ).rejects.toThrow();
    });

    it("cadastro repetido do mesmo e-mail é recusado com mensagem em português", async () => {
      const erro = await amb.auth.api
        .signUpEmail({
          body: { name: "Ana de novo", email: "ANA@empresa-a.com.br", password: "outra-senha-123" },
        })
        .then(() => null, (e: unknown) => e);
      expect(erro).not.toBeNull();
      expect(traduzirErroLogin(erro)).toBe("Já existe uma conta com este e-mail. Tente entrar.");
    });

    it("senha errada dá a mesma mensagem de e-mail inexistente", async () => {
      const senhaErrada = await amb.auth.api
        .signInEmail({ body: { email: "ana@empresa-a.com.br", password: "errada-errada" } })
        .then(() => null, (e: unknown) => e);
      const emailInexistente = await amb.auth.api
        .signInEmail({ body: { email: "ninguem@nada.com.br", password: "qualquer-senha" } })
        .then(() => null, (e: unknown) => e);
      expect(traduzirErroLogin(senhaErrada)).toBe("E-mail ou senha incorretos.");
      expect(traduzirErroLogin(emailInexistente)).toBe("E-mail ou senha incorretos.");
    });

    it("senha curta demais é recusada", async () => {
      await expect(
        amb.auth.api.signUpEmail({
          body: { name: "Dani", email: "dani@teste.com.br", password: "curta" },
        }),
      ).rejects.toThrow();
    });

    it("entrar com a senha certa funciona", async () => {
      const resultado = await amb.auth.api.signInEmail({
        body: { email: "ana@empresa-a.com.br", password: "senha-de-teste-123" },
      });
      expect(resultado.user.email).toBe("ana@empresa-a.com.br");
    });

    it("a senha não fica guardada em texto puro", async () => {
      const linhas = await amb.pg.query<{ password: string }>(
        `select password from account where user_id = $1`,
        [ana.id],
      );
      expect(linhas.rows[0].password).not.toContain("senha-de-teste-123");
      expect(linhas.rows[0].password.length).toBeGreaterThan(40);
    });
  });

  describe("exclusão em cascata", () => {
    it("apagar a empresa apaga os leads dela e só os dela", async () => {
      await amb.db.delete(organization).where(eq(organization.id, empresaB));
      const restantesB = await amb.db.select().from(leads).where(eq(leads.organizacaoId, empresaB));
      const restantesA = await amb.db.select().from(leads).where(eq(leads.organizacaoId, empresaA));
      expect(restantesB).toHaveLength(0);
      expect(restantesA.length).toBeGreaterThan(0);
    });
  });
});
