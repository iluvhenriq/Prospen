import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { member, organizacaoConfig, organization } from "@/db/schema";
import { repositorioPlano } from "@/modules/planos/repositorio";
import {
  garantirConfiguracao,
  obterConfiguracao,
} from "@/modules/organizacoes/configuracao";
import {
  PAPEL_MINIMO,
  ErroSemPermissao,
  papelMaisAlto,
  papelPode,
  resolverOrganizacao,
  type Acao,
  type Papel,
} from "@/modules/organizacoes/membros";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

describe("configuração regional da empresa", () => {
  let amb: AmbienteDeTeste;
  let empresaA: string;
  let empresaB: string;

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    const ana = await cadastrarPessoa(amb, "Ana", "ana@a.com.br");
    const bruno = await cadastrarPessoa(amb, "Bruno", "bruno@b.com.br");
    empresaA = await criarEmpresa(amb, ana, "Empresa A", "empresa-a");
    empresaB = await criarEmpresa(amb, bruno, "Empresa B", "empresa-b");
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  it("toda empresa nasce com a configuração padrão do Brasil, sem ninguém pedir", async () => {
    const linhas = await amb.db
      .select()
      .from(organizacaoConfig)
      .where(eq(organizacaoConfig.organizacaoId, empresaA));
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      pais: "BR",
      moeda: "BRL",
      fusoHorario: "America/Sao_Paulo",
      idioma: "pt-BR",
    });
  });

  it("cada empresa tem a sua: mudar uma não muda a outra", async () => {
    await amb.db
      .update(organizacaoConfig)
      .set({ pais: "US", moeda: "USD", fusoHorario: "America/New_York" })
      .where(eq(organizacaoConfig.organizacaoId, empresaA));

    const a = await obterConfiguracao(amb.db, empresaA);
    const b = await obterConfiguracao(amb.db, empresaB);
    expect(a).toMatchObject({ pais: "US", moeda: "USD" });
    expect(b).toMatchObject({ pais: "BR", moeda: "BRL" });
  });

  it("se a configuração não existir, é criada na hora com o padrão", async () => {
    await amb.db
      .delete(organizacaoConfig)
      .where(eq(organizacaoConfig.organizacaoId, empresaB));

    const recriada = await obterConfiguracao(amb.db, empresaB);
    expect(recriada).toMatchObject({ pais: "BR", moeda: "BRL" });
  });

  it("garantir a configuração várias vezes não duplica nem sobrescreve", async () => {
    await amb.db
      .update(organizacaoConfig)
      .set({ moeda: "EUR" })
      .where(eq(organizacaoConfig.organizacaoId, empresaB));

    await garantirConfiguracao(amb.db, empresaB);
    await garantirConfiguracao(amb.db, empresaB);

    const linhas = await amb.db
      .select()
      .from(organizacaoConfig)
      .where(eq(organizacaoConfig.organizacaoId, empresaB));
    expect(linhas).toHaveLength(1);
    expect(linhas[0].moeda).toBe("EUR");
  });

  it("o banco rejeita país e moeda em formato inválido", async () => {
    await expect(
      amb.db
        .update(organizacaoConfig)
        .set({ pais: "br" })
        .where(eq(organizacaoConfig.organizacaoId, empresaA)),
    ).rejects.toThrow();
    await expect(
      amb.db
        .update(organizacaoConfig)
        .set({ moeda: "REAL" })
        .where(eq(organizacaoConfig.organizacaoId, empresaA)),
    ).rejects.toThrow();
  });

  it("apagar a empresa apaga a configuração dela e só a dela", async () => {
    await amb.db.delete(organization).where(eq(organization.id, empresaA));
    const restantes = await amb.db.select().from(organizacaoConfig);
    expect(restantes.map((linha) => linha.organizacaoId)).toEqual([empresaB]);
  });
});

