import Link from "next/link";
import { nomeParaExibir } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import type { RadarDosLeads } from "@/modules/base-cnpj/busca";
import { enderecoDaBusca } from "@/modules/base-cnpj/parametros";
import type { SinalDoLead } from "@/modules/base-cnpj/radar";

function local(valor: string | null): string | null {
  return valor ? nomeParaExibir(valor) : null;
}

export function descreverSinal(sinal: SinalDoLead): string {
  const t = ptBR.painel.radar.tipos;
  switch (sinal.tipo) {
    case "nova_unidade":
      return t.nova_unidade(local(sinal.depois));
    case "mudou_cidade":
      return t.mudou_cidade(local(sinal.antes), local(sinal.depois));
    case "mudou_atividade":
      return t.mudou_atividade(sinal.antes, sinal.depois);
    case "deixou_ativa":
      return t.deixou_ativa();
  }
}

// Link para ver a unidade nova na busca (pelo CNPJ exato).
export function enderecoDaUnidade(cnpj: string): string {
  return enderecoDaBusca({ atividade: "", incluirMei: false, recentes: false, cnpjDigitado: cnpj });
}

// "Mudanças nas empresas dos seus leads", no painel: o que a Receita mudou
// entre uma base mensal e outra, ligado ao lead.
export function RadarDoPainel({ radar }: { radar: RadarDosLeads }) {
  const t = ptBR.painel.radar;
  return (
    <section className="flex flex-col gap-3 rounded-painel border border-borda bg-superficie px-5 py-5">
      <div>
        <h2 className="text-base font-bold text-texto">{t.titulo}</h2>
        <p className="text-sm text-texto-suave">{t.descricao}</p>
      </div>

      {radar.sinais.length === 0 ? (
        <p className="text-sm text-texto">{radar.acompanhados === 0 ? t.semCnpj : t.vazio}</p>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-borda border-y border-borda">
            {radar.sinais.map((sinal) => (
              <li key={sinal.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link
                    href={`/painel/leads/${sinal.lead.id}`}
                    className="truncate text-sm font-semibold text-texto underline-offset-2 hover:underline"
                  >
                    {sinal.lead.empresa ? `${sinal.lead.nome} (${sinal.lead.empresa})` : sinal.lead.nome}
                  </Link>
                  <span className="text-sm text-texto">{descreverSinal(sinal)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="numeros text-xs text-texto-suave">{t.mes(sinal.mesReferencia)}</span>
                  {sinal.tipo === "nova_unidade" ? (
                    <Link
                      href={enderecoDaUnidade(sinal.cnpj)}
                      className="text-sm font-semibold text-musgo-700 underline hover:text-musgo-900"
                    >
                      {t.verUnidade}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {radar.total > radar.sinais.length ? (
            <p className="text-xs text-texto-suave">{t.mostrando(radar.sinais.length, radar.total)}</p>
          ) : null}
        </>
      )}
    </section>
  );
}

// Página do lead: as mudanças da Receita nesta empresa. Sem mudança, não aparece.
export function RadarDoLead({ sinais }: { sinais: SinalDoLead[] }) {
  const t = ptBR.painel.radar;
  if (sinais.length === 0) return null;
  return (
    <section className="flex flex-col gap-3 rounded-painel border border-borda bg-superficie px-5 py-5">
      <div>
        <h2 className="text-base font-bold text-texto">{t.doLeadTitulo}</h2>
        <p className="text-sm text-texto-suave">{t.doLeadDescricao}</p>
      </div>
      <ul className="flex flex-col divide-y divide-borda border-y border-borda">
        {sinais.map((sinal) => (
          <li key={sinal.id} className="flex flex-col gap-0.5 py-3">
            <span className="text-sm text-texto">{descreverSinal(sinal)}</span>
            <span className="flex flex-wrap items-center gap-3">
              <span className="numeros text-xs text-texto-suave">{t.mes(sinal.mesReferencia)}</span>
              {sinal.tipo === "nova_unidade" ? (
                <Link
                  href={enderecoDaUnidade(sinal.cnpj)}
                  className="text-sm font-semibold text-musgo-700 underline hover:text-musgo-900"
                >
                  {t.verUnidade}
                </Link>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
