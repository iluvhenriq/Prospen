// Formatação de datas para a tela, sempre no fuso horário da empresa.
// Roda no servidor, então o resultado é o mesmo para todo mundo.

const FUSO_PADRAO = "America/Sao_Paulo";

function formatador(fuso: string, opcoes: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: fuso });
  } catch {
    // Fuso inválido guardado por engano: usa o padrão em vez de derrubar a página.
    return new Intl.DateTimeFormat("pt-BR", { ...opcoes, timeZone: FUSO_PADRAO });
  }
}

// Data sem hora ("2026-11-03", como o banco devolve uma coluna "date") para a
// tela. Não passa por fuso: é a data do calendário, não um instante.
export function formatarDataIso(valor: string | null): string | null {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatarData(data: Date, fuso: string = FUSO_PADRAO): string {
  return formatador(fuso, { dateStyle: "short" }).format(data);
}

export function formatarDataHora(data: Date, fuso: string = FUSO_PADRAO): string {
  return formatador(fuso, { dateStyle: "short", timeStyle: "short" }).format(data);
}
