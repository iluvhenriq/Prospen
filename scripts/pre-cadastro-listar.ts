import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { lerEnv } from "../src/lib/env";
import { explicarErroBanco } from "../src/lib/erros-banco";
import { repositorioPreCadastros } from "../src/modules/pre-cadastro/repositorio";
import { carregarEnvLocal } from "./carregar-env";

// Lista os pré-cadastros da pré-venda em CSV (nome;email;empresa;segmento;interesses;data)
// e mostra na tela quantos marcaram cada resposta.
// Os dados são pessoais: não compartilhe o arquivo e apague cópias que não
// usar mais. Use só para avisar sobre a abertura e a pré-venda.
//   npm run pre-cadastro:listar > pre-cadastros.csv
function celula(valor: string | null): string {
  const texto = valor ?? "";
  // Neutraliza fórmulas do Excel (=, +, -, @) e escapa aspas.
  const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replaceAll('"', '""')}"`;
}

async function main(): Promise<void> {
  carregarEnvLocal();
  const pool = new Pool({ connectionString: lerEnv().DATABASE_URL });
  try {
    const linhas = await repositorioPreCadastros(drizzle(pool, { schema })).listar();
    console.log("nome;email;empresa;segmento;interesses;data");
    for (const linha of linhas) {
      console.log(
        [linha.nome, linha.email, linha.empresa, linha.segmento, linha.interesses.join(","), linha.criadoEm.toISOString()]
          .map(celula)
          .join(";"),
      );
    }
    console.error(`${linhas.length} pré-cadastro(s).`);

    // Resumo das respostas opcionais, para decidir o que construir (vai para a
    // tela, não para o arquivo: o CSV continua só com as linhas).
    const contar = (valores: (string | null)[]) => {
      const contagem = new Map<string, number>();
      for (const valor of valores) contagem.set(valor ?? "(sem resposta)", (contagem.get(valor ?? "(sem resposta)") ?? 0) + 1);
      return [...contagem].sort((a, b) => b[1] - a[1]).map(([valor, total]) => `  ${valor}: ${total}`);
    };
    console.error(["Segmentos:", ...contar(linhas.map((linha) => linha.segmento))].join("\n"));
    console.error(["Interesses (cada pessoa pode marcar vários):", ...contar(linhas.flatMap((linha) => linha.interesses))].join("\n"));
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error("Falha ao listar:", explicarErroBanco(erro));
  process.exit(1);
});
