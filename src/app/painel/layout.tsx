import Link from "next/link";
import { Suspense } from "react";
import { AreaUsuario } from "@/components/painel/area-usuario";
import { Navegacao } from "@/components/painel/navegacao";
import { Esqueleto } from "@/components/ui/carregando";
import { ptBR } from "@/lib/i18n/pt-BR";

// Moldura da área logada. Não lê a sessão aqui no topo: isso seguraria a
// página inteira. A leitura fica na área do usuário (dentro de <Suspense>) e
// em cada página, que também confere o acesso por conta própria, porque o
// layout não roda de novo a cada navegação.
export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only rounded-md bg-superficie px-3 py-2 text-sm font-medium text-texto focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10"
      >
        {ptBR.navegacao.irParaConteudo}
      </a>
      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/painel"
            className="text-lg font-semibold tracking-tight text-musgo-800"
          >
            {ptBR.app.nome}
          </Link>
          <Suspense fallback={<Esqueleto className="h-8 w-40" />}>
            <AreaUsuario />
          </Suspense>
        </div>
      </header>
      {/* O menu lê o endereço atual; dentro de <Suspense> a página não espera por ele. */}
      <Suspense fallback={<div className="h-11 border-b border-borda bg-superficie" />}>
        <Navegacao />
      </Suspense>
      <main
        id="conteudo"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6"
      >
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-6xl gap-4 px-4 pb-6 text-xs text-texto-suave sm:px-6">
        <Link href="/privacidade" className="underline underline-offset-4 hover:text-texto">
          {ptBR.privacidade.link}
        </Link>
        <Link href="/termos" className="underline underline-offset-4 hover:text-texto">
          {ptBR.termos.link}
        </Link>
      </footer>
    </div>
  );
}
