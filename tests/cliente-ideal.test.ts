import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { LeadEncerrado } from "@/modules/leads/repositorio";
import { aprenderComOsResultados } from "@/modules/painel/aprendizado";
import { papelPode } from "@/modules/organizacoes/membros";
import { repositorioClienteIdeal } from "@/modules/pontuacao/repositorio-cliente-ideal";
import {
  combinaComClienteIdeal,
  pontuar,
  type ClienteIdeal,
  type DadosParaPontuar,
} from "@/modules/pontuacao/regras";
import { cadastrarPessoa, criarAmbienteDeTeste, criarEmpresa, type AmbienteDeTeste } from "./ajuda/banco-teste";

// Cliente ideal (etapa 9f, 28/10/2026). Dados fictícios.
const HOJE = new Date("2026-10-28T12:00:00Z");

const base: DadosParaPontuar = {
  telefone: "1133334444",
  email: "dono@gmail.com",
  porte: "03",
  matriz: false,
  naturezaJuridica: "2062",
};
const estabelecida = { ...base, dataAbertura: "2019-05-10" }; // 7 anos
const nova = { ...base, dataAbertura: "2026-06-01" }; // meses
const mei = { ...nova, porte: "01", naturezaJuridica: "2135" };

const perfil = (extra: Partial<ClienteIdeal> = {}): ClienteIdeal => ({ portes: [], idade: "novas", aceitaMei: false, ...extra });

describe("nota ajustada ao cliente ideal", () => {
  it("sem perfil, ou com o perfil padrão, a nota é a geral", () => {
    expect(pontuar(nova, HOJE, null)).toEqual(pontuar(nova, HOJE));
    expect(pontuar(nova, HOJE, perfil())).toEqual(pontuar(nova, HOJE));
    expect(pontuar(estabelecida, HOJE, perfil())).toEqual(pontuar(estabelecida, HOJE));
  });

  it("quem prefere estabelecidas: empresa antiga sobe, nova não ganha nada pela idade", () => {
    const antigaGeral = pontuar(estabelecida, HOJE);
    const antigaAjustada = pontuar(estabelecida, HOJE, perfil({ idade: "estabelecidas" }));
    expect(antigaAjustada.motivos).toContain("empresaEstabelecida");
    expect(antigaAjustada.pontos).toBe(antigaGeral.pontos + 20);
    const novaAjustada = pontuar(nova, HOJE, perfil({ idade: "estabelecidas" }));
    expect(novaAjustada.motivos).not.toContain("empresaNova");
    expect(novaAjustada.pontos).toBe(pontuar(nova, HOJE).pontos - 20);
  });

  it("tanto faz a idade: nem soma nem tira", () => {
    expect(pontuar(nova, HOJE, perfil({ idade: "tanto_faz" })).motivos).not.toContain("empresaNova");
    expect(pontuar(estabelecida, HOJE, perfil({ idade: "tanto_faz" })).motivos).not.toContain("empresaEstabelecida");
  });

  it("porte: o que você atende soma 20, o que não atende tira 10", () => {
    const atende = pontuar(nova, HOJE, perfil({ portes: ["03"] }));
    expect(atende.motivos).toContain("porteNoPerfil");
    expect(atende.motivos).not.toContain("portePequena");
    const naoAtende = pontuar(nova, HOJE, perfil({ portes: ["05"] }));
    expect(naoAtende.motivos).toContain("porteForaDoPerfil");
    expect(atende.pontos - naoAtende.pontos).toBe(30);
    // Lead sem dados da Receita não ganha nem perde pelo porte.
    expect(pontuar({ telefone: "1", email: null }, HOJE, perfil({ portes: ["05"] })).motivos).toEqual(["telefone"]);
  });

  it("quem atende MEI não desconta o MEI", () => {
    expect(pontuar(mei, HOJE).motivos).toContain("mei");
    expect(pontuar(mei, HOJE, perfil({ aceitaMei: true })).motivos).not.toContain("mei");
  });

  it("nota fica entre 0 e 100", () => {
    const pior = pontuar({ ...mei, telefone: null, email: null }, HOJE, perfil({ portes: ["05"], idade: "estabelecidas" }));
    expect(pior.pontos).toBe(0);
  });

  it("marca na busca: combina só quando todos os critérios batem", () => {
    expect(combinaComClienteIdeal(nova, perfil(), HOJE)).toBe(true);
    expect(combinaComClienteIdeal(estabelecida, perfil(), HOJE)).toBe(false);
    expect(combinaComClienteIdeal(estabelecida, perfil({ idade: "estabelecidas" }), HOJE)).toBe(true);
    expect(combinaComClienteIdeal(nova, perfil({ portes: ["05"] }), HOJE)).toBe(false);
    expect(combinaComClienteIdeal(mei, perfil({ idade: "tanto_faz" }), HOJE)).toBe(false);
    expect(combinaComClienteIdeal(mei, perfil({ idade: "tanto_faz", aceitaMei: true }), HOJE)).toBe(true);
    // Sem data de abertura não dá para dizer se é nova.
    expect(combinaComClienteIdeal({ porte: "03" }, perfil(), HOJE)).toBe(false);
  });

  it("o aprendizado do painel usa a mesma nota ajustada", () => {
    // Sem e-mail: estabelecida fica com 30 (baixa) e nova com 50 (média) na nota geral;
    // para quem prefere estabelecidas, é o contrário.
    const negocio = (dados: DadosParaPontuar, etapa: "ganho" | "perdido"): LeadEncerrado => ({
      telefone: dados.telefone,
      email: null,
      dataAbertura: dados.dataAbertura ?? null,
      porte: dados.porte ?? null,
      matriz: dados.matriz ?? null,
      naturezaJuridica: dados.naturezaJuridica ?? null,
      motivoPerda: null,
      origem: "busca_cnpj",
      etapa,
      tentativas: 1,
    });
    const negocios = [
      ...Array.from({ length: 5 }, () => negocio(estabelecida, "ganho")),
      ...Array.from({ length: 5 }, () => negocio(nova, "perdido")),
    ];
    const faixas = (resultado: ReturnType<typeof aprenderComOsResultados>) => JSON.stringify(resultado);
    const geral = aprenderComOsResultados(negocios, HOJE);
    const ajustado = aprenderComOsResultados(negocios, HOJE, perfil({ idade: "estabelecidas" }));
    expect(faixas(geral)).not.toBe(faixas(ajustado));
    expect(pontuar({ ...estabelecida, email: null }, HOJE).faixa).toBe("baixa");
    expect(pontuar({ ...estabelecida, email: null }, HOJE, perfil({ idade: "estabelecidas" })).faixa).toBe("media");
  });

  it("só administrador e dono mudam o cliente ideal", () => {
    expect(papelPode("member", "definirClienteIdeal")).toBe(false);
    expect(papelPode("admin", "definirClienteIdeal")).toBe(true);
  });
});

