import Papa from "papaparse";
import type { OcorrenciaImportacao } from "@/db/schema/importacoes";
import {
  normalizarEmail,
  normalizarTelefone,
  normalizarTexto,
} from "./normalizacao";
import { ROTULOS_CAMPO, validarLead, type DadosLead } from "./validacao";
import { ptBR } from "@/lib/i18n/pt-BR";

// Leitura e validação de planilhas CSV. Funções puras: não usam banco nem rede.
// A parte que compara com os leads já existentes fica em importacao.ts.

export const LIMITE_BYTES = 2 * 1024 * 1024;
export const LIMITE_LINHAS = 5000;
// Quantos problemas são mostrados e guardados. A contagem total é sempre exata.
export const LIMITE_OCORRENCIAS = 200;

// O Excel em português costuma salvar CSV em Windows-1252 (ANSI), não em UTF-8.
// Tenta UTF-8 de forma estrita e, se houver bytes inválidos, usa Windows-1252.
export function decodificarTexto(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }
  const semMarca =
    bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
      ? bytes.subarray(3)
      : bytes;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(semMarca);
  } catch {
    return new TextDecoder("windows-1252").decode(semMarca);
  }
}

export type TabelaCsv = {
  cabecalhos: string[];
  // numero: posição da linha na planilha (a primeira, dos títulos, é a linha 1).
  linhas: { numero: number; celulas: string[] }[];
  problemas: string[];
};

const vazia = (celulas: string[]) => celulas.every((c) => c.trim() === "");

// Descobre o separador de colunas. Planilhas brasileiras costumam usar ponto e vírgula.
//
// A detecção é feita em uma leitura à parte, ignorando as linhas em branco. Se ela
// fosse feita junto da leitura que preserva as linhas em branco (necessária para
// numerar as linhas como na planilha), a quebra de linha no fim do arquivo, que
// quase todo CSV tem, contaria como uma linha de uma coluna só e derrubaria a
// detecção: um CSV com ponto e vírgula viria inteiro em uma única coluna.
function detectarSeparador(texto: string): string {
  const sondagem = Papa.parse<string[]>(texto, {
    delimitersToGuess: [",", ";", "\t", "|"],
    skipEmptyLines: "greedy",
    preview: 50,
  });
  return sondagem.meta.delimiter || ",";
}

export function lerCsv(texto: string): TabelaCsv {
  const resultado = Papa.parse<string[]>(texto, {
    delimiter: detectarSeparador(texto),
    skipEmptyLines: false,
  });

  const problemas: string[] = [];
  // "UndetectableDelimiter" acontece com planilhas de uma coluna só. Não é problema.
  const erroDeAspas = resultado.errors.find((erro) => erro.type === "Quotes");
  if (erroDeAspas) {
    problemas.push(
      ptBR.mensagens.importacao.aspasSemFechar,
    );
  }

  const todas = resultado.data.map((celulas, indice) => ({
    numero: indice + 1,
    celulas: celulas.map((celula) => (celula ?? "").toString()),
  }));

  const primeira = todas.findIndex((linha) => !vazia(linha.celulas));
  if (primeira === -1) return { cabecalhos: [], linhas: [], problemas };

  return {
    cabecalhos: todas[primeira].celulas.map((c) => c.trim()),
    linhas: todas.slice(primeira + 1).filter((linha) => !vazia(linha.celulas)),
    problemas,
  };
}

type Campo = "nome" | "empresa" | "email" | "telefone";

// Títulos de coluna aceitos, sem acento, em minúsculo e sem símbolos.
const SINONIMOS: Record<Campo, string[]> = {
  nome: [
    "nome",
    "name",
    "nomecompleto",
    "nomedocontato",
    "contato",
    "responsavel",
    "lead",
    "cliente",
    "nomedolead",
  ],
  empresa: [
    "empresa",
    "company",
    "razaosocial",
    "nomefantasia",
    "fantasia",
    "negocio",
    "estabelecimento",
    "organizacao",
  ],
  email: ["email", "emails", "correioeletronico", "emaildocontato", "mail"],
  telefone: [
    "telefone",
    "celular",
    "whatsapp",
    "fone",
    "tel",
    "phone",
    "telefonecelular",
    "telefonedocontato",
    "whatsappdocontato",
    "telefone1",
  ],
};

const chaveDoTitulo = (titulo: string) =>
  normalizarTexto(titulo).replace(/[^a-z0-9]/g, "");

