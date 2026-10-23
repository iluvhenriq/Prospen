import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NumerosDaCampanha } from "@/components/campanhas/numeros-campanha";
import { BotaoLink } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Etiqueta } from "@/components/ui/etiqueta";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterCampanhas } from "@/modules/campanhas/consultas";
import { exigirContexto } from "@/modules/organizacoes/contexto";
import { formatarDataIso } from "@/lib/formato";

export const metadata: Metadata = { title: ptBR.campanhas.titulo };

async function ConteudoCampanhas() {
  const contexto = await exigirContexto();
  const { campanhas, moeda } = await obterCampanhas(contexto);
  const t = ptBR.campanhas;

  if (campanhas.length === 0) {
    return (
      <EstadoVazio
        titulo={t.vazioTitulo}
        descricao={t.vazioDescricao}
        acao={<BotaoLink href="/painel/campanhas/nova">{t.nova}</BotaoLink>}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {campanhas.map((campanha) => (
        <li key={campanha.id} className="rounded-xl border border-borda bg-superficie p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/painel/campanhas/${campanha.id}`}
                className="text-base font-semibold text-texto underline-offset-4 hover:text-roxo-700 hover:underline"
              >
                {campanha.nome}
              </Link>
              <p className="text-sm text-texto-suave">
                {t.periodo(formatarDataIso(campanha.inicio), formatarDataIso(campanha.fim))}
              </p>
            </div>
            <Etiqueta variante={campanha.situacao === "ativa" ? "musgo" : "neutra"}>
              {t.situacoes[campanha.situacao]}
            </Etiqueta>
          </div>
          <div className="mt-3">
            <NumerosDaCampanha
              numeros={campanha}
              custoCentavos={campanha.custoCentavos}
              moedaCusto={campanha.moedaCusto}
              moeda={moeda}
              compacto
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function PaginaCampanhas() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-musgo-800">{ptBR.campanhas.titulo}</h1>
          <p className="max-w-2xl text-sm text-texto-suave">{ptBR.campanhas.descricao}</p>
        </div>
        <BotaoLink href="/painel/campanhas/nova">{ptBR.campanhas.nova}</BotaoLink>
      </header>
      <Suspense
        fallback={
          <div className="flex flex-col gap-3" aria-busy="true">
            <Esqueleto className="h-32 w-full" />
            <Esqueleto className="h-32 w-full" />
          </div>
        }
      >
        <ConteudoCampanhas />
      </Suspense>
    </div>
  );
}
