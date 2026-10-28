import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { caminhoHttpLiberado } from "@/lib/auth-config";

// Rotas HTTP do login (Better Auth). Só respondem os caminhos liberados em
// CAMINHOS_HTTP_LIBERADOS (src/lib/auth-config.ts); o resto é 404. As telas
// não usam esta rota: chamam o login pelas ações do servidor.
// A instância é criada na primeira requisição, não no build.
const handlers = () => toNextJsHandler(getAuth());

function fechado(request: Request): Response | null {
  return caminhoHttpLiberado(new URL(request.url).pathname) ? null : new Response(null, { status: 404 });
}

export async function GET(request: Request) {
  return fechado(request) ?? handlers().GET(request);
}

export async function POST(request: Request) {
  return fechado(request) ?? handlers().POST(request);
}
