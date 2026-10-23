import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { lerEnv } from "@/lib/env";
import * as schema from "./schema";

type Banco = NodePgDatabase<typeof schema>;

// Uma única conexão por processo, reaproveitada entre recarregamentos
// do modo de desenvolvimento. É criada só no primeiro uso, então o build
// não exige o banco.
const global = globalThis as unknown as { __prospenBanco?: Banco };

export function getDb(): Banco {
  if (!global.__prospenBanco) {
    const pool = new Pool({ connectionString: lerEnv().DATABASE_URL, max: 10 });
    global.__prospenBanco = drizzle(pool, { schema });
  }
  return global.__prospenBanco;
}
