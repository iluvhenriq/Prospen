import type { Metadata } from "next";
import { Suspense } from "react";
import { QuadroFunil } from "@/components/funil/quadro-funil";
import { BotaoLink } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterQuadroDoFunil } from "@/modules/leads/consultas";
import { exigirContexto } from "@/modules/organizacoes/contexto";

export const metadata: Metadata = { title: ptBR.funil.titulo };

async function ConteudoFunil() {
  const contexto = await exigirContexto();
  const quadro = await obterQuadroDoFunil(contexto);
  const t = ptBR.funil;

  if (quadro.total === 0) {
    return (
      <EstadoVazio
        titulo={t.vazioTitulo}
        descricao={t.vazioDescricao}
        acao={
          <div className="flex flex-wrap justify-center gap-3">
            <BotaoLink href="/painel/busca">{ptBR.busca.titulo}</BotaoLink>
            <BotaoLink href="/painel/leads/novo" variante="contorno">
              {ptBR.leads.novo}
            </BotaoLink>
            <BotaoLink href="/painel/leads/importar" variante="contorno">
              {ptBR.leads.importar}
            </BotaoLink>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-texto-suave" aria-live="polite">
        {t.total(quadro.total)}
      </p>
      <QuadroFunil colunas={quadro.colunas} fusoHorario={quadro.fusoHorario} />
    </div>
  );
}

function CarregandoFunil() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Esqueleto className="h-5 w-32" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, indice) => (
          <Esqueleto key={indice} className="h-80 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function PaginaFunil() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-texto">
          {ptBR.funil.titulo}
        </h1>
        <p className="max-w-2xl text-sm text-texto-suave">{ptBR.funil.descricao}</p>
      </header>
      <Suspense fallback={<CarregandoFunil />}>
        <ConteudoFunil />
      </Suspense>
    </div>
  );
}
