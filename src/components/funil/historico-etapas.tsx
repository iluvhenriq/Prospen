import { formatarDataHora } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import type { RegistroEtapaComAutor } from "@/modules/leads/repositorio-historico";

// Mudanças de etapa de um lead, da mais recente para a mais antiga, terminando
// na entrada do lead no funil (a data de cadastro).
export function HistoricoEtapas({
  historico,
  criadoEm,
  fusoHorario,
}: {
  historico: RegistroEtapaComAutor[];
  criadoEm: Date;
  fusoHorario: string;
}) {
  const t = ptBR.funil;
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold text-texto">{t.historicoTitulo}</h4>
      {historico.length === 0 ? (
        <p className="text-sm text-texto-suave">{t.historicoVazio}</p>
      ) : null}
      <ol className="flex flex-col gap-2 border-l-2 border-borda pl-4">
        {historico.map((registro) => (
          <li key={registro.id} className="text-sm">
            <p className="text-texto">
              {t.mudanca(t.etapas[registro.etapaAnterior], t.etapas[registro.etapaNova])}
            </p>
            <p className="text-xs text-texto-suave">
              {t.por(
                registro.autorNome ?? t.autorDesconhecido,
                formatarDataHora(registro.criadoEm, fusoHorario),
              )}
            </p>
          </li>
        ))}
        <li className="text-xs text-texto-suave">
          {t.entrada(formatarDataHora(criadoEm, fusoHorario))}
        </li>
      </ol>
    </div>
  );
}
