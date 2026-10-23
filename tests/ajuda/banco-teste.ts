import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { criarAuth } from "@/lib/auth-config";

// Banco PostgreSQL em memória, com as migrações reais aplicadas, mais um
// login ligado a ele. Cada arquivo de teste cria o seu e o descarta no fim.
export async function criarAmbienteDeTeste() {
  const pg = new PGlite({ extensions: { pg_trgm, unaccent } });
  const db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: "./src/db/migrations" });

  const auth = criarAuth(db, {
    secret: "segredo-so-para-testes-com-mais-de-32-caracteres",
    baseURL: "http://localhost:3000",
    cookiesDoNext: false,
  });

  return { pg, db, auth, encerrar: () => pg.close() };
}

export type AmbienteDeTeste = Awaited<ReturnType<typeof criarAmbienteDeTeste>>;

// Transforma os cookies que o login devolveu em um cabeçalho de requisição,
// como o navegador faria na chamada seguinte.
export function cabecalhoDeCookies(resposta: Headers): Headers {
  const cookie = resposta
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

export type PessoaDeTeste = {
  id: string;
  email: string;
  cabecalhos: Headers;
};

// Cadastra uma pessoa e devolve o necessário para agir em nome dela.
export async function cadastrarPessoa(
  ambiente: AmbienteDeTeste,
  nome: string,
  email: string,
  senha = "senha-de-teste-123",
): Promise<PessoaDeTeste> {
  const { headers, response } = await ambiente.auth.api.signUpEmail({
    body: { name: nome, email, password: senha },
    returnHeaders: true,
  });
  return {
    id: response.user.id,
    email,
    cabecalhos: cabecalhoDeCookies(headers),
  };
}

// Cria a empresa da pessoa, como a tela de criação faz.
export async function criarEmpresa(
  ambiente: AmbienteDeTeste,
  pessoa: PessoaDeTeste,
  nome: string,
  slug: string,
): Promise<string> {
  const organizacao = await ambiente.auth.api.createOrganization({
    body: { name: nome, slug },
    headers: pessoa.cabecalhos,
  });
  if (!organizacao) throw new Error("Empresa não foi criada.");
  return organizacao.id;
}
