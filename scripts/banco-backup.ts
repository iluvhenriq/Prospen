import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { lerEnv } from "../src/lib/env";
import { carregarEnvLocal } from "./carregar-env";

// Cópia de segurança do banco (contas, empresas, leads, planos), na pasta
// backups/ (fora do Git). A base pública de CNPJ fica de fora dos dados: são
// gigabytes e voltam com `npm run cnpj:importar`. Rode antes de colocar o app
// no ar e, com clientes, todo dia. Guarde uma cópia fora deste computador.
//   npm run banco:backup
// Para voltar: pg_restore --clean --dbname <DATABASE_URL> backups/<arquivo>.dump
const PG_DUMP_PADRAO = "C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe";

carregarEnvLocal();
const { DATABASE_URL } = lerEnv();
const pgDump = existsSync(PG_DUMP_PADRAO) ? PG_DUMP_PADRAO : "pg_dump";

mkdirSync("backups", { recursive: true });
const agora = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
const arquivo = join("backups", `prospen-${agora}.dump`);

try {
  execFileSync(
    pgDump,
    ["--format=custom", "--exclude-table-data=base_cnpj_*", `--file=${arquivo}`, `--dbname=${DATABASE_URL}`],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
} catch {
  // A mensagem do pg_dump já saiu acima; a URL (com a senha) nunca é repetida aqui.
  console.error("Falha no backup. Confira se o PostgreSQL está ligado.");
  process.exit(1);
}
console.log(`Backup salvo em ${arquivo} (${(statSync(arquivo).size / 1024 / 1024).toFixed(1)} MB).`);
