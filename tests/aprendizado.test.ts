import { describe, expect, it } from "vitest";
import type { LeadEncerrado } from "@/modules/leads/repositorio";
import { aprenderComOsResultados, MINIMO_POR_GRUPO } from "@/modules/painel/aprendizado";

const HOJE = new Date("2026-10-27T12:00:00Z");

// Perfis com nota conhecida (regras.ts): alta = telefone + e-mail próprio +
// aberta há menos de 1 ano (15 + 25 + 20 = 60); baixa = só e-mail de contador (5).
const ALTA = { telefone: "11999990000", email: "dono@padaria.com.br", dataAbertura: "2026-05-01" };
const BAIXA = { telefone: null, email: "escritorio@contabil.com.br", dataAbertura: null };

function negocio(
  etapa: "ganho" | "perdido",
  extra: Partial<LeadEncerrado> = {},
): LeadEncerrado {
  return {
    etapa,
    motivoPerda: etapa === "perdido" ? "preco" : null,
    origem: "busca_cnpj",
    porte: null,
    matriz: null,
    naturezaJuridica: null,
    tentativas: 0,
    ...BAIXA,
    ...extra,
  };
}

const repetir = <T>(vezes: number, criar: () => T) => Array.from({ length: vezes }, criar);

describe("aprendizado com os resultados", () => {
  it("sem negócios encerrados suficientes, não tira conclusão e diz quanto falta", () => {
    const aprendizado = aprenderComOsResultados([negocio("ganho"), negocio("perdido")], HOJE);
    expect(aprendizado.encerrados).toBe(2);
    expect(aprendizado.faltam).toBe(MINIMO_POR_GRUPO - 2);
    expect(aprendizado.porFaixa.every((grupo) => grupo.taxa === null)).toBe(true);
    expect(aprendizado.insistencia).toBeNull();
    expect(aprendizado.tentativasNosGanhos).toBeNull();
    expect(aprendizado.motivoPorPorte).toEqual([]);
  });

  it("taxa de fechamento por faixa de prioridade, com a nota de hoje", () => {
    const linhas = [
      ...repetir(4, () => negocio("ganho", ALTA)),
      ...repetir(1, () => negocio("perdido", ALTA)),
      ...repetir(1, () => negocio("ganho")),
      ...repetir(4, () => negocio("perdido")),
    ];
    const { porFaixa, nota } = aprenderComOsResultados(linhas, HOJE);
    expect(porFaixa).toEqual([
      { chave: "alta", ganhos: 4, perdidos: 1, taxa: 80 },
      { chave: "media", ganhos: 0, perdidos: 0, taxa: null },
      { chave: "baixa", ganhos: 1, perdidos: 4, taxa: 20 },
    ]);
    expect(nota).toEqual({ alta: 80, baixa: 20, avaliacao: "separa" });
  });

  it("avisa quando a nota não separa quem compra, e não julga diferença pequena", () => {
    const naoSepara = aprenderComOsResultados(
      [
        ...repetir(1, () => negocio("ganho", ALTA)),
        ...repetir(4, () => negocio("perdido", ALTA)),
        ...repetir(3, () => negocio("ganho")),
        ...repetir(2, () => negocio("perdido")),
      ],
      HOJE,
    );
    expect(naoSepara.nota).toEqual({ alta: 20, baixa: 60, avaliacao: "nao_separa" });

    const pequena = aprenderComOsResultados(
      [
        ...repetir(3, () => negocio("ganho", ALTA)),
        ...repetir(2, () => negocio("perdido", ALTA)),
        ...repetir(5, () => negocio("ganho")),
        ...repetir(5, () => negocio("perdido")),
      ],
      HOJE,
    );
    expect(pequena.nota).toEqual({ alta: 60, baixa: 50, avaliacao: "separa" });

    const neutra = aprenderComOsResultados(
      [
        ...repetir(11, () => negocio("ganho", ALTA)),
        ...repetir(9, () => negocio("perdido", ALTA)),
        ...repetir(5, () => negocio("ganho")),
        ...repetir(5, () => negocio("perdido")),
      ],
      HOJE,
    );
    expect(neutra.nota).toEqual({ alta: 55, baixa: 50, avaliacao: "neutra" });
  });

  it("taxa por origem, do grupo maior para o menor, só com amostra suficiente", () => {
    const linhas = [
      ...repetir(3, () => negocio("ganho", { origem: "importacao" })),
      ...repetir(3, () => negocio("perdido", { origem: "importacao" })),
      ...repetir(2, () => negocio("ganho", { origem: "manual" })),
    ];
    const { porOrigem, melhorOrigem } = aprenderComOsResultados(linhas, HOJE);
    expect(porOrigem).toEqual([
      { chave: "importacao", ganhos: 3, perdidos: 3, taxa: 50 },
      { chave: "manual", ganhos: 2, perdidos: 0, taxa: null },
    ]);
    // Só uma origem comparável: não há "a que mais fecha".
    expect(melhorOrigem).toBeNull();

    const comDuas = aprenderComOsResultados(
      [...linhas, ...repetir(3, () => negocio("ganho", { origem: "manual" }))],
      HOJE,
    );
    expect(comDuas.melhorOrigem).toEqual({ chave: "manual", ganhos: 5, perdidos: 0, taxa: 100 });
  });

  it("motivo de perda mais comum por porte; empate e porte desconhecido ficam de fora", () => {
    const linhas = [
      ...repetir(4, () => negocio("perdido", { porte: "03", motivoPerda: "preco" })),
      ...repetir(1, () => negocio("perdido", { porte: "03", motivoPerda: "concorrente" })),
      // Porte 01: empate entre dois motivos.
      ...repetir(3, () => negocio("perdido", { porte: "01", motivoPerda: "preco" })),
      ...repetir(3, () => negocio("perdido", { porte: "01", motivoPerda: "momento" })),
      // Sem porte (lead de planilha): não entra.
      ...repetir(6, () => negocio("perdido", { motivoPerda: "sem_orcamento" })),
    ];
    expect(aprenderComOsResultados(linhas, HOJE).motivoPorPorte).toEqual([
      { porte: "03", motivo: "preco", vezes: 4, perdas: 5 },
    ]);
  });

  it("insistência: perdas por sem resposta com uma tentativa ou nenhuma", () => {
    const linhas = [
      ...repetir(3, () => negocio("perdido", { motivoPerda: "sem_resposta", tentativas: 1 })),
      ...repetir(1, () => negocio("perdido", { motivoPerda: "sem_resposta", tentativas: 0 })),
      ...repetir(2, () => negocio("perdido", { motivoPerda: "sem_resposta", tentativas: 4 })),
    ];
    expect(aprenderComOsResultados(linhas, HOJE).insistencia).toEqual({ poucasTentativas: 4, semResposta: 6 });
  });

  it("média de tentativas nos ganhos, com uma casa decimal", () => {
    const linhas = [2, 3, 3, 4, 5].map((tentativas) => negocio("ganho", { tentativas }));
    expect(aprenderComOsResultados(linhas, HOJE).tentativasNosGanhos).toBe(3.4);
  });
});
