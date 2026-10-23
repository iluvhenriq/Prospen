import "server-only";
import { getDb } from "@/db/client";
import { criarAuth, type Auth } from "./auth-config";
import { lerEnvLogin } from "./env";

// Uma única instância por processo, criada no primeiro uso (o build não
// exige o banco nem o segredo).
const global = globalThis as unknown as { __prospenAuth?: Auth };

export function getAuth(): Auth {
  if (!global.__prospenAuth) {
    const env = lerEnvLogin();
    global.__prospenAuth = criarAuth(getDb(), {
      secret: env.AUTH_SECRET,
      baseURL: env.APP_URL,
    });
  }
  return global.__prospenAuth;
}
