import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { emPreVenda, fechadoNaPreVenda } from "@/lib/pre-venda";

// Duas checagens rápidas, antes de qualquer página:
//
// 1. Modo pré-venda (MODO_PRE_VENDA=1): o app fica fechado e tudo dele manda
//    para a página de apresentação (src/lib/pre-venda.ts).
//
// 2. Sem cookie de login, nem renderiza a página privada: manda para a
//    entrada. Isto é só otimista, NÃO é a segurança de verdade. A checagem
//    real (sessão válida, empresa e papel) acontece no servidor, em
//    src/modules/organizacoes/contexto.ts, e vale para toda tela e ação. Um
//    cookie falso passa por aqui e é barrado lá.
export function proxy(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  if (emPreVenda() && fechadoNaPreVenda(caminho)) {
    if (caminho.startsWith("/api/")) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(new URL("/", request.url));
  }
  const privado = caminho.startsWith("/painel") || caminho === "/criar-organizacao";
  if (privado && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*", "/criar-organizacao", "/cadastrar", "/entrar", "/convite/:path*", "/confirmar-email", "/esqueci-senha", "/nova-senha", "/api/auth/:path*"],
};
