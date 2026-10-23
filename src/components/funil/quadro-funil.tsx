import Link from "next/link";
import { formatarData } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import type { ColunaDoQuadro } from "@/modules/leads/repositorio";
import { FormularioEtapa } from "./formulario-etapa";
import { SeloEtapa } from "./selo-etapa";

// Quadro do funil: uma coluna por etapa. Em telas estreitas as colunas rolam
// para o lado dentro do quadro, sem empurrar a página. O "relative" na caixa de
// rolagem é necessário: sem ele, os rótulos só para leitor de tela (sr-only, que
// têm posição absoluta) escapam da caixa e fazem a página inteira rolar de lado.
export function QuadroFunil({
  colunas,
  fusoHorario,
}: {
  colunas: ColunaDoQuadro[];
  fusoHorario: string;
}) {
  const t = ptBR.funil;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-texto-suave xl:hidden">{t.rolagem}</p>
      <div className="relative -mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        <ol className="grid snap-x snap-mandatory auto-cols-[minmax(13rem,1fr)] grid-flow-col gap-3">
          {colunas.map((coluna) => (
            <li
              key={coluna.etapa}
              className="flex snap-start flex-col gap-3 rounded-xl border border-borda bg-musgo-50 p-3"
            >
              <h2 className="flex items-center justify-between gap-2">
                <SeloEtapa etapa={coluna.etapa} />
                <span className="text-xs text-texto-suave">{t.totalColuna(coluna.total)}</span>
              </h2>

              {coluna.leads.length === 0 ? (
                <p className="px-1 py-4 text-center text-sm text-texto-suave">{t.colunaVazia}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {coluna.leads.map((lead) => (
                    <li
                      key={lead.id}
                      className="flex flex-col gap-2 rounded-lg border border-borda bg-superficie p-3 shadow-sm"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/painel/leads/${lead.id}`}
                          className="block truncate text-sm font-medium text-texto underline-offset-4 hover:text-roxo-700 hover:underline"
                        >
                          {lead.nome}
                        </Link>
                        {lead.empresa ? (
                          <p className="truncate text-xs text-texto-suave">{lead.empresa}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-texto-suave">
                          {t.desde(formatarData(lead.etapaAtualizadaEm, fusoHorario))}
                        </p>
                      </div>
                      <FormularioEtapa
                        leadId={lead.id}
                        etapaAtual={lead.etapa}
                        rotulo={t.moverRotulo(lead.nome)}
                        rotuloBotao={t.mover}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {coluna.total > coluna.leads.length ? (
                <Link
                  href={`/painel/leads?etapa=${coluna.etapa}`}
                  className="mt-auto px-1 text-sm font-medium text-roxo-700 underline-offset-4 hover:underline"
                >
                  {t.verTodos(coluna.total)}
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
