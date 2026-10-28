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

// Cliente ideal de cada empresa (etapa 9f, 28/10/2026). Ajusta a nota dos
// leads dela: porte que ela atende, se prefere empresas novas ou
// estabelecidas e se atende MEI. Sem perfil, a nota é a geral (a mesma da base).
// A base pública NÃO usa o perfil: a busca ordena pela nota geral, guardada
// com índice. Calcular a nota de cada empresa na hora levou de 30 a 80 s por
// busca em SP (scripts/medir-perfil.ts, 28/10/2026).
export const PORTES_DO_PERFIL = ["01", "03", "05"] as const;
export type PorteDoPerfil = (typeof PORTES_DO_PERFIL)[number];
export const IDADES_DO_PERFIL = ["novas", "estabelecidas", "tanto_faz"] as const;
export type IdadeDoPerfil = (typeof IDADES_DO_PERFIL)[number];

export type ClienteIdeal = {
  // Vazio: atende qualquer porte (vale a regra geral).
  portes: PorteDoPerfil[];
  idade: IdadeDoPerfil;
  aceitaMei: boolean;
};

export const PESOS_DO_PERFIL = {
  porteNoPerfil: 20,
  porteForaDoPerfil: -10,
  // Aberta há mais de 3 anos, para quem prefere empresas estabelecidas.
  empresaEstabelecida: 20,
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
  | "mei"
  | "porteNoPerfil"
  | "porteForaDoPerfil"
  | "empresaEstabelecida";

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
  porteNoPerfil: PESOS_DO_PERFIL.porteNoPerfil,
  porteForaDoPerfil: PESOS_DO_PERFIL.porteForaDoPerfil,
  empresaEstabelecida: PESOS_DO_PERFIL.empresaEstabelecida,
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
// Com "perfil", a nota é a ajustada ao cliente ideal da empresa.
export function pontuar(dados: DadosParaPontuar, hoje: Date = new Date(), perfil: ClienteIdeal | null = null): Pontuacao {
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

  const idade = perfil?.idade ?? "novas";
  if (dados.dataAbertura && idade !== "tanto_faz") {
    const abertura = new Date(`${dados.dataAbertura}T00:00:00Z`);
    if (idade === "novas") {
      if (abertura > anosAntes(hoje, 1)) somar("empresaNova", PESOS.empresaNova);
      else if (abertura > anosAntes(hoje, 3)) somar("empresaRecente", PESOS.empresaRecente);
    } else if (abertura <= anosAntes(hoje, 3)) somar("empresaEstabelecida", PESOS_DO_PERFIL.empresaEstabelecida);
    else if (abertura <= anosAntes(hoje, 1)) somar("empresaRecente", PESOS.empresaRecente);
  }

  if (perfil && perfil.portes.length > 0) {
    // Porte desconhecido (lead sem dados da Receita) não ganha nem perde.
    if (dados.porte && (perfil.portes as string[]).includes(dados.porte)) {
      somar("porteNoPerfil", PESOS_DO_PERFIL.porteNoPerfil);
    } else if (dados.porte && MOTIVO_DO_PORTE[dados.porte]) {
      somar("porteForaDoPerfil", PESOS_DO_PERFIL.porteForaDoPerfil);
    }
  } else {
    const motivoDoPorte = dados.porte ? MOTIVO_DO_PORTE[dados.porte] : undefined;
    if (dados.porte && motivoDoPorte) somar(motivoDoPorte, PESOS.porte[dados.porte]);
  }

  if (dados.matriz) somar("matriz", PESOS.matriz);
  if (dados.naturezaJuridica === NATUREZA_MEI && !perfil?.aceitaMei) somar("mei", PESOS.mei);

  pontos = Math.max(0, Math.min(100, pontos));
  return { pontos, faixa: faixaDe(pontos), motivos };
}

// A empresa da base combina com o cliente ideal? Serve para marcar na busca,
// que ordena pela nota geral. Critério sem preferência ("qualquer") não conta.
export function combinaComClienteIdeal(
  dados: Pick<DadosParaPontuar, "dataAbertura" | "porte" | "naturezaJuridica">,
  perfil: ClienteIdeal,
  hoje: Date = new Date(),
): boolean {
  if (dados.naturezaJuridica === NATUREZA_MEI && !perfil.aceitaMei) return false;
  if (perfil.portes.length > 0 && !(dados.porte && (perfil.portes as string[]).includes(dados.porte))) return false;
  if (perfil.idade !== "tanto_faz") {
    if (!dados.dataAbertura) return false;
    const abertura = new Date(`${dados.dataAbertura}T00:00:00Z`);
    const nova = abertura > anosAntes(hoje, 3);
    if (perfil.idade === "novas" ? !nova : nova) return false;
  }
  return true;
}

// Mesma data, N anos antes, em UTC (as datas da Receita não têm fuso).
export function anosAntes(hoje: Date, anos: number): Date {
  return new Date(Date.UTC(hoje.getUTCFullYear() - anos, hoje.getUTCMonth(), hoje.getUTCDate()));
}
