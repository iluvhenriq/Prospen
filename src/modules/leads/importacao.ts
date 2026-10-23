import type { OcorrenciaImportacao } from "@/db/schema/importacoes";
import type { Banco } from "@/db/tipos";
import {
  classificarLinhas,
  decodificarTexto,
  lerCsv,
  LIMITE_BYTES,
  LIMITE_LINHAS,
  LIMITE_OCORRENCIAS,
  mapearColunas,
  MENSAGEM_SEM_COLUNA_DE_NOME,
  type Mapeamento,
} from "./csv";
import { normalizarEmail, normalizarTelefone } from "./normalizacao";
import { repositorioImportacoes } from "./repositorio-importacoes";
import { repositorioLeads, type RepositorioLeads } from "./repositorio";
import type { DadosLead } from "./validacao";
import { ptBR } from "@/lib/i18n/pt-BR";

// Importação de planilha em duas fases: ANALISAR (não grava nada, mostra o que
// vai acontecer) e IMPORTAR (grava). As duas usam exatamente a mesma análise.

export type ColunasDetectadas = {
  nome: string | null;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  nomeVemDaEmpresa: boolean;
  ignoradas: string[];
};

export type AnaliseImportacao = {
  ok: true;
  nomeArquivo: string;
  totalLinhas: number;
  aceitas: DadosLead[];
  duplicadas: number;
  rejeitadas: number;
  // Primeiros problemas, em ordem de linha. A contagem acima é sempre exata.
  ocorrencias: OcorrenciaImportacao[];
  ocorrenciasOmitidas: number;
  colunas: ColunasDetectadas;
  avisos: string[];
};

export type ErroImportacao = { ok: false; erro: string };

export type ResumoImportacao = {
  totalLinhas: number;
  aceitas: number;
  duplicadas: number;
  rejeitadas: number;
};

export function limparNomeDoArquivo(nome: string): string {
  const base = nome.split(/[\\/]/).pop() ?? "";
  const limpo = base.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 120);
  return limpo === "" ? "planilha.csv" : limpo;
}

function titulo(cabecalhos: string[], indice: number | null): string | null {
  return indice === null ? null : cabecalhos[indice] || null;
}

function detectarColunas(cabecalhos: string[], mapa: Mapeamento): ColunasDetectadas {
  return {
    nome: titulo(cabecalhos, mapa.nome),
    empresa: titulo(cabecalhos, mapa.empresa),
    email: titulo(cabecalhos, mapa.email),
    telefone: titulo(cabecalhos, mapa.telefone),
    nomeVemDaEmpresa: mapa.nomeVemDaEmpresa,
    ignoradas: mapa.ignoradas,
  };
}

