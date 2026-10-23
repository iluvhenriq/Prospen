import { ptBR } from "@/lib/i18n/pt-BR";
import type { NumerosCampanha } from "@/modules/campanhas/tipos";
import { formatarValor } from "@/modules/leads/valor";

// Números de uma campanha. Tudo vem dos leads dela; custo é o único dado
// digitado. Sem custo, custo por lead e retorno não aparecem (nada estimado).
export function NumerosDaCampanha({
  numeros,
  custoCentavos,
  moedaCusto,
  moeda,
  compacto = false,
}: {
  numeros: NumerosCampanha;
  custoCentavos: number | null;
  moedaCusto: string | null;
  moeda: string;
  compacto?: boolean;
}) {
  const t = ptBR.campanhas.numeros;
  // O custo só entra nas contas se estiver na mesma moeda das vendas somadas.
  const custo = custoCentavos !== null && moedaCusto === moeda ? custoCentavos : null;
  const itens: { rotulo: string; valor: string; apoio?: string }[] = [
    { rotulo: t.leads, valor: numeros.leads.toLocaleString("pt-BR") },
    {
      rotulo: t.contatados,
      valor: numeros.contatados.toLocaleString("pt-BR"),
      apoio: `${t.percentual(numeros.contatados, numeros.leads)} · ${t.contatadosAjuda}`,
    },
    { rotulo: t.ganhos, valor: numeros.ganhos.toLocaleString("pt-BR"), apoio: t.percentual(numeros.ganhos, numeros.leads) },
    { rotulo: t.vendido, valor: formatarValor(numeros.vendidoCentavos, moeda) },
  ];
  if (!compacto) {
    if (custo === null) {
      itens.push({ rotulo: t.custo, valor: "—", apoio: t.semCusto });
    } else {
      itens.push(
        { rotulo: t.custo, valor: formatarValor(custo, moeda) },
        {
          rotulo: t.custoPorLead,
          valor: numeros.leads > 0 ? formatarValor(Math.round(custo / numeros.leads), moeda) : "—",
        },
        {
          rotulo: t.retorno,
          valor: formatarValor(numeros.vendidoCentavos - custo, moeda),
          apoio: t.retornoAjuda,
        },
      );
    }
  }

  return (
    <dl className={compacto ? "grid grid-cols-2 gap-3 sm:grid-cols-4" : "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"}>
      {itens.map((item) => (
        <div key={item.rotulo} className="flex flex-col gap-0.5">
          <dt className="text-xs text-texto-suave">{item.rotulo}</dt>
          <dd className={compacto ? "text-lg font-semibold tabular-nums text-texto" : "text-2xl font-semibold tabular-nums text-musgo-800"}>
            {item.valor}
          </dd>
          {item.apoio && !compacto ? <dd className="text-xs text-texto-suave">{item.apoio}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
