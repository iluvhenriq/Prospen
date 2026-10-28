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

// Palavras que ficam minúsculas no meio do nome e siglas que ficam como são.
const CONECTIVOS = new Set(["de", "da", "do", "das", "dos", "e", "em", "para", "com", "a", "o"]);
const SIGLAS = new Set(["ME", "EPP", "MEI", "S/A", "SA", "S.A.", "S.A", "CIA", "LTDA.", "II", "III", "IV"]);
const SIGLAS_EM_MINUSCULA: Record<string, string> = { LTDA: "Ltda", "LTDA.": "Ltda.", CIA: "Cia", EIRELI: "Eireli" };

// Nome para a tela: a base da Receita grava tudo em caixa alta ("PADARIA DO
// JOAO LTDA"), que fica pesado de ler numa lista. Só muda a exibição; o dado
// gravado continua igual. Nome que já tem minúsculas é do usuário: fica como está.
export function nomeParaExibir(nome: string): string {
  if (/\p{Ll}/u.test(nome)) return nome;
  return nome
    .split(/(\s+)/)
    .map((parte, indice) => {
      if (/^\s+$/.test(parte) || parte === "") return parte;
      if (SIGLAS_EM_MINUSCULA[parte]) return SIGLAS_EM_MINUSCULA[parte];
      if (SIGLAS.has(parte) || /\d/.test(parte)) return parte;
      const minuscula = parte.toLocaleLowerCase("pt-BR");
      if (indice > 0 && CONECTIVOS.has(minuscula)) return minuscula;
      // Primeira letra de cada pedaço separado por hífen ou barra ("AUTO-PECAS" vira "Auto-Pecas").
      return minuscula.replace(/(^|[-/'(])(\p{L})/gu, (_, antes: string, letra: string) => antes + letra.toLocaleUpperCase("pt-BR"));
    })
    .join("");
}

// Data de hoje (AAAA-MM-DD) no fuso da empresa. A tela "Hoje" e as próximas
// ações usam o dia do calendário da empresa, não o do servidor.
export function hojeNoFuso(fuso: string = FUSO_PADRAO, agora: Date = new Date()): string {
  // "en-CA" escreve a data já no formato AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: fusoOuPadrao(fuso), year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

function fusoOuPadrao(fuso: string): string {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: fuso });
    return fuso;
  } catch {
    return FUSO_PADRAO;
  }
}

// Dias entre duas datas AAAA-MM-DD (b menos a). Sem fuso: são datas do calendário.
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function formatarData(data: Date, fuso: string = FUSO_PADRAO): string {
  return formatador(fuso, { dateStyle: "short" }).format(data);
}

export function formatarDataHora(data: Date, fuso: string = FUSO_PADRAO): string {
  return formatador(fuso, { dateStyle: "short", timeStyle: "short" }).format(data);
}
