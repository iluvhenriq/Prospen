import { describe, expect, it } from "vitest";
import { CANAIS_CONTATO, RESULTADOS_CONTATO } from "@/db/schema";
import { diasEntre, hojeNoFuso } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import { validarContato, validarProximaAcao } from "@/modules/leads/validacao-contato";

describe("validação do contato e da próxima ação", () => {
  it("os textos das opções seguem as listas do banco, na mesma ordem", () => {
    // O formulário (no navegador) monta as opções a partir dos textos.
    expect(Object.keys(ptBR.contatos.canais)).toEqual([...CANAIS_CONTATO]);
    expect(Object.keys(ptBR.contatos.resultados)).toEqual([...RESULTADOS_CONTATO]);
  });

  it("aceita contato com próxima ação", () => {
    const resultado = validarContato({
      canal: "whatsapp",
      resultado: "pediu_retorno",
      proximaAcaoEm: "2026-10-30",
      proximaAcao: "  Ligar à tarde ",
    });
    expect(resultado).toEqual({
      ok: true,
      dados: { canal: "whatsapp", resultado: "pediu_retorno", proxima: { em: "2026-10-30", texto: "Ligar à tarde" } },
    });
  });

  it("aceita contato sem próxima ação", () => {
    const resultado = validarContato({ canal: "ligacao", resultado: "nao_atendeu", proximaAcaoEm: "", proximaAcao: "" });
    expect(resultado.ok && resultado.dados.proxima).toEqual({ em: null, texto: null });
  });

  it("recusa canal e resultado fora da lista, com mensagens em português", () => {
    const resultado = validarContato({ canal: "pombo", resultado: "", proximaAcaoEm: "", proximaAcao: "" });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erros.canal).toBe(ptBR.mensagens.contato.canalInvalido);
      expect(resultado.erros.resultado).toBe(ptBR.mensagens.contato.resultadoInvalido);
    }
  });

  it("recusa data inválida, texto sem data e texto longo", () => {
    expect(validarProximaAcao({ proximaAcaoEm: "2026-02-30", proximaAcao: "" })).toEqual({
      ok: false,
      erros: { proximaAcaoEm: ptBR.mensagens.contato.dataInvalida },
    });
    expect(validarProximaAcao({ proximaAcaoEm: "", proximaAcao: "Ligar" })).toEqual({
      ok: false,
      erros: { proximaAcaoEm: ptBR.mensagens.contato.textoSemData },
    });
    const longo = validarProximaAcao({ proximaAcaoEm: "2026-10-30", proximaAcao: "x".repeat(201) });
    expect(longo.ok).toBe(false);
  });
});

describe("datas do calendário da empresa", () => {
  it("hoje no fuso da empresa, mesmo quando o servidor já virou o dia", () => {
    // 02:30 de 28/10 em UTC ainda é 27/10 em São Paulo (UTC-3).
    const agora = new Date("2026-10-28T02:30:00Z");
    expect(hojeNoFuso("America/Sao_Paulo", agora)).toBe("2026-10-27");
    expect(hojeNoFuso("Europe/Lisbon", agora)).toBe("2026-10-28");
    expect(hojeNoFuso("Fuso/Inexistente", agora)).toBe("2026-10-27");
  });

  it("conta os dias entre duas datas", () => {
    expect(diasEntre("2026-10-20", "2026-10-27")).toBe(7);
    expect(diasEntre("2026-10-27", "2026-10-27")).toBe(0);
  });
});
