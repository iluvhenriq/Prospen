import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream } from "node:stream/web";
import {
  abrirArquivo,
  listarArquivosDoMes,
  listarMeses,
} from "../src/integrations/receita-cnpj/fonte";
import { carregarEnvLocal } from "./carregar-env";

// Baixa os arquivos do CNPJ que o PROSPEN usa, de um mês publicado pela Receita.
//   npm run cnpj:baixar              (mês mais recente)
//   npm run cnpj:baixar -- 2026-10   (mês escolhido)
// Pode ser interrompido e rodado de novo: continua de onde parou e pula o que
// já está completo. Cada arquivo é conferido pelo tamanho informado pela Receita.
//
// Sócios e Simples ficam de fora de propósito: sócios são dados de pessoas
// físicas que o produto não precisa (LGPD).
const ARQUIVOS_USADOS = /^(Estabelecimentos\d|Empresas\d|Cnaes|Municipios|Motivos|Naturezas)\.zip$/;

function pastaDeDados(): string {
  carregarEnvLocal();
  return process.env.CNPJ_PASTA_DADOS || "D:\\prospen-dados\\cnpj";
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} MB`;
}

async function baixar(mes: string, nome: string, tamanho: number, destino: string): Promise<void> {
  const final = join(destino, nome);
  const parcial = `${final}.parcial`;
  if (existsSync(final) && statSync(final).size === tamanho) {
    console.log(`  ${nome}: já baixado.`);
    return;
  }

  const jaTem = existsSync(parcial) ? statSync(parcial).size : 0;
  if (jaTem > tamanho) throw new Error(`${nome}: arquivo parcial maior que o esperado. Apague ${parcial}.`);
  console.log(`  ${nome}: ${jaTem > 0 ? `continuando de ${megabytes(jaTem)}` : "baixando"} (${megabytes(tamanho)})...`);

  const resposta = await abrirArquivo(mes, nome, jaTem);
  // 206 = o servidor aceitou continuar. 200 = mandou o arquivo inteiro de novo.
  const continuando = jaTem > 0 && resposta.status === 206;
  if (!resposta.body) throw new Error(`${nome}: resposta sem conteúdo.`);
  await pipeline(
    Readable.fromWeb(resposta.body as ReadableStream),
    createWriteStream(parcial, { flags: continuando ? "a" : "w" }),
  );

  const recebido = statSync(parcial).size;
  if (recebido !== tamanho) {
    throw new Error(`${nome}: recebido ${recebido} bytes, esperado ${tamanho}. Rode de novo para continuar.`);
  }
  renameSync(parcial, final);
  console.log(`  ${nome}: concluído.`);
}

async function main(): Promise<void> {
  const meses = await listarMeses();
  const mes = process.argv[2] ?? meses[meses.length - 1];
  if (!meses.includes(mes)) {
    throw new Error(`O mês ${mes} não está publicado. Disponíveis: ${meses.slice(-6).join(", ")}...`);
  }

  const arquivos = (await listarArquivosDoMes(mes)).filter((a) => ARQUIVOS_USADOS.test(a.nome));
  const total = arquivos.reduce((soma, a) => soma + (a.tamanho ?? 0), 0);
  const destino = join(pastaDeDados(), mes);
  mkdirSync(destino, { recursive: true });
  console.log(`Mês ${mes}: ${arquivos.length} arquivos, ${megabytes(total)}, em ${destino}`);

  for (const arquivo of arquivos) {
    if (arquivo.tamanho === null) throw new Error(`${arquivo.nome}: a Receita não informou o tamanho.`);
    await baixar(mes, arquivo.nome, arquivo.tamanho, destino);
  }
  console.log("Download concluído.");
}

main().catch((erro: unknown) => {
  console.error("Falha no download:", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
