import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Verificação rápida e apenas otimista: sem cookie de login, nem renderiza
// a página privada, manda direto para a entrada.
//
// Isto NÃO é a segurança de verdade. A checagem real (sessão válida, empresa
// e papel) acontece no servidor, em src/modules/organizacoes/contexto.ts,
// e vale para toda tela e ação. Um cookie falso passa por aqui e é barrado lá.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*", "/criar-organizacao"],
};
