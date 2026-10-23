import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { importacoes, leadEtiquetas, leads, notas, organization } from "@/db/schema";
import {
  ErroLeadDuplicado,
  repositorioLeads,
} from "@/modules/leads/repositorio";
import { repositorioEtiquetas } from "@/modules/leads/repositorio-etiquetas";
import { repositorioImportacoes } from "@/modules/leads/repositorio-importacoes";
import { repositorioNotas } from "@/modules/leads/repositorio-notas";
import { papelPode } from "@/modules/organizacoes/membros";
import {
  cadastrarPessoa,
  criarAmbienteDeTeste,
  criarEmpresa,
  type AmbienteDeTeste,
  type PessoaDeTeste,
} from "./ajuda/banco-teste";

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

// Leads, etiquetas, notas e histórico de importações em um banco de verdade
// (em memória), com duas empresas lado a lado.
describe("leads, etiquetas, notas e importações no banco", () => {
  let amb: AmbienteDeTeste;
  let ana: PessoaDeTeste;
  let bruno: PessoaDeTeste;
  let empresaA: string;
  let empresaB: string;

  const leadsA = () => repositorioLeads(amb.db, empresaA);
  const leadsB = () => repositorioLeads(amb.db, empresaB);
  const etiquetasA = () => repositorioEtiquetas(amb.db, empresaA);
  const etiquetasB = () => repositorioEtiquetas(amb.db, empresaB);
  const notasA = () => repositorioNotas(amb.db, empresaA);
  const notasB = () => repositorioNotas(amb.db, empresaB);

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

  describe("contatos únicos por empresa", () => {
    let joao: string;

    it("guarda e-mail e telefone padronizados ao gravar", async () => {
      const lead = await leadsA().criar(
        {
          nome: "João da Silva",
          empresa: "Barbearia Central",
          email: "Joao@Teste.com",
          telefone: "(11) 99999-0000",
        },
        ana.id,
      );
      joao = lead.id;
      expect(lead.emailNormalizado).toBe("joao@teste.com");
      expect(lead.telefoneNormalizado).toBe("11999990000");
      expect(lead.origem).toBe("manual");
      expect(lead.criadoPorId).toBe(ana.id);
    });

    it("recusa o mesmo e-mail na mesma empresa, mesmo com outra escrita", async () => {
      const tentativa = leadsA().criar({ nome: "Outro", email: " JOAO@teste.com " }, ana.id);
      await expect(tentativa).rejects.toBeInstanceOf(ErroLeadDuplicado);
      await expect(tentativa).rejects.toMatchObject({ campo: "email" });
    });

    it("recusa o mesmo telefone em outro formato", async () => {
      const tentativa = leadsA().criar({ nome: "Outro", telefone: "+55 11 99999-0000" }, ana.id);
      await expect(tentativa).rejects.toMatchObject({ campo: "telefone" });
    });

    it("a outra empresa pode ter o mesmo e-mail e telefone", async () => {
      const lead = await leadsB().criar(
        { nome: "João (da B)", email: "joao@teste.com", telefone: "11999990000" },
        bruno.id,
      );
      expect(lead.organizacaoId).toBe(empresaB);
    });

    it("permite vários leads sem e-mail e sem telefone", async () => {
      await leadsA().criar({ nome: "Sem contato 1" }, ana.id);
      await leadsA().criar({ nome: "Sem contato 2" }, ana.id);
      await leadsA().criar({ nome: "Sem contato 3", email: "", telefone: "" }, ana.id);
      expect(await leadsA().contar({ busca: "sem contato" })).toBe(3);
    });

    it("atualizar para o contato de outro lead é recusado", async () => {
      const bia = await leadsA().criar({ nome: "Bia", email: "bia@teste.com" }, ana.id);
      await expect(leadsA().atualizar(bia.id, { email: "joao@teste.com" })).rejects.toBeInstanceOf(
        ErroLeadDuplicado,
      );
      expect((await leadsA().buscar(bia.id))?.email).toBe("bia@teste.com");
    });

    it("atualizar mantendo o próprio contato funciona e padroniza de novo", async () => {
      const atualizado = await leadsA().atualizar(joao, {
        nome: "João S.",
        email: "JOAO@teste.com",
        telefone: "011 99999-0000",
      });
      expect(atualizado?.nome).toBe("João S.");
      expect(atualizado?.emailNormalizado).toBe("joao@teste.com");
      expect(atualizado?.telefoneNormalizado).toBe("11999990000");
    });

    it("apagar o e-mail de um lead libera o contato", async () => {
      const caio = await leadsA().criar({ nome: "Caio", email: "caio@teste.com" }, ana.id);
      const limpo = await leadsA().atualizar(caio.id, { email: null });
      expect(limpo?.email).toBeNull();
      expect(limpo?.emailNormalizado).toBeNull();
      await expect(leadsA().criar({ nome: "Caio 2", email: "caio@teste.com" }, ana.id)).resolves.toBeTruthy();
    });

    it("encontrarDuplicados diz o campo e o lead, e respeita ignorarId e a empresa", async () => {
      const achados = await leadsA().encontrarDuplicados({
        email: "JOAO@teste.com",
        telefone: "+55 (11) 99999-0000",
      });
      expect(achados).toEqual([
        { campo: "email", lead: { id: joao, nome: "João S." } },
        { campo: "telefone", lead: { id: joao, nome: "João S." } },
      ]);
      expect(await leadsA().encontrarDuplicados({ email: "joao@teste.com", ignorarId: joao })).toEqual([]);
      expect(await leadsA().encontrarDuplicados({})).toEqual([]);
      // O e-mail só existe na empresa B como outro lead; a A nunca vê o da B.
      const daB = await leadsB().encontrarDuplicados({ email: "joao@teste.com" });
      expect(daB).toHaveLength(1);
      expect(daB[0].lead.nome).toBe("João (da B)");
    });

    it("o banco recusa nome vazio mesmo fora do repositório", async () => {
      await expect(
        amb.pg.query(`insert into leads (organizacao_id, nome) values ($1, '   ')`, [empresaA]),
      ).rejects.toThrow();
    });
  });

  describe("gravação em lote", () => {
    it("grava os novos, pula os que já existem e conta só os gravados", async () => {
      const gravados = await leadsA().criarVarios(
        [
          { nome: "Lote 1", empresa: null, email: "lote1@teste.com", telefone: null, pais: "BR" },
          { nome: "Lote repetido", empresa: null, email: "JOAO@teste.com", telefone: null, pais: "BR" },
          { nome: "Lote 3", empresa: null, email: null, telefone: "(21) 98888-7777", pais: "BR" },
        ],
        ana.id,
        "importacao",
      );
      expect(gravados).toBe(2);
      const lote = await leadsA().listar({ busca: "lote" });
      expect(lote.map((l) => l.nome).sort()).toEqual(["Lote 1", "Lote 3"]);
      expect(lote.every((l) => l.origem === "importacao")).toBe(true);
      expect(lote.find((l) => l.nome === "Lote 3")?.telefoneNormalizado).toBe("21988887777");
    });

    it("aceita uma lista vazia", async () => {
      expect(await leadsA().criarVarios([], ana.id, "importacao")).toBe(0);
    });
  });

  describe("busca, filtros e páginas", () => {
    beforeAll(async () => {
      await leadsA().criar({ nome: "100% Lojas", origem: "google" }, ana.id);
      await leadsA().criar({ nome: "Maria Fernanda", empresa: "Studio Beleza", email: "maria@studio.com" }, ana.id);
    });

    it("a busca ignora acento e maiúsculas", async () => {
      expect((await leadsA().listar({ busca: "joao" })).map((l) => l.nome)).toContain("João S.");
      expect((await leadsA().listar({ busca: "JOÃO" })).map((l) => l.nome)).toContain("João S.");
      expect((await leadsA().listar({ busca: "barbearia central" })).map((l) => l.nome)).toEqual(["João S."]);
    });

    it("cada palavra precisa aparecer, em qualquer campo", async () => {
      expect((await leadsA().listar({ busca: "maria studio" })).map((l) => l.nome)).toEqual(["Maria Fernanda"]);
      expect(await leadsA().contar({ busca: "maria barbearia" })).toBe(0);
    });

    it("acha por parte do e-mail e por parte do telefone", async () => {
      expect((await leadsA().listar({ busca: "maria@stu" })).map((l) => l.nome)).toEqual(["Maria Fernanda"]);
      expect((await leadsA().listar({ busca: "99999" })).map((l) => l.nome)).toContain("João S.");
      expect((await leadsA().listar({ busca: "(21) 98888" })).map((l) => l.nome)).toEqual(["Lote 3"]);
    });

    it("% e _ valem como texto comum, não como curinga", async () => {
      expect((await leadsA().listar({ busca: "%" })).map((l) => l.nome)).toEqual(["100% Lojas"]);
      expect(await leadsA().contar({ busca: "_" })).toBe(0);
      expect(await leadsA().contar({ busca: "\\" })).toBe(0);
    });

    it("trechos de SQL digitados na busca não quebram nada", async () => {
      expect(await leadsA().contar({ busca: "'; drop table leads; --" })).toBe(0);
      expect(await leadsA().contar()).toBeGreaterThan(5);
    });

    it("filtra por origem", async () => {
      expect((await leadsA().listar({ origem: "google" })).map((l) => l.nome)).toEqual(["100% Lojas"]);
      expect(await leadsA().contar({ origem: "google" })).toBe(1);
      expect(await leadsA().contar({ origem: "busca_cnpj" })).toBe(0);
    });

    it("a busca nunca traz leads de outra empresa", async () => {
      expect(await leadsA().contar({ busca: "(da B)" })).toBe(0);
      expect((await leadsB().listar({ busca: "joao" })).map((l) => l.nome)).toEqual(["João (da B)"]);
    });

    it("as páginas não repetem nem pulam leads", async () => {
      const total = await leadsA().contar();
      const vistos = new Set<string>();
      for (let deslocamento = 0; deslocamento < total; deslocamento += 4) {
        for (const lead of await leadsA().listar({ limite: 4, deslocamento })) {
          expect(vistos.has(lead.id)).toBe(false);
          vistos.add(lead.id);
        }
      }
      expect(vistos.size).toBe(total);
    });

    it("limite e deslocamento absurdos são corrigidos", async () => {
      expect((await leadsA().listar({ limite: 100000 })).length).toBeLessThanOrEqual(200);
      expect(await leadsA().listar({ limite: -5, deslocamento: -10 })).toHaveLength(1);
    });
  });

  describe("etiquetas", () => {
    let quente: string;
    let leadMaria: string;
    let leadDaB: string;

    beforeAll(async () => {
      leadMaria = (await leadsA().listar({ busca: "maria" }))[0].id;
      leadDaB = (await leadsB().listar())[0].id;
    });

    it("'Quente', 'quente' e 'Quênte' são a mesma etiqueta", async () => {
      const primeira = await etiquetasA().obterOuCriar("Quente", "erro");
      expect(primeira.criada).toBe(true);
      quente = primeira.etiqueta.id;
      for (const variacao of ["quente", "  QUENTE ", "Quênte"]) {
        const outra = await etiquetasA().obterOuCriar(variacao);
        expect(outra.criada).toBe(false);
        expect(outra.etiqueta.id).toBe(quente);
      }
      expect(primeira.etiqueta.nome).toBe("Quente");
      expect(primeira.etiqueta.cor).toBe("erro");
    });

    it("a outra empresa pode ter uma etiqueta com o mesmo nome", async () => {
      const daB = await etiquetasB().obterOuCriar("Quente");
      expect(daB.criada).toBe(true);
      expect(daB.etiqueta.id).not.toBe(quente);
    });

    it("ligar uma etiqueta a um lead é permitido várias vezes sem duplicar", async () => {
      expect(await etiquetasA().atribuir(leadMaria, quente)).toBe(true);
      expect(await etiquetasA().atribuir(leadMaria, quente)).toBe(true);
      const lista = await etiquetasA().listar();
      expect(lista.find((e) => e.id === quente)?.totalLeads).toBe(1);
    });

    it("não liga lead ou etiqueta de outra empresa", async () => {
      const etiquetaB = (await etiquetasB().listar())[0].id;
      expect(await etiquetasA().atribuir(leadDaB, quente)).toBe(false);
      expect(await etiquetasA().atribuir(leadMaria, etiquetaB)).toBe(false);
      expect(await etiquetasB().atribuir(leadMaria, etiquetaB)).toBe(false);
      const totalDaB = (await etiquetasB().listar())[0].totalLeads;
      expect(totalDaB).toBe(0);
    });

    it("o banco recusa ligar dados de empresas diferentes, mesmo fora do repositório", async () => {
      const etiquetaB = (await etiquetasB().listar())[0].id;
      // Lead da A com etiqueta da B, dizendo que é da A.
      await expect(
        amb.pg.query(
          `insert into lead_etiquetas (organizacao_id, lead_id, etiqueta_id) values ($1, $2, $3)`,
          [empresaA, leadMaria, etiquetaB],
        ),
      ).rejects.toThrow();
      // Lead da A com etiqueta da A, dizendo que é da B.
      await expect(
        amb.pg.query(
          `insert into lead_etiquetas (organizacao_id, lead_id, etiqueta_id) values ($1, $2, $3)`,
          [empresaB, leadMaria, quente],
        ),
      ).rejects.toThrow();
    });

    it("filtra a lista por etiqueta, e etiqueta de outra empresa não acha nada", async () => {
      expect((await leadsA().listar({ etiquetaId: quente })).map((l) => l.nome)).toEqual(["Maria Fernanda"]);
      expect(await leadsA().contar({ etiquetaId: quente })).toBe(1);
      const etiquetaB = (await etiquetasB().listar())[0].id;
      expect(await leadsA().contar({ etiquetaId: etiquetaB })).toBe(0);
      expect(await leadsB().contar({ etiquetaId: quente })).toBe(0);
    });

    it("busca as etiquetas de vários leads de uma vez, em ordem alfabética", async () => {
      const frio = (await etiquetasA().obterOuCriar("Ainda frio")).etiqueta.id;
      await etiquetasA().atribuir(leadMaria, frio);
      const mapa = await etiquetasA().dosLeads([leadMaria, leadDaB]);
      expect(mapa.get(leadMaria)?.map((e) => e.nome)).toEqual(["Ainda frio", "Quente"]);
      expect(mapa.has(leadDaB)).toBe(false);
      expect((await etiquetasA().dosLeads([])).size).toBe(0);
    });

    it("tirar a etiqueta de um lead só vale na própria empresa", async () => {
      expect(await etiquetasB().remover(leadMaria, quente)).toBe(false);
      expect(await etiquetasA().remover(leadMaria, quente)).toBe(true);
      expect(await etiquetasA().remover(leadMaria, quente)).toBe(false);
      expect((await etiquetasA().dosLeads([leadMaria])).get(leadMaria)?.map((e) => e.nome)).toEqual(["Ainda frio"]);
    });

    it("excluir a etiqueta a tira de todos os leads, mas não apaga os leads", async () => {
      await etiquetasA().atribuir(leadMaria, quente);
      expect(await etiquetasB().excluir(quente)).toBe(false);
      expect(await etiquetasA().excluir(quente)).toBe(true);
      expect(await etiquetasA().buscar(quente)).toBeNull();
      expect(await leadsA().buscar(leadMaria)).not.toBeNull();
      const restantes = await amb.db.select().from(leadEtiquetas).where(eq(leadEtiquetas.etiquetaId, quente));
      expect(restantes).toEqual([]);
    });

    it("o banco recusa nome de etiqueta vazio ou cor inventada", async () => {
      await expect(
        amb.pg.query(
          `insert into etiquetas (organizacao_id, nome, nome_normalizado) values ($1, '  ', 'x')`,
          [empresaA],
        ),
      ).rejects.toThrow();
      await expect(
        amb.pg.query(
          `insert into etiquetas (organizacao_id, nome, nome_normalizado, cor) values ($1, 'Teste', 'teste', 'rosa')`,
          [empresaA],
        ),
      ).rejects.toThrow();
    });

    it("exige o identificador da empresa", () => {
      expect(() => repositorioEtiquetas(amb.db, "")).toThrow();
    });
  });

  describe("notas", () => {
    let leadMaria: string;
    let leadDaB: string;

    beforeAll(async () => {
      leadMaria = (await leadsA().listar({ busca: "maria" }))[0].id;
      leadDaB = (await leadsB().listar())[0].id;
    });

    it("cria a nota e mostra o nome de quem escreveu, da mais nova para a mais antiga", async () => {
      const primeira = await notasA().criar(leadMaria, "  Pediu orçamento.  ", ana.id);
      expect(primeira?.texto).toBe("Pediu orçamento.");
      await esperar(15);
      await notasA().criar(leadMaria, "Ligar na sexta.", ana.id);

      const lista = await notasA().listar(leadMaria);
      expect(lista.map((n) => n.texto)).toEqual(["Ligar na sexta.", "Pediu orçamento."]);
      expect(lista[0].autorNome).toBe("Ana Souza");
    });

    it("não cria nota em lead de outra empresa", async () => {
      expect(await notasA().criar(leadDaB, "Invasão", ana.id)).toBeNull();
      expect(await notasB().criar(leadMaria, "Invasão", bruno.id)).toBeNull();
      expect(await notasB().listar(leadDaB)).toEqual([]);
    });

    it("não lê nem apaga nota de outra empresa", async () => {
      const [nota] = await notasA().listar(leadMaria);
      expect(await notasB().buscar(nota.id)).toBeNull();
      expect(await notasB().listar(leadMaria)).toEqual([]);
      expect(await notasB().excluir(nota.id)).toBe(false);
      expect(await notasA().buscar(nota.id)).not.toBeNull();
    });

    it("o banco recusa uma nota de uma empresa presa ao lead de outra", async () => {
      await expect(
        amb.pg.query(
          `insert into notas (organizacao_id, lead_id, texto) values ($1, $2, 'x')`,
          [empresaB, leadMaria],
        ),
      ).rejects.toThrow();
    });

    it("o banco recusa nota vazia ou grande demais", async () => {
      await expect(
        amb.pg.query(`insert into notas (organizacao_id, lead_id, texto) values ($1, $2, '   ')`, [empresaA, leadMaria]),
      ).rejects.toThrow();
      await expect(
        amb.pg.query(`insert into notas (organizacao_id, lead_id, texto) values ($1, $2, $3)`, [
          empresaA,
          leadMaria,
          "x".repeat(2001),
        ]),
      ).rejects.toThrow();
    });

    it("apagar a nota funciona na própria empresa", async () => {
      const [nota] = await notasA().listar(leadMaria);
      expect(await notasA().excluir(nota.id)).toBe(true);
      expect(await notasA().listar(leadMaria)).toHaveLength(1);
    });

    it("apagar o lead apaga as notas e as etiquetas dele", async () => {
      const lead = await leadsA().criar({ nome: "Lead descartável" }, ana.id);
      await notasA().criar(lead.id, "Nota do descartável", ana.id);
      const etiqueta = (await etiquetasA().obterOuCriar("Descartável")).etiqueta.id;
      await etiquetasA().atribuir(lead.id, etiqueta);

      expect(await leadsA().excluir(lead.id)).toBe(true);
      expect(await amb.db.select().from(notas).where(eq(notas.leadId, lead.id))).toEqual([]);
      expect(await amb.db.select().from(leadEtiquetas).where(eq(leadEtiquetas.leadId, lead.id))).toEqual([]);
      // A etiqueta em si continua existindo.
      expect(await etiquetasA().buscar(etiqueta)).not.toBeNull();
    });
  });

  describe("histórico de importações", () => {
    const dados = (nomeArquivo: string, aceitas: number) => ({
      criadaPorId: null,
      nomeArquivo,
      totalLinhas: aceitas + 2,
      aceitas,
      duplicadas: 1,
      rejeitadas: 1,
      ocorrencias: [{ linha: 3, tipo: "rejeitada" as const, motivo: "Nome: Informe o nome do lead." }],
    });

    it("registra e lista só as importações da própria empresa", async () => {
      await repositorioImportacoes(amb.db, empresaA).registrar(dados("a.csv", 5));
      await repositorioImportacoes(amb.db, empresaB).registrar(dados("b.csv", 7));

      const daA = await repositorioImportacoes(amb.db, empresaA).listarRecentes();
      const daB = await repositorioImportacoes(amb.db, empresaB).listarRecentes();
      expect(daA.map((i) => i.nomeArquivo)).toEqual(["a.csv"]);
      expect(daB.map((i) => i.nomeArquivo)).toEqual(["b.csv"]);
      expect(daA[0].ocorrencias).toEqual(dados("a.csv", 5).ocorrencias);
    });

    it("lista da mais nova para a mais antiga e respeita o limite", async () => {
      await esperar(15);
      await repositorioImportacoes(amb.db, empresaA).registrar(dados("a2.csv", 1));
      const lista = await repositorioImportacoes(amb.db, empresaA).listarRecentes(1);
      expect(lista.map((i) => i.nomeArquivo)).toEqual(["a2.csv"]);
    });

    it("o banco recusa contagens que não fecham com o total", async () => {
      await expect(
        amb.pg.query(
          `insert into importacoes (organizacao_id, nome_arquivo, total_linhas, aceitas, duplicadas, rejeitadas)
           values ($1, 'x.csv', 10, 5, 1, 1)`,
          [empresaA],
        ),
      ).rejects.toThrow();
    });
  });

  describe("apagar uma empresa", () => {
    it("apaga leads, etiquetas, notas e importações dela, e só dela", async () => {
      const carla = await cadastrarPessoa(amb, "Carla", "carla@empresa-c.com.br");
      const empresaC = await criarEmpresa(amb, carla, "Loja C", "loja-c");
      const lead = await repositorioLeads(amb.db, empresaC).criar({ nome: "Lead da C" }, carla.id);
      await repositorioNotas(amb.db, empresaC).criar(lead.id, "Nota da C", carla.id);
      const etiqueta = (await repositorioEtiquetas(amb.db, empresaC).obterOuCriar("Da C")).etiqueta.id;
      await repositorioEtiquetas(amb.db, empresaC).atribuir(lead.id, etiqueta);
      await repositorioImportacoes(amb.db, empresaC).registrar(dadosVazios());

      const antesA = await leadsA().contar();
      await amb.db.delete(organization).where(eq(organization.id, empresaC));

      for (const tabela of [leads, notas, leadEtiquetas, importacoes]) {
        const restantes = await amb.db.select().from(tabela).where(eq(tabela.organizacaoId, empresaC));
        expect(restantes).toEqual([]);
      }
      expect(await amb.pg.query(`select 1 from etiquetas where organizacao_id = $1`, [empresaC])).toMatchObject({
        rows: [],
      });
      expect(await leadsA().contar()).toBe(antesA);
    });
  });

  describe("quem pode apagar etiquetas", () => {
    it("o membro trabalha com leads, mas só administrador e dono apagam etiquetas", () => {
      expect(papelPode("member", "trabalharComLeads")).toBe(true);
      expect(papelPode("member", "gerenciarEtiquetas")).toBe(false);
      expect(papelPode("admin", "gerenciarEtiquetas")).toBe(true);
      expect(papelPode("owner", "gerenciarEtiquetas")).toBe(true);
    });
  });
});

function dadosVazios() {
  return {
    criadaPorId: null,
    nomeArquivo: "c.csv",
    totalLinhas: 0,
    aceitas: 0,
    duplicadas: 0,
    rejeitadas: 0,
    ocorrencias: [],
  };
}
