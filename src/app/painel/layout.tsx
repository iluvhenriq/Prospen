import Link from "next/link";
import { Suspense } from "react";
import { AreaUsuario } from "@/components/painel/area-usuario";
import { ICONES } from "@/components/painel/icones";
import { Navegacao } from "@/components/painel/navegacao";
import { SeletorTema } from "@/components/painel/seletor-tema";
import { Esqueleto } from "@/components/ui/carregando";
import { ptBR } from "@/lib/i18n/pt-BR";

const classeAcao =
  "flex items-center gap-3 rounded-controle px-3 py-2 text-sm font-medium text-musgo-200 transition-colors hover:bg-mesa-clara/60 hover:text-white";

// Moldura da área logada. No computador, coluna fixa à esquerda (verde-musgo)
// com o menu, as ações rápidas e, no pé, a empresa e o botão de sair. No
// celular, barra no topo com o menu em linha.
// Não lê a sessão aqui no topo: isso seguraria a página inteira. A leitura fica
// na área do usuário (dentro de <Suspense>) e em cada página, que também
// confere o acesso por conta própria, porque o layout não roda de novo a cada
// navegação.
export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#conteudo"
        className="sr-only rounded-controle bg-superficie px-3 py-2 text-sm font-medium text-texto focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30"
      >
        {ptBR.navegacao.irParaConteudo}
      </a>

      {/* Coluna da esquerda (computador). */}
      <aside className="mesa-lisa sticky top-0 hidden h-screen flex-col gap-6 overflow-y-auto px-3 pb-4 pt-5 md:flex">
        <Link href="/painel" className="px-3 text-lg font-extrabold tracking-[-0.04em] text-white">
          {ptBR.app.nome}
        </Link>
        {/* O menu lê o endereço atual; dentro de <Suspense> a página não espera por ele. */}
        <Suspense fallback={<div className="h-48" />}>
          <Navegacao forma="lateral" />
        </Suspense>
        <div className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-xs font-semibold text-musgo-300">{ptBR.menu.acoes}</p>
          <Link href="/painel/leads/novo" className={classeAcao}>
            {ICONES.novo}
            {ptBR.leads.novo}
          </Link>
          <Link href="/painel/leads/importar" className={classeAcao}>
            {ICONES.importar}
            {ptBR.leads.importar}
          </Link>
        </div>
        <div className="mt-auto flex flex-col gap-4">
          <SeletorTema forma="lateral" />
          <Suspense fallback={<Esqueleto className="h-24 w-full bg-mesa-clara" />}>
            <AreaUsuario forma="lateral" />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        {/* Barra do topo (celular). */}
        <header className="mesa-lisa md:hidden">
          <div className="flex h-14 items-center justify-between gap-4 px-4">
            <Link href="/painel" className="text-lg font-extrabold tracking-[-0.04em] text-white">
              {ptBR.app.nome}
            </Link>
            <div className="flex items-center gap-2">
              <SeletorTema forma="compacto" />
              <Suspense fallback={<Esqueleto className="h-8 w-32 bg-mesa-clara" />}>
                <AreaUsuario forma="topo" />
              </Suspense>
            </div>
          </div>
          <Suspense fallback={<div className="h-11" />}>
            <Navegacao forma="topo" />
          </Suspense>
        </header>

        <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-6xl gap-4 px-4 pb-6 text-xs text-texto-suave sm:px-6 lg:px-10">
          <Link href="/privacidade" className="underline hover:text-texto">
            {ptBR.privacidade.link}
          </Link>
          <Link href="/termos" className="underline hover:text-texto">
            {ptBR.termos.link}
          </Link>
        </footer>
      </div>
    </div>
  );
}
