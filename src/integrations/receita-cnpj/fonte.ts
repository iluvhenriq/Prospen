// Fonte oficial dos dados abertos do CNPJ: o repositório de arquivos da Receita
// Federal (SERPRO+), um compartilhamento público. O endereço antigo
// (arquivos.receitafederal.gov.br/dados/cnpj/...) responde "não encontrado"
// desde 2026. Conferido em 23/10/2026.
//
// O compartilhamento é lido pela interface de arquivos (WebDAV): o código do
// compartilhamento vai como usuário, com senha vazia. Não é segredo, é o mesmo
// link público divulgado pela Receita.

const ENDERECO = "https://arquivos.receitafederal.gov.br/public.php/webdav";
const CODIGO_DO_COMPARTILHAMENTO = "YggdBLfdninEJX9";
const AUTORIZACAO = `Basic ${Buffer.from(`${CODIGO_DO_COMPARTILHAMENTO}:`).toString("base64")}`;

export type ItemDaListagem = {
  nome: string;
  pasta: boolean;
  // Em bytes. Só para arquivos.
  tamanho: number | null;
};

// Lê a resposta da listagem (XML do WebDAV). Função pura, testada à parte.
export function lerListagem(xml: string): ItemDaListagem[] {
  const itens: ItemDaListagem[] = [];
  for (const bloco of xml.match(/<d:response>[\s\S]*?<\/d:response>/g) ?? []) {
    const endereco = /<d:href>([^<]+)<\/d:href>/.exec(bloco)?.[1];
    if (!endereco) continue;
    const pasta = /<d:collection\s*\/>/.test(bloco);
    const partes = decodeURIComponent(endereco).split("/").filter(Boolean);
    const nome = partes[partes.length - 1];
    // O primeiro item é a própria pasta listada.
    if (nome === "webdav" || endereco.endsWith("/webdav/")) continue;
    const tamanho = /<d:getcontentlength>(\d+)<\/d:getcontentlength>/.exec(bloco)?.[1];
    itens.push({ nome, pasta, tamanho: tamanho ? Number(tamanho) : null });
  }
  return itens;
}

async function listar(caminho: string): Promise<ItemDaListagem[]> {
  const resposta = await fetch(`${ENDERECO}/${caminho}`, {
    method: "PROPFIND",
    headers: { Authorization: AUTORIZACAO, Depth: "1" },
  });
  if (!resposta.ok) {
    throw new Error(`A Receita respondeu ${resposta.status} ao listar "${caminho || "/"}".`);
  }
  const itens = lerListagem(await resposta.text());
  // Tira a pasta listada, que aparece com o próprio nome.
  const atual = caminho.replace(/\/$/, "").split("/").pop();
  return itens.filter((item) => !(item.pasta && item.nome === atual));
}

// Meses publicados (pastas no formato AAAA-MM), do mais antigo para o mais novo.
export async function listarMeses(): Promise<string[]> {
  const itens = await listar("");
  return itens
    .filter((item) => item.pasta && /^\d{4}-\d{2}$/.test(item.nome))
    .map((item) => item.nome)
    .sort();
}

export async function listarArquivosDoMes(mes: string): Promise<ItemDaListagem[]> {
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error(`Mês inválido: "${mes}". Use AAAA-MM.`);
  const itens = await listar(`${mes}/`);
  return itens.filter((item) => !item.pasta);
}

// Abre o download de um arquivo. "inicio" permite continuar um download parado.
export async function abrirArquivo(mes: string, nome: string, inicio = 0): Promise<Response> {
  const headers: Record<string, string> = { Authorization: AUTORIZACAO };
  if (inicio > 0) headers.Range = `bytes=${inicio}-`;
  const resposta = await fetch(`${ENDERECO}/${mes}/${encodeURIComponent(nome)}`, { headers });
  if (!resposta.ok) {
    throw new Error(`A Receita respondeu ${resposta.status} ao baixar "${mes}/${nome}".`);
  }
  return resposta;
}
