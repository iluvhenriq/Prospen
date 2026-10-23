import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

// Qualquer banco PostgreSQL do Drizzle com o nosso esquema: o de verdade
// (node-postgres) e o de teste em memória (PGlite). Assim o mesmo código
// de acesso a dados roda nos dois.
export type Banco = PgDatabase<PgQueryResultHKT, typeof schema>;
