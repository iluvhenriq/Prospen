import Link from "next/link";
import { Botao } from "@/components/ui/botao";
import { nomeParaExibir } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import { pararDeVigiar } from "@/modules/base-cnpj/acoes";
import type { NovidadeDeBusca } from "@/modules/base-cnpj/busca";
import { DIAS_DE_RECENTES } from "@/modules/base-cnpj/parametros";

// "Empresas novas nas suas buscas", no painel: cada busca vigiada com quantas
// empresas abriram nos últimos dias e ainda não são leads.
export function NovidadesDasBuscas({ buscas }: { buscas: NovidadeDeBusca[] }) {
  const t = ptBR.painel.novidades;
  return (
    <section className="flex flex-col gap-3 rounded-painel border border-borda bg-superficie px-5 py-5">
      <div>
        <h2 className="text-base font-bold text-texto">{t.titulo}</h2>
        <p className="text-sm text-texto-suave">{t.descricao(DIAS_DE_RECENTES)}</p>
      </div>

      {buscas.length === 0 ? (
        <p className="text-sm text-texto">
          {t.vazio}{" "}
          <Link href="/painel/busca" className="font-semibold text-musgo-700 underline hover:text-musgo-900">
            {t.buscar}
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-borda border-y border-borda">
          {buscas.map((busca) => {
            const local = busca.municipioNome ? `${nomeParaExibir(busca.municipioNome)}/${busca.uf}` : busca.uf;
            const descricao = t.descricaoDaBusca(busca.atividade, local);
            return (
              <li key={busca.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={
                      busca.novas > 0
                        ? "numeros shrink-0 rounded-[3px] bg-marca-texto px-1.5 text-sm font-bold text-tinta"
                        : "numeros shrink-0 px-1.5 text-sm font-semibold text-texto-suave"
                    }
                  >
                    {busca.estadoCarregado ? t.novas(busca.novas, busca.maisQue) : t.estadoFora}
                  </span>
                  <span className="min-w-0 truncate text-sm text-texto">{descricao}</span>
                </div>
                <div className="flex items-center gap-1">
                  {busca.novas > 0 ? (
                    <Link href={busca.endereco} className="px-2 text-sm font-semibold text-musgo-700 underline hover:text-musgo-900">
                      {t.ver}
                    </Link>
                  ) : null}
                  <form action={pararDeVigiar}>
                    <input type="hidden" name="id" value={busca.id} />
                    <Botao type="submit" variante="fantasma" tamanho="pequeno" aria-label={t.paraRotulo(descricao)}>
                      {t.parar}
                    </Botao>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
