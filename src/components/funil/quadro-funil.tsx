import Link from "next/link";
import { BotoesContato } from "@/components/leads/botoes-contato";
import { textoDoLead } from "@/components/leads/nome-do-lead";
import { formatarData } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import type { ColunaDoQuadro } from "@/modules/leads/repositorio";
import { formatarValor } from "@/modules/leads/valor";
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
              className="flex snap-start flex-col gap-3 rounded-painel bg-musgo-100/60 p-2.5"
            >
              <h2 className="flex items-center justify-between gap-2 border-b-2 border-texto px-1 pb-2 pt-1">
                <SeloEtapa etapa={coluna.etapa} />
                <span className="numeros text-xs font-semibold text-texto-suave">{t.totalColuna(coluna.total)}</span>
              </h2>

              {coluna.leads.length === 0 ? (
                <p className="px-1 py-4 text-center text-sm text-texto-suave">{t.colunaVazia}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {coluna.leads.map((lead) => (
                    <li
                      key={lead.id}
                      className="flex flex-col gap-2 rounded-controle border border-borda bg-superficie p-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/painel/leads/${lead.id}`}
                          className="block truncate text-sm font-semibold text-texto hover:text-musgo-700 hover:underline"
                        >
                          {textoDoLead(lead.nome, lead.origem)}
                        </Link>
                        {lead.empresa && lead.empresa !== lead.nome ? (
                          <p className="truncate text-xs text-texto-suave">{textoDoLead(lead.empresa, lead.origem)}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-texto-suave">
                          {t.desde(formatarData(lead.etapaAtualizadaEm, fusoHorario))}
                        </p>
                        {lead.etapa === "perdido" ? (
                          <p className="text-xs font-medium text-texto">
                            {lead.motivoPerda ? t.resultado.motivos[lead.motivoPerda] : t.resultado.motivoNaoInformado}
                          </p>
                        ) : null}
                        {lead.etapa === "ganho" ? (
                          <p className="text-xs font-medium text-musgo-800">
                            {lead.valorVendaCentavos !== null && lead.moedaVenda
                              ? formatarValor(lead.valorVendaCentavos, lead.moedaVenda)
                              : t.resultado.valorNaoInformado}
                          </p>
                        ) : null}
                      </div>
                      <BotoesContato
                        nome={textoDoLead(lead.nome, lead.origem)}
                        telefone={lead.telefone}
                        email={lead.email}
                        pais={lead.pais}
                        compacto
                      />
                      <FormularioEtapa
                        leadId={lead.id}
                        etapaAtual={lead.etapa}
                        rotulo={t.moverRotulo(lead.nome)}
                        rotuloBotao={t.mover}
                        compacto
                      />
                    </li>
                  ))}
                </ul>
              )}

              {coluna.total > coluna.leads.length ? (
                <Link
                  href={`/painel/leads?etapa=${coluna.etapa}`}
                  className="mt-auto px-1 text-sm font-medium text-musgo-700 underline-offset-4 hover:underline"
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