describe("cliente ideal no banco", () => {
  let amb: AmbienteDeTeste;
  let empresaA: string;
  let empresaB: string;
  let anaId: string;

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    const ana = await cadastrarPessoa(amb, "Ana Souza", "ana@empresa-a.com.br");
    const bruno = await cadastrarPessoa(amb, "Bruno Lima", "bruno@empresa-b.com.br");
    anaId = ana.id;
    empresaA = await criarEmpresa(amb, ana, "Agência A", "agencia-a");
    empresaB = await criarEmpresa(amb, bruno, "Agência B", "agencia-b");
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  it("salva, lê, atualiza e apaga, sem tocar na outra empresa", async () => {
    const a = repositorioClienteIdeal(amb.db, empresaA);
    const b = repositorioClienteIdeal(amb.db, empresaB);
    expect(await a.obter()).toBeNull();

    await a.salvar({ portes: ["05", "03"], idade: "estabelecidas", aceitaMei: false }, anaId);
    // Volta na ordem fixa dos portes.
    expect(await a.obter()).toEqual({ portes: ["03", "05"], idade: "estabelecidas", aceitaMei: false });
    expect(await b.obter()).toBeNull();

    await a.salvar({ portes: [], idade: "tanto_faz", aceitaMei: true }, anaId);
    expect(await a.obter()).toEqual({ portes: [], idade: "tanto_faz", aceitaMei: true });

    await b.apagar();
    expect(await a.obter()).not.toBeNull();
    await a.apagar();
    expect(await a.obter()).toBeNull();
  });

  it("o banco recusa porte e idade fora da lista", async () => {
    const a = repositorioClienteIdeal(amb.db, empresaA);
    await expect(
      a.salvar({ portes: ["99" as "01"], idade: "novas", aceitaMei: false }, anaId),
    ).rejects.toThrow();
    await expect(
      a.salvar({ portes: [], idade: "qualquer" as "novas", aceitaMei: false }, anaId),
    ).rejects.toThrow();
  });
});