// Lê, valida e compara a planilha com os leads que a empresa já tem.
// Não grava nada.
export async function analisarCsv(
  repositorio: RepositorioLeads,
  bytes: Uint8Array,
  nomeArquivo: string,
  pais: string,
): Promise<AnaliseImportacao | ErroImportacao> {
  if (bytes.length === 0) return { ok: false, erro: ptBR.mensagens.importacao.arquivoVazio };
  if (bytes.length > LIMITE_BYTES) {
    return {
      ok: false,
      erro: ptBR.mensagens.importacao.arquivoGrande(LIMITE_BYTES / 1024 / 1024),
    };
  }
  // Arquivos .xlsx são ZIP ("PK") e PDFs começam com "%PDF": não são CSV.
  const ehZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  const ehPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  if (ehZip || ehPdf) {
    return {
      ok: false,
      erro: ptBR.mensagens.importacao.naoEhCsv,
    };
  }

  const tabela = lerCsv(decodificarTexto(bytes));
  if (tabela.problemas.length > 0) return { ok: false, erro: tabela.problemas[0] };
  if (tabela.cabecalhos.length === 0) {
    return { ok: false, erro: ptBR.mensagens.importacao.semDados };
  }

  const mapa = mapearColunasOuNulo(tabela.cabecalhos);
  if (!mapa) return { ok: false, erro: MENSAGEM_SEM_COLUNA_DE_NOME };

  if (tabela.linhas.length === 0) {
    return {
      ok: false,
      erro: ptBR.mensagens.importacao.soTitulos,
    };
  }
  if (tabela.linhas.length > LIMITE_LINHAS) {
    return {
      ok: false,
      erro: ptBR.mensagens.importacao.linhasDemais(tabela.linhas.length, LIMITE_LINHAS),
    };
  }

  const classificacao = classificarLinhas(tabela.linhas, mapa, pais);

  // Compara com o que a empresa já tem cadastrado.
  const emails = classificacao.validas
    .map(({ dados }) => normalizarEmail(dados.email))
    .filter((valor): valor is string => valor !== null);
  const telefones = classificacao.validas
    .map(({ dados }) => normalizarTelefone(dados.telefone, pais))
    .filter((valor): valor is string => valor !== null);
  const existentes = await repositorio.contatosExistentes(emails, telefones);

  const aceitas: DadosLead[] = [];
  const ocorrencias: OcorrenciaImportacao[] = [...classificacao.ocorrencias];
  let duplicadas = classificacao.duplicadas;

  for (const { linha, dados } of classificacao.validas) {
    const email = normalizarEmail(dados.email);
    const telefone = normalizarTelefone(dados.telefone, pais);
    if (email && existentes.emails.has(email)) {
      duplicadas++;
      ocorrencias.push({ linha, tipo: "duplicada", motivo: ptBR.mensagens.importacao.emailJaCadastrado });
    } else if (telefone && existentes.telefones.has(telefone)) {
      duplicadas++;
      ocorrencias.push({ linha, tipo: "duplicada", motivo: ptBR.mensagens.importacao.telefoneJaCadastrado });
    } else {
      aceitas.push(dados);
    }
  }

  ocorrencias.sort((a, b) => a.linha - b.linha);

  const avisos: string[] = [];
  if (mapa.email === null && mapa.telefone === null) {
    avisos.push(
      ptBR.mensagens.importacao.semColunaDeContato,
    );
  }

  return {
    ok: true,
    nomeArquivo: limparNomeDoArquivo(nomeArquivo),
    totalLinhas: classificacao.totalLinhas,
    aceitas,
    duplicadas,
    rejeitadas: classificacao.rejeitadas,
    ocorrencias: ocorrencias.slice(0, LIMITE_OCORRENCIAS),
    ocorrenciasOmitidas: Math.max(0, ocorrencias.length - LIMITE_OCORRENCIAS),
    colunas: detectarColunas(tabela.cabecalhos, mapa),
    avisos,
  };
}

function mapearColunasOuNulo(cabecalhos: string[]): Mapeamento | null {
  const mapa = mapearColunas(cabecalhos);
  return mapa.nome === null ? null : mapa;
}

// Grava os leads aceitos e registra a importação no histórico, tudo junto: se
// algo falhar no meio, nada fica pela metade.
export async function executarImportacao(
  db: Banco,
  organizacaoId: string,
  usuarioId: string | null,
  analise: AnaliseImportacao,
): Promise<ResumoImportacao> {
  return db.transaction(async (tx) => {
    const gravados = await repositorioLeads(tx, organizacaoId).criarVarios(
      analise.aceitas,
      usuarioId,
      "importacao",
    );
    // Se alguém cadastrou o mesmo contato entre a análise e a gravação, o banco
    // pulou essa linha. Ela passa a contar como duplicada.
    const conflitos = analise.aceitas.length - gravados;
    const resumo: ResumoImportacao = {
      totalLinhas: analise.totalLinhas,
      aceitas: gravados,
      duplicadas: analise.duplicadas + conflitos,
      rejeitadas: analise.rejeitadas,
    };

    await repositorioImportacoes(tx, organizacaoId).registrar({
      criadaPorId: usuarioId,
      nomeArquivo: analise.nomeArquivo,
      ...resumo,
      ocorrencias: analise.ocorrencias,
    });
    return resumo;
  });
}
