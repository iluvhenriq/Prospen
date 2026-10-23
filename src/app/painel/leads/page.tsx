import type { Metadata } from "next";
import { Suspense } from "react";
import {
  FiltrosLeads,
  ListaLeads,
  Paginacao,
} from "@/components/leads/lista-leads";
import { BotaoLink } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterListaDeLeads } from "@/modules/leads/consultas";
import { lerParametrosLista } from "@/modules/leads/parametros";
import { exigirContexto } from "@/modules/organizacoes/contexto";

export const metadata: Metadata = { title: ptBR.leads.titulo };

async function ConteudoLeads({
  searchParams,
}: {
  searchParams: PageProps<"/painel/leads">["searchParams"];
}) {
  const contexto = await exigirContexto();
  const parametros = lerParametrosLista(await searchParams);
  const lista = await obterListaDeLeads(contexto, parametros);
  const t = ptBR.leads;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-texto-suave" aria-live="polite">
        {t.total(lista.total)}
      </p>

      {/* Sem nenhum lead na empresa, a busca não faz sentido: vai direto ao estado vazio. */}
      {lista.total === 0 && !lista.temFiltro ? (
        <EstadoVazio
          titulo={t.vazioTitulo}
          descricao={t.vazioDescricao}
          acao={
            <div className="flex flex-wrap justify-center gap-3">
              <BotaoLink href="/painel/leads/novo">{t.novo}</BotaoLink>
              <BotaoLink href="/painel/leads/importar" variante="contorno">
                {t.importar}
              </BotaoLink>
            </div>
          }
        />
      ) : (
        <>
          <FiltrosLeads
            parametros={parametros}
            etiquetas={lista.etiquetas}
            temFiltro={lista.temFiltro}
          />
          {lista.total === 0 ? (
            <EstadoVazio
              titulo={t.vazioFiltroTitulo}
              descricao={t.vazioFiltroDescricao}
              acao={
                <BotaoLink href="/painel/leads" variante="contorno">
                  {t.busca.limpar}
                </BotaoLink>
              }
            />
          ) : (
            <>
              <ListaLeads leads={lista.leads} etiquetasPorLead={lista.etiquetasPorLead} />
              <Paginacao parametros={parametros} pagina={lista.pagina} paginas={lista.paginas} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function CarregandoLeads() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <Esqueleto className="h-5 w-24" />
      <Esqueleto className="h-24 w-full" />
      <Esqueleto className="h-64 w-full" />
    </div>
  );
}

export default function PaginaLeads(props: PageProps<"/painel/leads">) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-musgo-800">
          {ptBR.leads.titulo}
        </h1>
        <div className="flex flex-wrap gap-2">
          <BotaoLink href="/painel/leads/novo">{ptBR.leads.novo}</BotaoLink>
          <BotaoLink href="/painel/leads/importar" variante="contorno">
            {ptBR.leads.importar}
          </BotaoLink>
          <BotaoLink href="/painel/leads/etiquetas" variante="fantasma">
            {ptBR.leads.etiquetas}
          </BotaoLink>
        </div>
      </header>
      <Suspense fallback={<CarregandoLeads />}>
        <ConteudoLeads searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
