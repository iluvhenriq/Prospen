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

export function formatarData(data: Date, fuso: string = FUSO_PADRAO): string {
  return formatador(fuso, { dateStyle: "short" }).format(data);
}

export function formatarDataHora(data: Date, fuso: string = FUSO_PADRAO): string {
  return formatador(fuso, { dateStyle: "short", timeStyle: "short" }).format(data);
}
