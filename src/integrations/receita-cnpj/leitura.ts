import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

// Leitura dos arquivos da Receita (dados abertos do CNPJ).
// Formato: CSV sem cabeçalho, separado por ";", campos entre aspas, texto em
// latin-1 (ISO-8859-1). Cada .zip tem um único arquivo dentro.
// Layout (30 colunas em Estabelecimentos, 7 em Empresas) conferido em 23/10/2026
// contra um carregador aberto conhecido e contra os próprios arquivos.

// Separa uma linha no formato fixo da Receita: "a";"b";"c". Bem mais rápido que
// um leitor de CSV genérico, o que importa porque cada carga lê o país inteiro
// (cerca de 60 milhões de linhas). Uma aspa dentro de um campo não atrapalha,
// porque o separador procurado é a sequência aspa, ponto e vírgula, aspa.
export function separarLinha(linha: string): string[] {
  if (linha.length >= 2 && linha.startsWith('"') && linha.endsWith('"')) {
    return linha.slice(1, -1).split('";"');
  }
  return linha.split(";");
}

// Lê um .zip da Receita linha a linha, sem descompactar no disco (os arquivos
// abertos somam dezenas de GB). Usa o "tar" que vem no Windows 10 e 11.
// "filtro" recebe a linha crua e descarta antes de separar, o que poupa a maior
// parte do trabalho quando só um estado interessa.
export async function* lerZipDaReceita(
  caminhoZip: string,
  filtro?: (linhaCrua: string) => boolean,
): AsyncGenerator<string[]> {
  const tar = spawn("tar", ["-xOf", caminhoZip], { stdio: ["ignore", "pipe", "pipe"] });
  let erroDoTar = "";
  tar.stderr.on("data", (parte: Buffer) => {
    erroDoTar += parte.toString();
  });
  const terminou = new Promise<number>((resolver, rejeitar) => {
    tar.on("error", rejeitar);
    tar.on("close", (codigo) => resolver(codigo ?? 0));
  });

  tar.stdout.setEncoding("latin1");
  const linhas = createInterface({ input: tar.stdout, crlfDelay: Infinity });
  let completo = false;
  try {
    for await (const linha of linhas) {
      if (linha === "" || (filtro && !filtro(linha))) continue;
      yield separarLinha(linha);
    }
    completo = true;
  } finally {
    // Quem parou de ler no meio (erro ou limite): encerra o tar, senão ele fica
    // esperando para sempre e o programa não termina.
    if (!completo) tar.kill();
  }

  const codigo = await terminou;
  if (codigo !== 0) throw new Error(`Falha ao ler ${caminhoZip}: ${erroDoTar.trim() || `código ${codigo}`}`);
}

// --- Conversão das linhas (funções puras) -----------------------------------

function limpar(valor: string | undefined): string | null {
  const texto = (valor ?? "").trim();
  return texto === "" ? null : texto;
}

// "20051103" vira "2005-11-03". "0", "00000000" ou data impossível viram nulo.
export function converterData(valor: string | undefined): string | null {
  const texto = (valor ?? "").trim();
  if (!/^\d{8}$/.test(texto) || /^0+$/.test(texto)) return null;
  const iso = `${texto.slice(0, 4)}-${texto.slice(4, 6)}-${texto.slice(6, 8)}`;
  const data = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso ? null : iso;
}

function telefone(ddd: string | undefined, numero: string | undefined): string | null {
  const digitos = `${ddd ?? ""}${numero ?? ""}`.replace(/\D/g, "");
  return digitos.length >= 10 ? digitos : null;
}

export const SITUACAO_ATIVA = "02";

export type EstabelecimentoLido = {
  cnpj: string;
  cnpjBasico: string;
  matriz: boolean;
  nomeFantasia: string | null;
  situacao: string;
  dataInicioAtividade: string | null;
  cnaePrincipal: string;
  cnaesSecundarios: string[];
  tipoLogradouro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string;
  municipioCodigo: string;
  telefone1: string | null;
  telefone2: string | null;
  email: string | null;
};

// Uma linha de Estabelecimentos. Nulo se a linha não tem o formato esperado.
export function converterEstabelecimento(c: string[]): EstabelecimentoLido | null {
  if (c.length !== 30) return null;
  const cnpj = `${c[0]}${c[1]}${c[2]}`.trim().toUpperCase();
  const uf = (c[19] ?? "").trim().toUpperCase();
  const cnae = (c[11] ?? "").trim();
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj) || !/^[A-Z]{2}$/.test(uf) || cnae === "") return null;
  const email = limpar(c[27])?.toLowerCase() ?? null;
  return {
    cnpj,
    cnpjBasico: c[0].trim().toUpperCase(),
    matriz: c[3].trim() === "1",
    nomeFantasia: limpar(c[4]),
    situacao: c[5].trim().padStart(2, "0"),
    dataInicioAtividade: converterData(c[10]),
    cnaePrincipal: cnae,
    cnaesSecundarios: (c[12] ?? "").split(",").map((v) => v.trim()).filter(Boolean),
    tipoLogradouro: limpar(c[13]),
    logradouro: limpar(c[14]),
    numero: limpar(c[15]),
    complemento: limpar(c[16]),
    bairro: limpar(c[17]),
    cep: limpar(c[18])?.replace(/\D/g, "") || null,
    uf,
    municipioCodigo: c[20].trim(),
    telefone1: telefone(c[21], c[22]),
    telefone2: telefone(c[23], c[24]),
    email: email && email.includes("@") ? email : null,
  };
}

export type EmpresaLida = {
  cnpjBasico: string;
  razaoSocial: string;
  naturezaJuridica: string | null;
  porte: string | null;
};

// A razão social do MEI costuma terminar com o CPF do dono ("JOAO SILVA
// 12345678900"). O CPF não é guardado nem exibido (decisão de LGPD, 23/10/2026).
export function tirarCpfDoFim(razaoSocial: string): string {
  return razaoSocial.replace(/[\s.-]*\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, "").trim();
}

// Uma linha de Empresas. Nulo se a linha não tem o formato esperado.
export function converterEmpresa(c: string[]): EmpresaLida | null {
  if (c.length !== 7) return null;
  const cnpjBasico = c[0].trim().toUpperCase();
  const razaoSocial = limpar(tirarCpfDoFim(c[1] ?? ""));
  if (!/^[0-9A-Z]{8}$/.test(cnpjBasico) || !razaoSocial) return null;
  return {
    cnpjBasico,
    razaoSocial,
    naturezaJuridica: limpar(c[2]),
    porte: limpar(c[5]),
  };
}