export type Mapeamento = {
  // Posição da coluna de cada campo, ou nulo se a planilha não tem.
  nome: number | null;
  empresa: number | null;
  email: number | null;
  telefone: number | null;
  // Sem coluna de nome, o nome do lead vem da coluna da empresa.
  nomeVemDaEmpresa: boolean;
  // Títulos de colunas que não foram usadas.
  ignoradas: string[];
};

export function mapearColunas(cabecalhos: string[]): Mapeamento {
  const usados = new Set<number>();
  const achar = (campo: Campo): number | null => {
    const indice = cabecalhos.findIndex(
      (titulo, i) => !usados.has(i) && SINONIMOS[campo].includes(chaveDoTitulo(titulo)),
    );
    if (indice === -1) return null;
    usados.add(indice);
    return indice;
  };

  let nome = achar("nome");
  let empresa = achar("empresa");
  const email = achar("email");
  const telefone = achar("telefone");

  let nomeVemDaEmpresa = false;
  if (nome === null && empresa !== null) {
    nome = empresa;
    empresa = null;
    nomeVemDaEmpresa = true;
  }

  return {
    nome,
    empresa,
    email,
    telefone,
    nomeVemDaEmpresa,
    ignoradas: cabecalhos.filter((titulo, i) => titulo !== "" && !usados.has(i)),
  };
}

export const MENSAGEM_SEM_COLUNA_DE_NOME =
  ptBR.mensagens.importacao.semColunaDeNome;

export type LinhaValida = { linha: number; dados: DadosLead };

export type Classificacao = {
  totalLinhas: number;
  validas: LinhaValida[];
  rejeitadas: number;
  duplicadas: number;
  ocorrencias: OcorrenciaImportacao[];
};

export function resumirErros(erros: Record<string, string | undefined>): string {
  return Object.entries(erros)
    .map(([campo, mensagem]) => {
      const rotulo = ROTULOS_CAMPO[campo as keyof typeof ROTULOS_CAMPO] ?? campo;
      return `${rotulo}: ${mensagem ?? "valor inválido"}`;
    })
    .join(" ");
}

// Valida cada linha e separa as aceitas das rejeitadas e das repetidas dentro
// do próprio arquivo. Os motivos nunca incluem o conteúdo da linha: eles são
// guardados no histórico e não devem carregar dados pessoais.
export function classificarLinhas(
  linhas: TabelaCsv["linhas"],
  mapa: Mapeamento,
  pais: string,
): Classificacao {
  const validas: LinhaValida[] = [];
  const ocorrencias: OcorrenciaImportacao[] = [];
  let rejeitadas = 0;
  let duplicadas = 0;

  const emailsVistos = new Map<string, number>();
  const telefonesVistos = new Map<string, number>();

  const celula = (celulas: string[], indice: number | null) =>
    indice === null ? "" : (celulas[indice] ?? "");

  for (const { numero, celulas } of linhas) {
    const resultado = validarLead({
      nome: celula(celulas, mapa.nome),
      empresa: celula(celulas, mapa.empresa),
      email: celula(celulas, mapa.email),
      telefone: celula(celulas, mapa.telefone),
      pais,
    });

    if (!resultado.ok) {
      rejeitadas++;
      ocorrencias.push({
        linha: numero,
        tipo: "rejeitada",
        motivo: resumirErros(resultado.erros),
      });
      continue;
    }

    const email = normalizarEmail(resultado.dados.email);
    const telefone = normalizarTelefone(resultado.dados.telefone, pais);
    const linhaDoEmail = email ? emailsVistos.get(email) : undefined;
    const linhaDoTelefone = telefone ? telefonesVistos.get(telefone) : undefined;

    if (linhaDoEmail !== undefined || linhaDoTelefone !== undefined) {
      duplicadas++;
      ocorrencias.push({
        linha: numero,
        tipo: "duplicada",
        motivo:
          linhaDoEmail !== undefined
            ? ptBR.mensagens.importacao.emailRepetido(linhaDoEmail)
            : ptBR.mensagens.importacao.telefoneRepetido(linhaDoTelefone as number),
      });
      continue;
    }

    if (email) emailsVistos.set(email, numero);
    if (telefone) telefonesVistos.set(telefone, numero);
    validas.push({ linha: numero, dados: resultado.dados });
  }

  return { totalLinhas: linhas.length, validas, rejeitadas, duplicadas, ocorrencias };
}