describe("papéis: dono e membro", () => {
  describe("tabela de permissões", () => {
    const acoes = Object.keys(PAPEL_MINIMO) as Acao[];

    it("o dono pode todas as ações", () => {
      for (const acao of acoes) expect(papelPode("owner", acao)).toBe(true);
    });

    it("o membro só pode trabalhar com leads", () => {
      expect(papelPode("member", "trabalharComLeads")).toBe(true);
      expect(papelPode("member", "gerenciarEquipe")).toBe(false);
      expect(papelPode("member", "configurarEmpresa")).toBe(false);
      expect(papelPode("member", "excluirEmpresa")).toBe(false);
    });

    it("o admin fica no meio: gerencia a equipe, mas não configura nem exclui a empresa", () => {
      expect(papelPode("admin", "trabalharComLeads")).toBe(true);
      expect(papelPode("admin", "gerenciarEquipe")).toBe(true);
      expect(papelPode("admin", "configurarEmpresa")).toBe(false);
      expect(papelPode("admin", "excluirEmpresa")).toBe(false);
    });

    it("papel maior nunca perde uma permissão que um papel menor tem", () => {
      const ordem: Papel[] = ["member", "admin", "owner"];
      for (const acao of acoes) {
        for (let i = 0; i < ordem.length - 1; i++) {
          if (papelPode(ordem[i], acao)) {
            expect(papelPode(ordem[i + 1], acao)).toBe(true);
          }
        }
      }
    });
  });

  describe("papel guardado no banco", () => {
    it("vale o papel mais alto quando há vários", () => {
      expect(papelMaisAlto("member,owner")).toBe("owner");
      expect(papelMaisAlto("admin, member")).toBe("admin");
    });

    it("qualquer valor desconhecido vira o papel menos poderoso", () => {
      expect(papelMaisAlto("superusuario")).toBe("member");
      expect(papelMaisAlto("")).toBe("member");
      expect(papelMaisAlto(null)).toBe("member");
      expect(papelMaisAlto(undefined)).toBe("member");
    });
  });

  describe("com pessoas de verdade no banco", () => {
    let amb: AmbienteDeTeste;
    let dona: PessoaDeTeste;
    let colega: PessoaDeTeste;
    let estranho: PessoaDeTeste;
    let empresa: string;
    let outraEmpresa: string;

    beforeAll(async () => {
      amb = await criarAmbienteDeTeste();
      dona = await cadastrarPessoa(amb, "Dona", "dona@empresa.com.br");
      colega = await cadastrarPessoa(amb, "Colega", "colega@empresa.com.br");
      estranho = await cadastrarPessoa(amb, "Estranho", "estranho@outra.com.br");
      empresa = await criarEmpresa(amb, dona, "Empresa", "empresa");
      outraEmpresa = await criarEmpresa(amb, estranho, "Outra", "outra");
      // Duas pessoas na empresa: precisa de plano com 2 usuários (o padrão tem 1).
      await repositorioPlano(amb.db, empresa).definir("medio", false);
      // Adiciona o colega como membro, pelo servidor (o convite tem teste próprio, em planos.test.ts).
      await amb.auth.api.addMember({
        body: { userId: colega.id, role: "member", organizationId: empresa },
      });
    });

    afterAll(async () => {
      await amb.encerrar();
    });

    it("quem cria a empresa é dono e pode configurá-la", async () => {
      const resolvida = await resolverOrganizacao(amb.db, dona.id);
      expect(resolvida?.papel).toBe("owner");
      expect(papelPode(resolvida!.papel, "configurarEmpresa")).toBe(true);
    });

    it("quem entra como membro vê a mesma empresa, mas não pode configurá-la nem gerenciar a equipe", async () => {
      const resolvida = await resolverOrganizacao(amb.db, colega.id);
      expect(resolvida?.organizacaoId).toBe(empresa);
      expect(resolvida?.papel).toBe("member");
      expect(papelPode(resolvida!.papel, "trabalharComLeads")).toBe(true);
      expect(papelPode(resolvida!.papel, "configurarEmpresa")).toBe(false);
      expect(papelPode(resolvida!.papel, "gerenciarEquipe")).toBe(false);
    });

    it("ser membro de uma empresa não dá acesso à outra", async () => {
      const resolvida = await resolverOrganizacao(
        amb.db,
        colega.id,
        // Mesmo "ativando" a empresa alheia na sessão, ela é ignorada.
        outraEmpresa,
      );
      expect(resolvida?.organizacaoId).toBe(empresa);
    });

    it("promover alguém a dono pelo banco passa a valer na próxima consulta", async () => {
      await amb.db
        .update(member)
        .set({ role: "owner" })
        .where(eq(member.userId, colega.id));
      const resolvida = await resolverOrganizacao(amb.db, colega.id);
      expect(resolvida?.papel).toBe("owner");
    });

    it("a pessoa sem permissão recebe um erro identificável", () => {
      const erro = new ErroSemPermissao("configurarEmpresa");
      expect(erro).toBeInstanceOf(Error);
      expect(erro.name).toBe("ErroSemPermissao");
      expect(erro.acao).toBe("configurarEmpresa");
    });
  });
});
