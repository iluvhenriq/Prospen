import { ptBR } from "@/lib/i18n/pt-BR";

// Barras horizontais de uma só série (uma cor, sem legenda: o título do cartão
// diz o que é). É uma tabela de verdade: nome, barra e número, então leitores
// de tela e quem não distingue cores leem o mesmo que os outros. O número fica
// sempre escrito; a barra só ajuda a comparar.
export function Barras({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: { rotulo: string; total: number }[];
}) {
  const maximo = Math.max(1, ...linhas.map((linha) => linha.total));
  const t = ptBR.painel.indicadores.tabela;
  return (
    <table className="w-full table-fixed border-separate border-spacing-y-1.5 text-sm">
      <caption className="sr-only">{titulo}</caption>
      <thead className="sr-only">
        <tr>
          {/* Com "table-fixed", as larguras vêm desta primeira linha. */}
          <th scope="col" className="w-36">
            {t.item}
          </th>
          <th scope="col">{t.quantidade}</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr key={linha.rotulo}>
            <th scope="row" className="truncate pr-3 text-left font-normal text-texto-suave">
              {linha.rotulo}
            </th>
            <td>
              <div className="flex items-center gap-2">
                <div className="h-3 min-w-0 flex-1" aria-hidden="true">
                  {linha.total > 0 ? (
                    <div
                      className="h-3 rounded-r bg-roxo-500"
                      // Mínimo de 2% para um total pequeno não sumir ao lado de um grande.
                      style={{ width: `${Math.max(2, (linha.total / maximo) * 100)}%` }}
                    />
                  ) : null}
                </div>
                <span className="w-12 shrink-0 text-right font-medium tabular-nums text-texto">
                  {linha.total.toLocaleString("pt-BR")}
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
