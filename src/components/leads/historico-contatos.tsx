import { formatarDataHora } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import type { ContatoComAutor } from "@/modules/leads/repositorio-contatos";

// Tentativas de contato de um lead, da mais recente para a mais antiga.
export function HistoricoContatos({ contatos, fusoHorario }: { contatos: ContatoComAutor[]; fusoHorario: string }) {
  const t = ptBR.contatos;
  if (contatos.length === 0) return <p className="text-sm text-texto-suave">{t.vazio}</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-texto">
        {t.historico} <span className="font-normal text-texto-suave">({t.tentativas(contatos.length)})</span>
      </p>
      <ol className="flex flex-col divide-y divide-borda border-y border-borda">
        {contatos.map((contato) => (
          <li key={contato.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-sm">
            <span className="text-texto">{t.linha(t.canais[contato.canal], t.resultados[contato.resultado])}</span>
            <span className="text-xs text-texto-suave">
              {formatarDataHora(contato.criadoEm, fusoHorario)}
              {contato.autorNome ? `, ${t.por(contato.autorNome)}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
