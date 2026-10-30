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
import { QUEDA_MAXIMA_DE_ATIVAS, type RepositorioBaseCnpj } from "./repositorio";

// Carrega estados da base pública de CNPJ a partir dos arquivos já baixados
// (npm run cnpj:baixar). Só entram estabelecimentos ATIVOS dos estados pedidos,
// e só as empresas que têm algum desses estabelecimentos.
//
// Os arquivos da Receita são divididos por pedaços do país, não por estado,
// então todos os arquivos de Estabelecimentos e Empresas são lidos inteiros.
// Por isso vários estados (ou o Brasil todo) vão numa leitura só.

// As 27 unidades da federação. "BR" no comando carrega todas de uma vez.
export const UFS_DO_BRASIL = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

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
  uf,
  ...resto
}: {
  repositorio: RepositorioBaseCnpj;
  pasta: string;
  mes: string;
  uf: string;
  avisar?: (mensagem: string) => void;
}): Promise<ResumoImportacaoBase> {
  return importarEstados({ ...resto, ufs: [uf] });
}

export async function importarEstados({
  repositorio,
  pasta,
  mes,
  ufs,
  avisar = () => {},
}: {
  repositorio: RepositorioBaseCnpj;
  pasta: string;
  mes: string;
  ufs: readonly string[];
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
  const antesPorEstado = await repositorio.contarPorEstado(ufs);
  const apagadosAntes = somar(antesPorEstado);

  // Os arquivos vão para a tabela temporária. Enquanto isso, a tabela final e
  // a busca continuam como estavam; a troca acontece só no fim.
  await repositorio.prepararCarga();
  let resumo: ResumoImportacaoBase;
  try {
    resumo = await carregar({ repositorio, estabelecimentos, empresas, municipios, mes, ufs, avisar, inicio });
    resumo.apagadosAntes = apagadosAntes;

    avisar("Trocando os dados e calculando a pontuação...");
    // Sem os índices de busca durante a troca: gravar milhões de linhas com
    // eles atualizados a cada linha deixa tudo preso no disco.
    await repositorio.removerIndicesDeBusca();
    try {
      await repositorio.concluirCarga(ufs);
      const depoisPorEstado = await repositorio.contarPorEstado(ufs);
      resumo.gravados = somar(depoisPorEstado);
      avisar(`Dados trocados (${segundosDesde(inicio)} s).`);
      for (const uf of ufs) {
        const antes = antesPorEstado.get(uf) ?? 0;
        const depois = depoisPorEstado.get(uf) ?? 0;
        if (antes > 0 && depois < antes * (1 - QUEDA_MAXIMA_DE_ATIVAS)) {
          avisar(
            `ATENÇÃO: ${uf} caiu de ${antes} para ${depois} empresas ativas. ` +
              "Confira se todos os arquivos da Receita baixaram inteiros. O radar não marcou empresas como fechadas neste mês.",
          );
        }
      }
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
  for (const uf of ufs) await repositorio.registrarCarga(uf, mes);
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
  ufs,
  avisar,
  inicio,
}: {
  repositorio: RepositorioBaseCnpj;
  estabelecimentos: string[];
  empresas: string[];
  municipios: Map<string, string>;
  mes: string;
  ufs: readonly string[];
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

  // Empresas que interessam: as que têm estabelecimento ativo nos estados.
  const basicos = new ConjuntoDeBasicos();
  const pedidos = new Set(ufs);
  // A UF aparece entre aspas na linha. Linha sem nenhuma delas não pode ser dos
  // estados pedidos e é pulada sem ser separada. Com o Brasil todo, não há o
  // que pular.
  const marcas = ufs.map((uf) => `"${uf}"`);
  const doEstado =
    pedidos.size >= UFS_DO_BRASIL.length
      ? undefined
      : (linhaCrua: string) => marcas.some((marca) => linhaCrua.includes(marca));

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
      if (!pedidos.has(lido.uf) || lido.situacao !== SITUACAO_ATIVA) continue;
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
        `${resumo.ativosDoEstado} ativos até aqui (${segundosDesde(inicio)} s).`,
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

// Raízes de CNPJ (8 caracteres, números ou letras no CNPJ alfanumérico) das
// empresas que interessam. O Brasil todo passa de 20 milhões: um Set do
// JavaScript não aceita mais de 16,7 milhões de itens, e 20 milhões de textos
// pesam na memória. Por isso a raiz vira número (base 36, cabe sem perda) e
// fica dividida em vários Sets.
class ConjuntoDeBasicos {
  private readonly partes = Array.from({ length: 16 }, () => new Set<number>());

  private parte(chave: number): Set<number> {
    return this.partes[chave % this.partes.length];
  }

  add(basico: string): void {
    const chave = parseInt(basico, 36);
    this.parte(chave).add(chave);
  }

  has(basico: string): boolean {
    const chave = parseInt(basico, 36);
    return Number.isFinite(chave) && this.parte(chave).has(chave);
  }
}

function somar(porEstado: Map<string, number>): number {
  let total = 0;
  for (const n of porEstado.values()) total += n;
  return total;
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
