import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// Rotas de login do Better Auth (entrar, sair, sessão, organização).
// A instância é criada na primeira requisição, não no build.
const handlers = () => toNextJsHandler(getAuth());

export async function GET(request: Request) {
  return handlers().GET(request);
}

export async function POST(request: Request) {
  return handlers().POST(request);
}
