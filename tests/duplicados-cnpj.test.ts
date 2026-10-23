import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ErroLeadDuplicado, repositorioLeads } from "@/modules/leads/repositorio";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

// Regra de duplicados decidida em 22/10/2026: lead com CNPJ é único pelo CNPJ;
// e-mail e telefone são únicos só entre os leads sem CNPJ. Todos os CNPJs abaixo
// são válidos no cálculo e fictícios.
const CNPJ_PADARIA = "11222333000181";
const CNPJ_OFICINA = "12ABC34501DE35"; // alfanumérico
const CNPJ_MERCADO = "11444777000161";
const CONTADOR = { email: "contato@contabilidade.com.br", telefone: "(11) 3333-4444" };

describe("duplicados com CNPJ", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let empresaA: string;
  let empresaB: string;

  const leadsA = () => repositorioLeads(amb.db, empresaA);
  const leadsB = () => repositorioLeads(amb.db, empresaB);

  beforeAll(async () => {
    amb = await criarAmbienteDeTeste();
    ana = await cadastrarPessoa(amb, "Ana Souza", "ana@empresa-a.com.br");
    bruno = await cadastrarPessoa(amb, "Bruno Lima", "bruno@empresa-b.com.br");
    empresaA = await criarEmpresa(amb, ana, "Agência A", "agencia-a");
    empresaB = await criarEmpresa(amb, bruno, "Agência B", "agencia-b");
  });

  afterAll(async () => {
    await amb.encerrar();
  });

  it("aceita vários negócios com o mesmo contato do contador", async () => {
    const padaria = await leadsA().criar(
      { nome: "Padaria Modelo", cnpj: CNPJ_PADARIA, origem: "busca_cnpj", ...CONTADOR },
      ana.id,
    );
    const oficina = await leadsA().criar(
      { nome: "Oficina Modelo", cnpj: CNPJ_OFICINA, origem: "busca_cnpj", ...CONTADOR },
      ana.id,
    );
    expect(padaria.cnpj).toBe(CNPJ_PADARIA);
    expect(oficina.cnpj).toBe(CNPJ_OFICINA);
    expect(oficina.emailNormalizado).toBe(padaria.emailNormalizado);
  });

  it("recusa o mesmo CNPJ duas vezes na empresa, mesmo escrito de outro jeito", async () => {
    await expect(
      leadsA().criar({ nome: "Padaria de novo", cnpj: "11.222.333/0001-81" }, ana.id),
    ).rejects.toThrow(ErroLeadDuplicado);
    await expect(
      leadsA().criar({ nome: "Oficina de novo", cnpj: "12.abc.345/01de-35" }, ana.id),
    ).rejects.toMatchObject({ campo: "cnpj" });
  });

  it("acha o duplicado pelo CNPJ antes de gravar", async () => {
    const achados = await leadsA().encontrarDuplicados({ cnpj: "11.222.333/0001-81" });
    expect(achados).toEqual([{ campo: "cnpj", lead: expect.objectContaining({ nome: "Padaria Modelo" }) }]);
    // Com CNPJ novo, o contato repetido do contador não conta como duplicado.
    expect(await leadsA().encontrarDuplicados({ cnpj: CNPJ_MERCADO, ...CONTADOR })).toEqual([]);
  });

  it("o mesmo CNPJ pode existir em outra empresa, e uma não enxerga a outra", async () => {
    expect(await leadsB().encontrarDuplicados({ cnpj: CNPJ_PADARIA })).toEqual([]);
    const naB = await leadsB().criar({ nome: "Padaria Modelo", cnpj: CNPJ_PADARIA }, bruno.id);
    expect(naB.organizacaoId).toBe(empresaB);
  });

  it("lead sem CNPJ pode usar o contato que já está num lead com CNPJ", async () => {
    expect(await leadsA().encontrarDuplicados(CONTADOR)).toEqual([]);
    const manual = await leadsA().criar({ nome: "Contabilidade Silva", ...CONTADOR }, ana.id);
    expect(manual.cnpj).toBeNull();
  });

  it("entre leads sem CNPJ, e-mail e telefone continuam únicos", async () => {
    const achados = await leadsA().encontrarDuplicados(CONTADOR);
    expect(achados.map((a) => a.campo).sort()).toEqual(["email", "telefone"]);
    expect(achados[0].lead.nome).toBe("Contabilidade Silva");
    await expect(
      leadsA().criar({ nome: "Outra pessoa", email: CONTADOR.email }, ana.id),
    ).rejects.toMatchObject({ campo: "email" });
  });

  it("na edição de um lead com CNPJ, o contato repetido não é tratado como duplicado", async () => {
    const [oficina] = await leadsA().listar({ busca: "Oficina Modelo" });
    // O e-mail é o mesmo do lead manual "Contabilidade Silva", e mesmo assim vale.
    expect(
      await leadsA().encontrarDuplicados({ ...CONTADOR, ignorarId: oficina.id }),
    ).toEqual([]);
    const atualizado = await leadsA().atualizar(oficina.id, { telefone: "(11) 3333-4444" });
    expect(atualizado?.cnpj).toBe(CNPJ_OFICINA);
  });

  it("a edição não muda o CNPJ", async () => {
    const [padaria] = await leadsA().listar({ busca: "Padaria Modelo" });
    const atualizado = await leadsA().atualizar(padaria.id, {
      nome: "Padaria Modelo Ltda",
      cnpj: CNPJ_MERCADO,
    } as never);
    expect(atualizado?.cnpj).toBe(CNPJ_PADARIA);
  });

  it("a importação de planilha só compara com leads sem CNPJ", async () => {
    const existentes = await leadsA().contatosExistentes([CONTADOR.email], ["1133334444"]);
    // Só achou porque existe o lead manual "Contabilidade Silva".
    expect([...existentes.emails]).toEqual([CONTADOR.email]);

    const soComCnpj = await leadsA().contatosExistentes(["outro@contabilidade.com.br"], []);
    expect(soComCnpj.emails.size).toBe(0);
    await leadsA().criar(
      { nome: "Mercado Modelo", cnpj: CNPJ_MERCADO, email: "outro@contabilidade.com.br" },
      ana.id,
    );
    expect((await leadsA().contatosExistentes(["outro@contabilidade.com.br"], [])).emails.size).toBe(0);
    const gravados = await leadsA().criarVarios(
      [{ nome: "Pessoa da planilha", empresa: null, email: "outro@contabilidade.com.br", telefone: null, pais: "BR" }],
      ana.id,
      "importacao",
    );
    expect(gravados).toBe(1);
  });

  it("recusa CNPJ com dígitos verificadores errados", async () => {
    await expect(
      leadsA().criar({ nome: "CNPJ errado", cnpj: "11222333000182" }, ana.id),
    ).rejects.toThrow("CNPJ inválido.");
  });

  it("conta quantos outros leads da mesma empresa dividem o contato, sem olhar outras empresas", async () => {
    // A empresa B também tem um lead com o contato do contador.
    await leadsB().criar({ nome: "Outro negócio B", cnpj: CNPJ_MERCADO, origem: "busca_cnpj", ...CONTADOR }, bruno.id);

    const padaria = (await leadsA().listar({ busca: "Padaria Modelo" }))[0];
    const todosComContador = (await leadsA().listar()).filter(
      (lead) => lead.emailNormalizado === padaria.emailNormalizado,
    );
    expect(await leadsA().contatoCompartilhado(padaria)).toEqual({
      email: todosComContador.length - 1,
      telefone: todosComContador.length - 1,
    });

    const [deB] = await leadsB().listar({ busca: "Outro negócio B" });
    expect(await leadsB().contatoCompartilhado(deB)).toEqual({ email: 0, telefone: 0 });
  });
});
