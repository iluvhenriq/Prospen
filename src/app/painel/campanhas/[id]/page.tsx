import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdicionarPorFiltro } from "@/components/campanhas/adicionar-por-filtro";
import { FormularioCampanha } from "@/components/campanhas/formulario-campanha";
import { NumerosDaCampanha } from "@/components/campanhas/numeros-campanha";
import { SeloEtapa } from "@/components/funil/selo-etapa";
import { SeloPontuacao } from "@/components/pontuacao/selo-pontuacao";
import { Botao } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import { Cartao, CartaoCabecalho, CartaoConteudo, CartaoDescricao, CartaoTitulo } from "@/components/ui/cartao";
import { Etiqueta } from "@/components/ui/etiqueta";
import { formatarDataIso } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import {
  atualizarCampanha,
  excluirCampanha,
  mudarSituacaoCampanha,
  removerLeadDaCampanha,
} from "@/modules/campanhas/acoes";
import { obterCampanha } from "@/modules/campanhas/consultas";
import { MAXIMO_POR_ADICAO } from "@/modules/campanhas/repositorio";
import { exigirContexto } from "@/modules/organizacoes/contexto";
import { papelPode } from "@/modules/organizacoes/membros";
import { pontuar } from "@/modules/pontuacao/regras";

export const metadata: Metadata = { title: ptBR.campanhas.titulo };

async function ConteudoDaCampanha({ params }: { params: PageProps<"/painel/campanhas/[id]">["params"] }) {
  const { id } = await params;
  const contexto = await exigirContexto();
  const detalhe = await obterCampanha(contexto, id);
  // Identificador inválido, apagada ou de outra empresa: a resposta é a mesma.
  if (!detalhe) notFound();
  const { campanha, leads, moeda } = detalhe;
  const t = ptBR.campanhas;
  const ativa = campanha.situacao === "ativa";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/painel/campanhas" className="text-sm font-medium text-roxo-700 underline-offset-4 hover:underline">
          {t.voltar}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-musgo-800">{campanha.nome}</h1>
            <p className="text-sm text-texto-suave">
              {t.periodo(formatarDataIso(campanha.inicio), formatarDataIso(campanha.fim))}
            </p>
            {campanha.objetivo ? <p className="mt-1 max-w-2xl text-sm text-texto">{campanha.objetivo}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta variante={ativa ? "musgo" : "neutra"}>{t.situacoes[campanha.situacao]}</Etiqueta>
            <form action={mudarSituacaoCampanha}>
              <input type="hidden" name="id" value={campanha.id} />
              <input type="hidden" name="situacao" value={ativa ? "encerrada" : "ativa"} />
              <Botao type="submit" variante="contorno" tamanho="pequeno">
                {ativa ? t.encerrar : t.reabrir}
              </Botao>
            </form>
          </div>
        </div>
      </header>

      <Cartao>
        <CartaoConteudo>
          <NumerosDaCampanha
            numeros={campanha}
            custoCentavos={campanha.custoCentavos}
            moedaCusto={campanha.moedaCusto}
            moeda={moeda}
          />
        </CartaoConteudo>
      </Cartao>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>{t.leadsTitulo}</CartaoTitulo>
            {leads.length >= 200 ? <CartaoDescricao>{t.leadsLimite(leads.length)}</CartaoDescricao> : null}
          </CartaoCabecalho>
          <CartaoConteudo>
            {leads.length === 0 ? (
              <p className="text-sm text-texto-suave">{t.leadsVazio}</p>
            ) : (
              <ul className="divide-y divide-borda">
                {leads.map((lead) => (
                  <li key={lead.id} className="flex flex-wrap items-center gap-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/painel/leads/${lead.id}`}
                        className="block truncate text-sm font-medium text-texto underline-offset-4 hover:text-roxo-700 hover:underline"
                      >
                        {lead.nome}
                      </Link>
                      {lead.empresa ? <p className="truncate text-xs text-texto-suave">{lead.empresa}</p> : null}
                    </div>
                    <SeloPontuacao {...pontuar(lead)} />
                    <SeloEtapa etapa={lead.etapa} />
                    <form action={removerLeadDaCampanha}>
                      <input type="hidden" name="campanhaId" value={campanha.id} />
                      <input type="hidden" name="leadId" value={lead.id} />
                      <Botao type="submit" variante="fantasma" tamanho="pequeno" aria-label={t.remover(lead.nome)}>
                        {t.removerCurto}
                      </Botao>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CartaoConteudo>
        </Cartao>

        <div className="flex flex-col gap-6">
          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>{t.adicionarTitulo}</CartaoTitulo>
              <CartaoDescricao>{t.adicionarDescricao(MAXIMO_POR_ADICAO)}</CartaoDescricao>
            </CartaoCabecalho>
            <CartaoConteudo>
              <AdicionarPorFiltro campanhaId={campanha.id} etiquetas={detalhe.etiquetas} />
            </CartaoConteudo>
          </Cartao>

          {/* <details> funciona sem JavaScript e não ocupa espaço enquanto fechado. */}
          <details className="rounded-xl border border-borda bg-superficie p-4">
            <summary className="cursor-pointer text-sm font-medium text-texto">{t.editar}</summary>
            <div className="mt-4">
              <FormularioCampanha
                acao={atualizarCampanha}
                campanha={campanha}
                moeda={campanha.moedaCusto ?? moeda}
                rotuloBotao={t.salvar}
              />
            </div>
          </details>

          {papelPode(contexto.papel, "excluirCampanha") ? (
            <details className="rounded-xl border border-erro-borda bg-erro-fundo p-4">
              <summary className="cursor-pointer text-sm font-medium text-erro">{t.excluirTitulo}</summary>
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-sm text-erro">{t.excluirAviso}</p>
                <form action={excluirCampanha}>
                  <input type="hidden" name="id" value={campanha.id} />
                  <Botao type="submit" variante="perigo" tamanho="pequeno">
                    {t.excluirBotao}
                  </Botao>
                </form>
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PaginaDaCampanha(props: PageProps<"/painel/campanhas/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6" aria-busy="true">
          <Esqueleto className="h-16 w-72" />
          <Esqueleto className="h-32 w-full" />
          <Esqueleto className="h-64 w-full" />
        </div>
      }
    >
      <ConteudoDaCampanha params={props.params} />
    </Suspense>
  );
}
