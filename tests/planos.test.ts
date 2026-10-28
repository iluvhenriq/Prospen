import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { repositorioLeads, type LeadDaBaseCnpj } from "@/modules/leads/repositorio";
import { repositorioEquipe } from "@/modules/organizacoes/equipe";
import { salvarNoMes } from "@/modules/planos/cota";
import {
  cabemNoMes,
  EMPRESAS_SEM_PAGAMENTO,
  empresasPorMesDa,
  menorPlanoCom,
  mesDoDia,
  PLANO_PADRAO,
  planoTem,
  proximoPlano,
  REGRAS,
  VAGAS_DE_FUNDADOR,
} from "@/modules/planos/planos";
import { repositorioPlano } from "@/modules/planos/repositorio";
import { cadastrarPessoa, criarAmbienteDeTeste, criarEmpresa, type AmbienteDeTeste } from "./ajuda/banco-teste";

// Planos (decisão de 28/10/2026). Dados fictícios.

// CNPJ válido a partir de uma raiz de 12 números (mesma conta de src/modules/leads/cnpj.ts).
function cnpjDe(raiz: string): string {
  const digito = (base: string, pesos: number[]) => {
    const resto = pesos.reduce((soma, peso, i) => soma + Number(base[i]) * peso, 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = digito(raiz, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${raiz}${primeiro}${digito(`${raiz}${primeiro}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])}`;
}

function empresas(inicio: number, quantas: number): LeadDaBaseCnpj[] {
  return Array.from({ length: quantas }, (_, i) => {
    const cnpj = cnpjDe(String(10_000_000_0001 + inicio + i).padStart(12, "0"));
    return {
      nome: `Empresa fictícia ${inicio + i}`,
      empresa: null,
      email: null,
      telefone: null,
      cnpj,
      porte: "03",
      naturezaJuridica: "2062",
      dataAbertura: "2024-01-10",
      matriz: true,
      cnaePrincipal: null,
    };
  });
}

describe("regras dos planos", () => {
  it("sem plano liberado, salva só EMPRESAS_SEM_PAGAMENTO por mês; liberado, vale o plano", () => {
    expect(EMPRESAS_SEM_PAGAMENTO).toBe(20);
    expect(empresasPorMesDa({ plano: PLANO_PADRAO, gravado: false })).toBe(20);
    expect(empresasPorMesDa({ plano: "pequeno", gravado: true })).toBe(300);
    expect(empresasPorMesDa({ plano: "grande", gravado: true })).toBeNull();
  });

  it("bate com o que foi decidido em 28/10/2026", () => {
    expect(REGRAS.pequeno).toMatchObject({ precoCentavos: 9700, usuarios: 1, empresasPorMes: 300 });
    expect(REGRAS.medio).toMatchObject({ precoCentavos: 17700, usuarios: 2, empresasPorMes: 1000 });
    expect(REGRAS.grande).toMatchObject({ precoCentavos: 19700, usuarios: 3, empresasPorMes: null });
    expect(VAGAS_DE_FUNDADOR).toBe(20);
    expect(PLANO_PADRAO).toBe("pequeno");
  });

  it("cada recurso entra no plano certo", () => {
    expect(planoTem("pequeno", "exportarCsv")).toBe(false);
    expect(planoTem("medio", "exportarCsv")).toBe(true);
    expect(planoTem("medio", "buscasVigiadas")).toBe(true);
    for (const recurso of ["radar", "clienteIdeal", "aprendizado"] as const) {
      expect(planoTem("medio", recurso)).toBe(false);
      expect(planoTem("grande", recurso)).toBe(true);
      expect(menorPlanoCom(recurso)).toBe("grande");
    }
    expect(menorPlanoCom("exportarCsv")).toBe("medio");
    expect(proximoPlano("pequeno")).toBe("medio");
    expect(proximoPlano("grande")).toBeNull();
  });

  it("conta do que cabe no mês", () => {
    expect(cabemNoMes(50, 0, 300)).toBe(50);
    expect(cabemNoMes(50, 280, 300)).toBe(20);
    expect(cabemNoMes(50, 300, 300)).toBe(0);
    expect(cabemNoMes(50, 310, 300)).toBe(0);
    expect(cabemNoMes(50, 5000, null)).toBe(50);
    expect(mesDoDia("2026-10-28")).toBe("2026-10");
  });
});

describe("plano e limite mensal no banco", () => {
  let ambiente: AmbienteDeTeste;
  let empresaA: string;
  let empresaB: string;

  beforeAll(async () => {
    ambiente = await criarAmbienteDeTeste();
    const ana = await cadastrarPessoa(ambiente, "Ana Teste", "ana.planos@exemplo.com.br");
    const beto = await cadastrarPessoa(ambiente, "Beto Teste", "beto.planos@exemplo.com.br");
    empresaA = await criarEmpresa(ambiente, ana, "Empresa A", "empresa-a-planos");
    empresaB = await criarEmpresa(ambiente, beto, "Empresa B", "empresa-b-planos");
  });

  afterAll(async () => {
    await ambiente.encerrar();
  });

  it("sem plano gravado vale o padrão; definir grava e troca", async () => {
    const repositorio = repositorioPlano(ambiente.db, empresaA);
    expect(await repositorio.obter()).toEqual({ plano: "pequeno", fundador: false, gravado: false });
    await repositorio.definir("grande", true);
    expect(await repositorio.obter()).toEqual({ plano: "grande", fundador: true, gravado: true });
    await repositorio.definir("pequeno", false);
    // O plano de uma empresa não muda o da outra.
    expect((await repositorioPlano(ambiente.db, empresaB).obter()).gravado).toBe(false);
  });

  it("o banco recusa plano desconhecido", async () => {
    // @ts-expect-error valor fora da lista, de propósito
    await expect(repositorioPlano(ambiente.db, empresaA).definir("ouro", false)).rejects.toThrow();
  });

  it("Pequeno: salva até 300 no mês; o que já é lead não conta; o resto fica de fora", async () => {
    const primeiro = await salvarNoMes(ambiente.db, empresaA, REGRAS.pequeno.empresasPorMes, "2026-10", empresas(0, 280), null);
    expect(primeiro).toEqual({ adicionados: 280, foraDoLimite: 0 });

    // 10 repetidas (já são leads) + 40 novas: só 20 cabem.
    const segundo = await salvarNoMes(ambiente.db, empresaA, REGRAS.pequeno.empresasPorMes, "2026-10", empresas(270, 50), null);
    expect(segundo).toEqual({ adicionados: 20, foraDoLimite: 20 });
    expect(await repositorioPlano(ambiente.db, empresaA).empresasSalvasNoMes("2026-10")).toBe(300);

    const cheio = await salvarNoMes(ambiente.db, empresaA, REGRAS.pequeno.empresasPorMes, "2026-10", empresas(400, 5), null);
    expect(cheio).toEqual({ adicionados: 0, foraDoLimite: 5 });
  });

  it("apagar um lead não devolve a vaga do mês", async () => {
    const leads = repositorioLeads(ambiente.db, empresaA);
    const [umLead] = await leads.idsPorCnpj([empresas(0, 1)[0].cnpj]);
    expect(await leads.excluir(umLead)).toBe(true);
    const depois = await salvarNoMes(ambiente.db, empresaA, REGRAS.pequeno.empresasPorMes, "2026-10", empresas(0, 1), null);
    expect(depois).toEqual({ adicionados: 0, foraDoLimite: 1 });
  });

  it("o mês seguinte começa do zero", async () => {
    const novembro = await salvarNoMes(ambiente.db, empresaA, REGRAS.pequeno.empresasPorMes, "2026-11", empresas(500, 3), null);
    expect(novembro).toEqual({ adicionados: 3, foraDoLimite: 0 });
  });

  it("o uso de uma empresa não gasta o limite da outra", async () => {
    expect(await repositorioPlano(ambiente.db, empresaB).empresasSalvasNoMes("2026-10")).toBe(0);
    const daOutra = await salvarNoMes(ambiente.db, empresaB, REGRAS.pequeno.empresasPorMes, "2026-10", empresas(0, 10), null);
    expect(daOutra).toEqual({ adicionados: 10, foraDoLimite: 0 });
  });

  it("Grande: sem limite mensal, mas o uso continua contado", async () => {
    const grande = await salvarNoMes(ambiente.db, empresaB, REGRAS.grande.empresasPorMes, "2026-12", empresas(1000, 400), null);
    expect(grande).toEqual({ adicionados: 400, foraDoLimite: 0 });
    expect(await repositorioPlano(ambiente.db, empresaB).empresasSalvasNoMes("2026-12")).toBe(400);
  });
});

describe("limite de usuários no login", () => {
  let ambiente: AmbienteDeTeste;

  beforeAll(async () => {
    ambiente = await criarAmbienteDeTeste();
  });

  afterAll(async () => {
    await ambiente.encerrar();
  });

  it("Pequeno não aceita a segunda pessoa; Médio aceita até 2", async () => {
    const dona = await cadastrarPessoa(ambiente, "Dona Teste", "dona.usuarios@exemplo.com.br");
    const empresa = await criarEmpresa(ambiente, dona, "Empresa Usuários", "empresa-usuarios");
    const convidada = await cadastrarPessoa(ambiente, "Convidada Teste", "convidada.usuarios@exemplo.com.br");
    const terceira = await cadastrarPessoa(ambiente, "Terceira Teste", "terceira.usuarios@exemplo.com.br");

    const convidar = (email: string) =>
      ambiente.auth.api.createInvitation({
        headers: dona.cabecalhos,
        body: { email, role: "member", organizationId: empresa },
      });

    // Pequeno: o convite até pode existir (1 vaga de convite), mas aceitar passa do limite.
    const convite = await convidar(convidada.email);
    await expect(
      ambiente.auth.api.acceptInvitation({ headers: convidada.cabecalhos, body: { invitationId: convite.id } }),
    ).rejects.toMatchObject({ body: { code: "ORGANIZATION_MEMBERSHIP_LIMIT_REACHED" } });

    await repositorioPlano(ambiente.db, empresa).definir("medio", false);
    await ambiente.auth.api.acceptInvitation({ headers: convidada.cabecalhos, body: { invitationId: convite.id } });
    expect(await repositorioEquipe(ambiente.db, empresa).ocupacao()).toEqual({ pessoas: 2, convites: 0 });

    // Médio cheio (2 de 2): a terceira não entra, nem chamando a API direto.
    const outro = await convidar(terceira.email);
    await expect(
      ambiente.auth.api.acceptInvitation({ headers: terceira.cabecalhos, body: { invitationId: outro.id } }),
    ).rejects.toMatchObject({ body: { code: "ORGANIZATION_MEMBERSHIP_LIMIT_REACHED" } });
  });

  it("convite só serve para o e-mail convidado", async () => {
    const dono = await cadastrarPessoa(ambiente, "Dono Teste", "dono.email@exemplo.com.br");
    const empresa = await criarEmpresa(ambiente, dono, "Empresa E-mail", "empresa-email");
    await repositorioPlano(ambiente.db, empresa).definir("grande", false);
    const intrusa = await cadastrarPessoa(ambiente, "Intrusa Teste", "intrusa@exemplo.com.br");
    const convite = await ambiente.auth.api.createInvitation({
      headers: dono.cabecalhos,
      body: { email: "certa@exemplo.com.br", role: "member", organizationId: empresa },
    });
    await expect(
      ambiente.auth.api.acceptInvitation({ headers: intrusa.cabecalhos, body: { invitationId: convite.id } }),
    ).rejects.toMatchObject({ body: { code: "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION" } });
    // A leitura da equipe é só desta empresa.
    expect((await repositorioEquipe(ambiente.db, empresa).convitesPendentes()).map((c) => c.email)).toEqual([
      "certa@exemplo.com.br",
    ]);
  });
});
