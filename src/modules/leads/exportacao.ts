import type { Etiqueta, Lead } from "@/db/schema";
import { formatarData, formatarDataIso } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import { formatarCnpj } from "./cnpj";

// Exportação dos leads em CSV (28/10/2026). Regra pura, sem banco: quem chama
// traz os leads já filtrados e só da empresa. Separador ";" e vírgula decimal,
// como o Excel em português espera, e marca de UTF-8 no começo para os acentos.

// Máximo de leads por arquivo. Acima disso, a pessoa filtra e exporta em partes.
export const LIMITE_DE_EXPORTACAO = 10_000;

const SEPARADOR = ";";

// Célula que começa com = + - @ (ou tabulação, retorno) vira fórmula no Excel
// e no Google Planilhas: um lead com nome "=HYPERLINK(...)" executaria algo na
// máquina de quem abre. Um apóstrofo na frente faz virar texto. Telefone e
// número puro ("+55 11 99999-0000", "-10") não são perigosos e ficam como estão.
export function celulaSegura(valor: string): string {
  if (!/^[=+\-@\t\r]/.test(valor)) return valor;
  if (/^[+-]?[\d\s().-]+$/.test(valor)) return valor;
  return `'${valor}`;
}

function celula(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  const texto = celulaSegura(String(valor));
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function valorDecimal(centavos: number | null): string {
  if (centavos === null) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function gerarCsvDeLeads(
  leads: Lead[],
  etiquetasPorLead: Map<string, Etiqueta[]>,
  fusoHorario: string,
): string {
  const t = ptBR.leads.exportar.colunas;
  const cabecalho = [
    t.nome,
    t.empresa,
    t.cnpj,
    t.email,
    t.telefone,
    t.pais,
    t.origem,
    t.etapa,
    t.etiquetas,
    t.proximaAcaoEm,
    t.proximaAcao,
    t.valorVenda,
    t.moeda,
    t.motivoPerda,
    t.criadoEm,
  ];
  const linhas = leads.map((lead) =>
    [
      lead.nome,
      lead.empresa,
      lead.cnpj ? formatarCnpj(lead.cnpj) : null,
      lead.email,
      lead.telefone,
      lead.pais,
      ptBR.leads.origens[lead.origem] ?? lead.origem,
      ptBR.funil.etapas[lead.etapa],
      (etiquetasPorLead.get(lead.id) ?? []).map((etiqueta) => etiqueta.nome).join(", "),
      formatarDataIso(lead.proximaAcaoEm),
      lead.proximaAcao,
      valorDecimal(lead.valorVendaCentavos),
      lead.moedaVenda,
      lead.motivoPerda ? ptBR.funil.resultado.motivos[lead.motivoPerda] : null,
      formatarData(lead.criadoEm, fusoHorario),
    ]
      .map(celula)
      .join(SEPARADOR),
  );
  // "﻿": marca de UTF-8, sem ela o Excel mostra "Ã§" no lugar de "ç".
  return `﻿${[cabecalho.map(celula).join(SEPARADOR), ...linhas].join("\r\n")}\r\n`;
}
