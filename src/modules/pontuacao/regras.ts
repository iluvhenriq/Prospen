// Pontuação dos leads por regras simples (etapa 6, decidida em 23/10/2026).
// Diz "quem vale contatar primeiro" com os dados que já existem: contato e,
// quando o lead vem da base pública, os dados da Receita. Sem serviço externo.
//
// ÚNICO lugar das regras e dos pesos. A busca na base pública usa a mesma
// conta em SQL (src/modules/base-cnpj/repositorio.ts, concluirCarga),
// montada a partir destas constantes; um teste confere que as duas batem.

export const PESOS = {
  telefone: 15,
  emailProprio: 25,
  emailContador: 5,
  // Aberta há menos de 1 ano / entre 1 e 3 anos.
  empresaNova: 20,
  empresaRecente: 10,
  porte: { "01": 5, "03": 15, "05": 10 } as Record<string, number>,
  matriz: 5,
  mei: -15,
} as const;

export const FAIXA_ALTA = 55;
export const FAIXA_MEDIA = 35;

// Na amostra de SP (23/10/2026), 21% dos e-mails tinham estas palavras: em
// geral é o escritório de contabilidade, não o dono. Precisa funcionar igual
// em JavaScript e no PostgreSQL (expressão simples, sem atalhos).
export const PADRAO_EMAIL_CONTADOR = "(contab|contad|escritorio|assessoria)";

export const NATUREZA_MEI = "2135";

export type Motivo =
  | "telefone"
  | "emailProprio"
  | "emailContador"
  | "empresaNova"
  | "empresaRecente"
  | "porteMicro"
  | "portePequena"
  | "porteDemais"
  | "matriz"
  | "mei";

const MOTIVO_DO_PORTE: Record<string, Motivo> = { "01": "porteMicro", "03": "portePequena", "05": "porteDemais" };

// Quanto cada motivo soma (ou tira). Serve para mostrar a conta da nota.
export const VALOR_DO_MOTIVO: Record<Motivo, number> = {
  telefone: PESOS.telefone,
  emailProprio: PESOS.emailProprio,
  emailContador: PESOS.emailContador,
  empresaNova: PESOS.empresaNova,
  empresaRecente: PESOS.empresaRecente,
  porteMicro: PESOS.porte["01"],
  portePequena: PESOS.porte["03"],
  porteDemais: PESOS.porte["05"],
  matriz: PESOS.matriz,
  mei: PESOS.mei,
};

export type Faixa = "alta" | "media" | "baixa";

export type DadosParaPontuar = {
  telefone: string | null;
  email: string | null;
  // Só existem nos leads vindos da base pública.
  dataAbertura?: string | null; // AAAA-MM-DD
  porte?: string | null;
  matriz?: boolean | null;
  naturezaJuridica?: string | null;
};

export type Pontuacao = { pontos: number; faixa: Faixa; motivos: Motivo[] };

export function faixaDe(pontos: number): Faixa {
  if (pontos >= FAIXA_ALTA) return "alta";
  if (pontos >= FAIXA_MEDIA) return "media";
  return "baixa";
}

// "hoje" entra como parâmetro para o resultado não depender do relógio nos testes.
export function pontuar(dados: DadosParaPontuar, hoje: Date = new Date()): Pontuacao {
  const motivos: Motivo[] = [];
  let pontos = 0;
  const somar = (motivo: Motivo, valor: number) => {
    motivos.push(motivo);
    pontos += valor;
  };

  if (dados.telefone?.trim()) somar("telefone", PESOS.telefone);

  const email = dados.email?.trim().toLowerCase();
  if (email) {
    if (new RegExp(PADRAO_EMAIL_CONTADOR).test(email)) somar("emailContador", PESOS.emailContador);
    else somar("emailProprio", PESOS.emailProprio);
  }

  if (dados.dataAbertura) {
    const abertura = new Date(`${dados.dataAbertura}T00:00:00Z`);
    if (abertura > anosAntes(hoje, 1)) somar("empresaNova", PESOS.empresaNova);
    else if (abertura > anosAntes(hoje, 3)) somar("empresaRecente", PESOS.empresaRecente);
  }

  const motivoDoPorte = dados.porte ? MOTIVO_DO_PORTE[dados.porte] : undefined;
  if (dados.porte && motivoDoPorte) somar(motivoDoPorte, PESOS.porte[dados.porte]);

  if (dados.matriz) somar("matriz", PESOS.matriz);
  if (dados.naturezaJuridica === NATUREZA_MEI) somar("mei", PESOS.mei);

  pontos = Math.max(0, Math.min(100, pontos));
  return { pontos, faixa: faixaDe(pontos), motivos };
}

// Mesma data, N anos antes, em UTC (as datas da Receita não têm fuso).
export function anosAntes(hoje: Date, anos: number): Date {
  return new Date(Date.UTC(hoje.getUTCFullYear() - anos, hoje.getUTCMonth(), hoje.getUTCDate()));
}
