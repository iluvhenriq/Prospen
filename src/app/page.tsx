import type { Metadata } from "next";
import Link from "next/link";
import { EmailDePrivacidade } from "@/components/legal/documento-legal";
import { FormularioPreCadastro } from "@/components/pre-venda/formulario-pre-cadastro";
import { BotaoLink } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";
import { emPreVenda } from "@/lib/pre-venda";
import { RESPONSAVEL } from "@/lib/responsavel";

export const metadata: Metadata = {
  title: { absolute: ptBR.preVenda.tituloDaAba },
  description: ptBR.preVenda.subtitulo,
};

const classeLinkRodape = "underline underline-offset-4 hover:text-texto";

// Página de apresentação com pré-cadastro (pré-venda, 24/10/2026). Estática:
// gerada no build. No modo pré-venda (src/lib/pre-venda.ts) o link "Entrar"
// some, porque o app fica fechado.
export default function PaginaInicial() {
  const t = ptBR.preVenda;
  const appAberto = !emPreVenda();
  const etapas = ptBR.funil.etapas;

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only rounded-md bg-superficie px-3 py-2 text-sm font-medium text-texto focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20"
      >
        {ptBR.navegacao.irParaConteudo}
      </a>

      <header className="sticky top-0 z-10 border-b border-borda bg-fundo/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-musgo-800">
            {ptBR.app.nome}
          </Link>
          <nav aria-label={ptBR.menu.principal} className="flex items-center gap-1 text-sm">
            <a href="#como-funciona" className="hidden rounded-md px-3 py-2 text-texto-suave hover:text-texto md:inline">
              {t.menu.comoFunciona}
            </a>
            <a href="#recursos" className="hidden rounded-md px-3 py-2 text-texto-suave hover:text-texto md:inline">
              {t.menu.recursos}
            </a>
            <a href="#perguntas" className="hidden rounded-md px-3 py-2 text-texto-suave hover:text-texto md:inline">
              {t.menu.perguntas}
            </a>
            {appAberto ? (
              <Link href="/entrar" className="rounded-md px-3 py-2 font-medium text-texto hover:text-roxo-700">
                {t.menu.entrar}
              </Link>
            ) : null}
            <BotaoLink href="#pre-cadastro" tamanho="pequeno" className="ml-1">
              {t.chamada}
            </BotaoLink>
          </nav>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {/* Abertura */}
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:items-center md:pt-20">
          <div className="flex flex-col gap-5">
            <span className="w-fit rounded-full bg-roxo-100 px-3 py-1 text-xs font-semibold text-roxo-800">{t.selo}</span>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-musgo-900 sm:text-5xl">
              {t.titulo}
            </h1>
            <p className="max-w-xl text-pretty text-lg text-texto-suave">{t.subtitulo}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <BotaoLink href="#pre-cadastro" tamanho="grande">
                {t.chamada}
              </BotaoLink>
              <p className="text-sm text-texto-suave">{t.chamadaApoio}</p>
            </div>
          </div>

          {/* Destaque visual: as etapas reais do funil, sem números inventados. */}
          <div aria-hidden="true" className="rounded-2xl border border-borda bg-superficie p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-musgo-300" />
              <span className="size-2.5 rounded-full bg-musgo-200" />
              <span className="size-2.5 rounded-full bg-musgo-100" />
              <span className="ml-2 text-xs font-medium text-texto-suave">{ptBR.funil.titulo}</span>
            </div>
            <ol className="flex flex-col gap-2">
              {(["novo", "contatado", "em_conversa", "proposta"] as const).map((etapa, indice) => (
                <li
                  key={etapa}
                  className="flex items-center justify-between rounded-lg border border-borda bg-fundo px-4 py-3"
                  style={{ marginRight: `${indice * 7}%` }}
                >
                  <span className="text-sm font-medium text-texto">{etapas[etapa]}</span>
                  <span className="h-2 w-16 rounded-full bg-roxo-200" />
                </li>
              ))}
              <li className="grid grid-cols-2 gap-2" style={{ marginRight: "28%" }}>
                <span className="rounded-lg border border-musgo-200 bg-musgo-50 px-4 py-3 text-sm font-semibold text-musgo-800">
                  {etapas.ganho}
                </span>
                <span className="rounded-lg border border-borda bg-fundo px-4 py-3 text-sm font-medium text-texto-suave">
                  {etapas.perdido}
                </span>
              </li>
            </ol>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-20 border-y border-borda bg-superficie">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight text-musgo-900 sm:text-3xl">{t.comoFunciona.titulo}</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {t.comoFunciona.passos.map((passo, indice) => (
                <li key={passo.titulo} className="flex flex-col gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-musgo-800 text-sm font-semibold text-white">
                    {indice + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-texto">{passo.titulo}</h3>
                  <p className="text-texto-suave">{passo.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Recursos */}
        <section id="recursos" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-musgo-900 sm:text-3xl">{t.recursos.titulo}</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.recursos.itens.map((item) => (
              <li key={item.titulo} className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-5">
                <h3 className="font-semibold text-texto">{item.titulo}</h3>
                <p className="text-sm text-texto-suave">{item.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Para quem é + dados responsáveis */}
        <section className="bg-musgo-900 text-musgo-50">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-white">{t.paraQuem.titulo}</h2>
              <p className="text-musgo-100">{t.paraQuem.texto}</p>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-white">{t.responsavel.titulo}</h2>
              <ul className="flex flex-col gap-2">
                {t.responsavel.itens.map((item) => (
                  <li key={item} className="flex gap-3 text-musgo-100">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-roxo-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Perguntas + pré-cadastro */}
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
          <div id="perguntas" className="scroll-mt-20">
            <h2 className="text-2xl font-semibold tracking-tight text-musgo-900 sm:text-3xl">{t.perguntas.titulo}</h2>
            <div className="mt-6 flex flex-col divide-y divide-borda border-y border-borda">
              {t.perguntas.itens.map((item) => (
                <details key={item.pergunta} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-texto">
                    {item.pergunta}
                    <span aria-hidden="true" className="text-xl leading-none text-roxo-700 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-texto-suave">{item.resposta}</p>
                </details>
              ))}
            </div>
          </div>

          <div id="pre-cadastro" className="scroll-mt-20">
            <div className="rounded-2xl border border-borda bg-superficie p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight text-musgo-900">{t.formulario.titulo}</h2>
              <p className="mb-6 mt-2 text-texto-suave">{t.formulario.texto}</p>
              <FormularioPreCadastro emailContato={RESPONSAVEL.emailPrivacidade} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-borda">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-texto-suave sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t.rodape.direitos}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacidade" className={classeLinkRodape}>
              {ptBR.privacidade.link}
            </Link>
            <Link href="/termos" className={classeLinkRodape}>
              {ptBR.termos.link}
            </Link>
            <Link href="/remover-meus-dados" className={classeLinkRodape}>
              {ptBR.remocao.link}
            </Link>
            <span>
              {t.rodape.contato} <EmailDePrivacidade />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
