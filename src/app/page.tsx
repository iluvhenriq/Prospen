import type { Metadata } from "next";
import Link from "next/link";
import { EmailDePrivacidade } from "@/components/legal/documento-legal";
import { DemonstracaoBusca } from "@/components/pre-venda/demonstracao-busca";
import { FormularioPreCadastro } from "@/components/pre-venda/formulario-pre-cadastro";
import { BotaoLink } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";
import { emPreVenda } from "@/lib/pre-venda";
import { PLANOS, REGRAS, RECURSOS, VAGAS_DE_FUNDADOR } from "@/modules/planos/planos";
import { RESPONSAVEL } from "@/lib/responsavel";

export const metadata: Metadata = {
  title: { absolute: ptBR.preVenda.tituloDaAba },
  description: ptBR.preVenda.subtitulo,
};

const classeLinkMesa = "underline decoration-musgo-400 hover:text-white hover:decoration-white";
const classeTituloMesa = "text-balance text-[2.1rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl";

function IconeCerto({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={className}>
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Preço sem centavos quando é redondo: "R$ 97".
function formatarPreco(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(centavos / 100);
}

// Página de apresentação com pré-cadastro. Direção "a mesa do vendedor"
// (27/10/2026): tudo sobre o forro verde-musgo, com papéis por cima (a lista
// impressa, a fita da calculadora, a ficha do pré-cadastro). Estática: gerada
// no build. No modo pré-venda (src/lib/pre-venda.ts) o link "Entrar" some.
export default function PaginaInicial() {
  const t = ptBR.preVenda;
  const appAberto = !emPreVenda();
  const etapas = ptBR.funil.etapas;
  const tp = ptBR.planos.pagina;

  return (
    <div className="mesa flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only rounded-controle bg-papel px-3 py-2 text-sm font-medium text-texto focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30"
      >
        {ptBR.navegacao.irParaConteudo}
      </a>

      <header className="relative z-20">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="text-xl font-extrabold tracking-[-0.04em] text-white">
            {ptBR.app.nome}
          </Link>
          <nav aria-label={ptBR.menu.principal} className="flex items-center gap-1 text-sm">
            <a href="#como-funciona" className="hidden rounded-controle px-3 py-2 text-musgo-200 hover:text-white md:inline">
              {t.menu.comoFunciona}
            </a>
            <a href="#planos" className="hidden rounded-controle px-3 py-2 text-musgo-200 hover:text-white md:inline">
              {ptBR.planos.pagina.titulo}
            </a>
            <a href="#perguntas" className="hidden rounded-controle px-3 py-2 text-musgo-200 hover:text-white md:inline">
              {t.menu.perguntas}
            </a>
            {appAberto ? (
              <Link href="/entrar" className="rounded-controle px-3 py-2 font-semibold text-white hover:text-marca-texto">
                {t.menu.entrar}
              </Link>
            ) : null}
            <BotaoLink href="#pre-cadastro" variante="papel" tamanho="pequeno" className="ml-1">
              {t.chamada}
            </BotaoLink>
          </nav>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {/* Abertura: a promessa e os papéis do vendedor. */}
        <section className="mx-auto grid w-full max-w-6xl gap-14 px-4 pb-28 pt-10 sm:px-6 md:grid-cols-[1fr_1.15fr] md:items-center md:gap-12 md:pb-28 md:pt-16">
          <div className="flex flex-col gap-7">
            <h1 className="text-balance text-[3.2rem] font-extrabold leading-[0.95] tracking-[-0.05em] text-white sm:text-7xl md:text-6xl lg:text-[4.9rem]">
              {t.titulo}
            </h1>
            <p className="max-w-[32rem] text-pretty text-lg leading-relaxed text-musgo-100">{t.subtitulo}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <BotaoLink href="#pre-cadastro" variante="papel" tamanho="grande">
                {t.chamada}
              </BotaoLink>
              <p className="max-w-56 text-sm text-musgo-200">{t.chamadaApoio}</p>
            </div>
          </div>

          <DemonstracaoBusca />
        </section>

        {/* O tamanho real da base: o problema que a nota resolve. */}
        <section className="border-y border-mesa-linha">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <h2 className="flex flex-col gap-2">
              <span className="text-[4.6rem] font-extrabold leading-[0.85] tracking-[-0.06em] text-marca-texto sm:text-[8rem] lg:text-[10rem]">
                {t.tamanhoDaBase.numero}
              </span>
              <span className="text-balance text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">{t.tamanhoDaBase.titulo}</span>
            </h2>
            <div className="mt-8 flex flex-col gap-3 md:ml-auto md:max-w-[30rem]">
              <p className="text-lg leading-relaxed text-musgo-100">{t.tamanhoDaBase.texto}</p>
              <p className="text-xs text-musgo-300">{t.tamanhoDaBase.fonte}</p>
            </div>
          </div>
        </section>

        {/* Como funciona: uma folha de instruções sobre a mesa. */}
        <section id="como-funciona" className="mx-auto w-full max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6 md:py-24">
          <h2 className={`${classeTituloMesa} max-w-[20ch]`}>{t.comoFunciona.titulo}</h2>
          <div className="papel mt-10 rounded-[3px] px-5 py-8 sm:px-10 sm:py-12">
            <ol className="grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-borda">
              {t.comoFunciona.passos.map((passo, indice) => (
                <li key={passo.titulo} className="flex flex-col gap-3 md:px-8 md:first:pl-0 md:last:pr-0">
                  <h3 className="flex items-baseline gap-3 text-xl font-extrabold tracking-[-0.01em] text-texto">
                    <span className="numeros text-musgo-500">{indice + 1}</span>
                    {passo.titulo}
                  </h3>
                  <p className="text-texto-suave">{passo.texto}</p>
                  <ul className="mt-2 flex flex-col gap-2.5 text-sm text-texto">
                    {passo.itens.map((item) => (
                      <li key={item} className="flex gap-3">
                        <IconeCerto className="mt-0.5 size-4 shrink-0 text-musgo-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>

            {/* As etapas do funil, com os nomes que o produto usa. */}
            <div className="mt-12 border-t-2 border-texto pt-6">
              <p className="text-sm font-extrabold text-texto">{ptBR.funil.titulo}</p>
              <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3 text-sm font-semibold">
                {(["novo", "contatado", "em_conversa", "proposta"] as const).map((etapa) => (
                  <li key={etapa} className="flex items-center gap-2">
                    <span className="rounded-controle border border-borda-campo/60 px-3 py-1.5 text-texto">{etapas[etapa]}</span>
                    <span aria-hidden="true" className="h-px w-4 bg-borda-campo sm:w-6" />
                  </li>
                ))}
                <li className="flex flex-wrap items-center gap-2">
                  <span className="rounded-controle bg-musgo-800 px-3 py-1.5 text-white">{etapas.ganho}</span>
                  <span className="rounded-controle border border-borda-campo/60 px-3 py-1.5 text-texto-suave">{etapas.perdido}</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Comparação: duas folhas lado a lado. */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-28">
          <h2 className={`${classeTituloMesa} max-w-[22ch]`}>{t.comparacao.titulo}</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-10">
            <div className="rotate-[-1deg] rounded-[3px] bg-papel-velho px-6 py-7 text-texto-suave shadow-[0_1px_1px_rgb(0_0_0/0.25),0_14px_28px_-12px_rgb(0_0_0/0.5)] sm:px-8">
              <h3 className="border-b-2 border-texto-suave/50 pb-3 text-lg font-extrabold text-texto-suave">{t.comparacao.colunas.planilha}</h3>
              <ul className="mt-2 flex flex-col">
                {t.comparacao.linhas.map((linha) => (
                  <li key={linha.tema} className="flex flex-col gap-0.5 border-b border-dashed border-borda-campo/50 py-3.5 last:border-b-0">
                    <span className="text-xs font-semibold">{linha.tema}</span>
                    <span className="line-through decoration-texto-suave/70 decoration-[1.5px]">{linha.planilha}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="papel rotate-[0.8deg] rounded-[3px] px-6 py-7 sm:px-8">
              <h3 className="border-b-2 border-texto pb-3 text-lg font-extrabold text-musgo-900">{t.comparacao.colunas.prospen}</h3>
              <ul className="mt-2 flex flex-col">
                {t.comparacao.linhas.map((linha) => (
                  <li key={linha.tema} className="flex flex-col gap-0.5 border-b border-dashed border-borda-campo/50 py-3.5 last:border-b-0">
                    <span className="text-xs font-semibold text-texto-suave">{linha.tema}</span>
                    <span className="flex gap-2.5 font-semibold text-texto">
                      <IconeCerto className="mt-1 size-4 shrink-0 text-musgo-700" />
                      {linha.prospen}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Para quem é + dados responsáveis */}
        <section className="border-y border-mesa-linha bg-mesa-clara/40">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-white">{t.paraQuem.titulo}</h2>
              <p className="max-w-[32rem] text-lg leading-relaxed text-musgo-100">{t.paraQuem.texto}</p>
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-white">{t.responsavel.titulo}</h2>
              <ul className="flex flex-col gap-3">
                {t.responsavel.itens.map((item) => (
                  <li key={item} className="flex gap-3 text-musgo-100">
                    <span aria-hidden="true" className="mt-[0.55em] h-1.5 w-3 shrink-0 rounded-[1px] bg-marca-texto" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Planos: três folhas; a do Grande, marcada (decisão de 28/10/2026). */}
        <section id="planos" className="mx-auto w-full max-w-6xl scroll-mt-6 px-4 pt-16 sm:px-6 md:pt-24">
          <h2 className={classeTituloMesa}>{tp.titulo}</h2>
          <p className="mt-4 max-w-[36rem] text-lg leading-relaxed text-musgo-100">{tp.subtitulo}</p>
          <ul className="mt-10 grid gap-6 md:grid-cols-3 md:items-stretch">
            {PLANOS.map((plano) => {
              const regras = REGRAS[plano];
              const destaque = plano === "grande";
              return (
                <li
                  key={plano}
                  className={`papel flex flex-col gap-5 rounded-[3px] px-6 py-7 ${destaque ? "ring-4 ring-marca-texto md:-translate-y-2" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-texto pb-3">
                    <h3 className="text-xl font-extrabold text-musgo-900">{ptBR.planos.nomes[plano]}</h3>
                    {destaque ? (
                      <span className="rounded-[3px] bg-marca-texto px-2 py-0.5 text-xs font-bold text-tinta">{tp.melhorCustoBeneficio}</span>
                    ) : null}
                  </div>
                  <p className="flex items-baseline gap-1 text-texto">
                    <span className="numeros text-4xl font-extrabold tracking-[-0.03em]">
                      {formatarPreco(regras.precoCentavos)}
                    </span>
                    <span className="text-sm text-texto-suave">{tp.porMes}</span>
                  </p>
                  <ul className="flex flex-col gap-2.5 text-sm text-texto">
                    <li className="flex gap-3">
                      <IconeCerto className="mt-0.5 size-4 shrink-0 text-musgo-600" />
                      {tp.usuarios(regras.usuarios)}
                    </li>
                    <li className="flex gap-3">
                      <IconeCerto className="mt-0.5 size-4 shrink-0 text-musgo-600" />
                      {tp.empresasPorMes(regras.empresasPorMes)}
                    </li>
                    <li className="flex gap-3">
                      <IconeCerto className="mt-0.5 size-4 shrink-0 text-musgo-600" />
                      {tp.todos}
                    </li>
                    {RECURSOS.map((recurso) =>
                      regras.recursos.includes(recurso) ? (
                        <li key={recurso} className="flex gap-3 font-semibold">
                          <IconeCerto className="mt-0.5 size-4 shrink-0 text-musgo-600" />
                          {ptBR.planos.recursos[recurso]}
                        </li>
                      ) : (
                        <li key={recurso} className="flex gap-3 text-texto-suave line-through decoration-texto-suave/60">
                          <span aria-hidden="true" className="size-4 shrink-0" />
                          {ptBR.planos.recursos[recurso]}
                          <span className="sr-only"> {tp.naoIncluso}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </li>
              );
            })}
          </ul>
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="max-w-[40rem] text-musgo-100">
              <span className="rounded-[3px] bg-marca-texto px-1 font-semibold text-tinta">{tp.fundadores(VAGAS_DE_FUNDADOR)}</span>
            </p>
            <BotaoLink href="#pre-cadastro" variante="papel" tamanho="grande">
              {tp.chamada}
            </BotaoLink>
          </div>
          <p className="mt-4 text-xs text-musgo-300">{tp.limiteDiario}</p>
        </section>

        {/* Perguntas + a ficha do pré-cadastro */}
        <section className="mx-auto grid w-full max-w-6xl gap-14 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div id="perguntas" className="scroll-mt-6">
            <h2 className={classeTituloMesa}>{t.perguntas.titulo}</h2>
            <div className="mt-8 flex flex-col divide-y divide-mesa-linha border-y border-mesa-linha">
              {t.perguntas.itens.map((item) => (
                <details key={item.pergunta} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white hover:text-marca-texto">
                    {item.pergunta}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="size-4 shrink-0 text-marca-texto transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                    >
                      <path d="M8 2.5v11M2.5 8h11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </summary>
                  <p className="mt-2 max-w-[60ch] text-musgo-100">{item.resposta}</p>
                </details>
              ))}
            </div>
          </div>

          <div id="pre-cadastro" className="scroll-mt-6">
            <div className="papel rotate-[0.6deg] rounded-[3px] p-6 sm:p-9 lg:sticky lg:top-8">
              <h2 className="border-b-2 border-texto pb-3 text-2xl font-extrabold tracking-[-0.02em] text-musgo-900">{t.formulario.titulo}</h2>
              <p className="mb-6 mt-3 text-texto-suave">{t.formulario.texto}</p>
              <FormularioPreCadastro emailContato={RESPONSAVEL.emailPrivacidade} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-mesa-linha">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-musgo-200 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t.rodape.direitos}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacidade" className={classeLinkMesa}>
              {ptBR.privacidade.link}
            </Link>
            <Link href="/termos" className={classeLinkMesa}>
              {ptBR.termos.link}
            </Link>
            <Link href="/remover-meus-dados" className={classeLinkMesa}>
              {ptBR.remocao.link}
            </Link>
            <span>
              {t.rodape.contato} <EmailDePrivacidade className={`font-medium text-white ${classeLinkMesa}`} />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
