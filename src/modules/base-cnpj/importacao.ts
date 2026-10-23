import { readdirSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import type { EmpresaBase, EstabelecimentoBase } from "@/db/schema";
import {
  converterEmpresa,
  converterEstabelecimento,
  lerZipDaReceita,
  SITUACAO_ATIVA,
} from "@/integrations/receita-cnpj/leitura";
import { cnpjValido } from "@/modules/leads/cnpj";
import type { RepositorioBaseCnpj } from "./repositorio";

// Carrega um estado da base pública de CNPJ a partir dos arquivos já baixados
// (npm run cnpj:baixar). Só entram estabelecimentos ATIVOS do estado pedido, e
// só as empresas que têm algum desses estabelecimentos.
//
// Os arquivos da Receita são divididos por pedaços do país, não por estado,
// então todos os arquivos de Estabelecimentos e Empresas são lidos inteiros.

// 3.000 linhas de 20 colunas ficam abaixo do limite de 65.535 parâmetros do PostgreSQL.
const TAMANHO_DO_LOTE = 3000;
const ARQUIVOS_AO_MESMO_TEMPO = Math.max(1, Math.min(4, availableParallelism() - 1));

export type ResumoImportacaoBase = {
  estabelecimentosLidos: number;
  linhasForaDoFormato: number;
  cnpjsInvalidos: number;
  ativosDoEstado: number;
  gravados: number;
  empresasGravadas: number;
  apagadosAntes: number;
  segundos: number;
};

function arquivosDoTipo(pasta: string, prefixo: string): string[] {
  return readdirSync(pasta)
    .filter((nome) => new RegExp(`^${prefixo}\\d*\\.zip$`).test(nome))
    .sort()
    .map((nome) => join(pasta, nome));
}

async function lerMunicipios(pasta: string): Promise<Map<string, string>> {
  const [arquivo] = arquivosDoTipo(pasta, "Municipios");
  const nomes = new Map<string, string>();
  if (!arquivo) return nomes;
  for await (const [codigo, nome] of lerZipDaReceita(arquivo)) {
    if (codigo && nome) nomes.set(codigo.trim(), nome.trim());
  }
  return nomes;
}

export async function importarEstado({
  repositorio,
  pasta,
  mes,
  uf,
  avisar = () => {},
}: {
  repositorio: RepositorioBaseCnpj;
  pasta: string;
  mes: string;
  uf: string;
  avisar?: (mensagem: string) => void;
}): Promise<ResumoImportacaoBase> {
  const inicio = Date.now();
  const estabelecimentos = arquivosDoTipo(pasta, "Estabelecimentos");
  const empresas = arquivosDoTipo(pasta, "Empresas");
  if (estabelecimentos.length === 0 || empresas.length === 0) {
    throw new Error(`Faltam arquivos em ${pasta}. Rode antes: npm run cnpj:baixar -- ${mes}`);
  }

  const municipios = await lerMunicipios(pasta);
  await gravarCnaesDaPasta(repositorio, pasta);
  const apagadosAntes = await repositorio.contarEstabelecimentos(uf);

  // Os arquivos vão para a tabela temporária. Enquanto isso, a tabela final e
  // a busca continuam como estavam; a troca acontece só no fim.
  await repositorio.prepararCarga();
  let resumo: ResumoImportacaoBase;
  try {
    resumo = await carregar({ repositorio, estabelecimentos, empresas, municipios, mes, uf, avisar, inicio });
    resumo.apagadosAntes = apagadosAntes;

    avisar("Trocando os dados do estado e calculando a pontuação...");
    // Sem os índices de busca durante a troca: gravar milhões de linhas com
    // eles atualizados a cada linha deixa tudo preso no disco.
    await repositorio.removerIndicesDeBusca();
    try {
      resumo.gravados = await repositorio.concluirCarga(uf);
      avisar(`Dados trocados (${segundosDesde(inicio)} s).`);
    } finally {
      // Volta os índices mesmo se a troca falhar no meio.
      avisar("Recriando os índices de busca...");
      await repositorio.recriarIndicesDeBusca();
      avisar(`Índices prontos (${segundosDesde(inicio)} s).`);
    }
  } finally {
    await repositorio.descartarCarga();
  }
  // Só depois dos índices de volta: a lista de cidades lê por estado.
  await repositorio.registrarCarga(uf, mes);
  resumo.segundos = segundosDesde(inicio);
  return resumo;
}

// Tabela de atividades (Cnaes.zip), usada pela busca por palavra.
export async function gravarCnaesDaPasta(repositorio: RepositorioBaseCnpj, pasta: string): Promise<void> {
  const [arquivo] = arquivosDoTipo(pasta, "Cnaes");
  if (!arquivo) return;
  const lista: { codigo: string; descricao: string }[] = [];
  for await (const [codigo, descricao] of lerZipDaReceita(arquivo)) {
    if (codigo?.trim() && descricao?.trim()) lista.push({ codigo: codigo.trim(), descricao: descricao.trim() });
  }
  await repositorio.gravarCnaes(lista);
}

async function carregar({
  repositorio,
  estabelecimentos,
  empresas,
  municipios,
  mes,
  uf,
  avisar,
  inicio,
}: {
  repositorio: RepositorioBaseCnpj;
  estabelecimentos: string[];
  empresas: string[];
  municipios: Map<string, string>;
  mes: string;
  uf: string;
  avisar: (mensagem: string) => void;
  inicio: number;
}): Promise<ResumoImportacaoBase> {
  const resumo: ResumoImportacaoBase = {
    estabelecimentosLidos: 0,
    linhasForaDoFormato: 0,
    cnpjsInvalidos: 0,
    ativosDoEstado: 0,
    gravados: 0,
    empresasGravadas: 0,
    apagadosAntes: 0,
    segundos: 0,
  };

  // Empresas que interessam: as que têm estabelecimento ativo no estado.
  const basicos = new Set<string>();
  // A UF aparece entre aspas na linha. Linha sem ela não pode ser do estado e é
  // pulada sem ser separada (a maior parte do país).
  const doEstado = (linhaCrua: string) => linhaCrua.includes(`"${uf}"`);

  await emParalelo(estabelecimentos, async (arquivo) => {
    let lote: EstabelecimentoBase[] = [];
    const gravarLote = async () => {
      const paraGravar = lote;
      lote = [];
      // Só para acompanhar o progresso: o total final vem da troca, no fim
      // (CNPJ repetido nos arquivos conta aqui, mas entra uma vez só).
      // Somar depois do await: "total += await ..." perde o que outro
      // arquivo somou no meio (aconteceu na carga de SP).
      const gravados = await repositorio.inserirNaCarga(paraGravar);
      resumo.gravados += gravados;
    };
    for await (const colunas of lerZipDaReceita(arquivo, doEstado)) {
      resumo.estabelecimentosLidos++;
      const lido = converterEstabelecimento(colunas);
      if (!lido) {
        resumo.linhasForaDoFormato++;
        continue;
      }
      if (lido.uf !== uf || lido.situacao !== SITUACAO_ATIVA) continue;
      if (!cnpjValido(lido.cnpj)) {
        resumo.cnpjsInvalidos++;
        continue;
      }
      resumo.ativosDoEstado++;
      basicos.add(lido.cnpjBasico);
      lote.push({
        cnpj: lido.cnpj,
        cnpjBasico: lido.cnpjBasico,
        matriz: lido.matriz,
        nomeFantasia: lido.nomeFantasia,
        dataInicioAtividade: lido.dataInicioAtividade,
        cnaePrincipal: lido.cnaePrincipal,
        cnaesSecundarios: lido.cnaesSecundarios,
        tipoLogradouro: lido.tipoLogradouro,
        logradouro: lido.logradouro,
        numero: lido.numero,
        complemento: lido.complemento,
        bairro: lido.bairro,
        cep: lido.cep,
        uf: lido.uf,
        municipioCodigo: lido.municipioCodigo,
        municipioNome: municipios.get(lido.municipioCodigo) ?? null,
        telefone1: lido.telefone1,
        telefone2: lido.telefone2,
        email: lido.email,
        mesReferencia: mes,
      });
      if (lote.length >= TAMANHO_DO_LOTE) await gravarLote();
    }
    await gravarLote();
  }, (terminados) =>
    avisar(
      `  Estabelecimentos: ${terminados} de ${estabelecimentos.length} arquivos, ` +
        `${resumo.ativosDoEstado} ativos de ${uf} até aqui (${segundosDesde(inicio)} s).`,
    ),
  );

  // A linha de Empresas começa com "CNPJ básico": filtra sem separar a linha.
  const dasEmpresasDoEstado = (linhaCrua: string) => basicos.has(linhaCrua.slice(1, 9));
  await emParalelo(empresas, async (arquivo) => {
    let lote: EmpresaBase[] = [];
    const gravarEmpresas = async () => {
      await repositorio.gravarEmpresas(lote);
      resumo.empresasGravadas += lote.length;
      lote = [];
    };
    for await (const colunas of lerZipDaReceita(arquivo, dasEmpresasDoEstado)) {
      const empresa = converterEmpresa(colunas);
      if (!empresa || !basicos.has(empresa.cnpjBasico)) continue;
      lote.push({ ...empresa, mesReferencia: mes });
      if (lote.length >= TAMANHO_DO_LOTE) await gravarEmpresas();
    }
    await gravarEmpresas();
  }, (terminados) =>
    avisar(
      `  Empresas: ${terminados} de ${empresas.length} arquivos, ` +
        `${resumo.empresasGravadas} gravadas até aqui (${segundosDesde(inicio)} s).`,
    ),
  );

  return resumo;
}

function segundosDesde(inicio: number): number {
  return Math.round((Date.now() - inicio) / 1000);
}

// Processa vários arquivos ao mesmo tempo. Cada um tem o próprio "tar"
// descompactando em outro processo, então o trabalho se espalha pelos núcleos.
async function emParalelo(
  arquivos: string[],
  tarefa: (arquivo: string) => Promise<void>,
  aoTerminarArquivo: (terminados: number) => void,
) {
  const fila = [...arquivos];
  let terminados = 0;
  const trabalhador = async () => {
    for (let arquivo = fila.shift(); arquivo; arquivo = fila.shift()) {
      await tarefa(arquivo);
      aoTerminarArquivo(++terminados);
    }
  };
  await Promise.all(Array.from({ length: Math.min(ARQUIVOS_AO_MESMO_TEMPO, fila.length) }, trabalhador));
}
