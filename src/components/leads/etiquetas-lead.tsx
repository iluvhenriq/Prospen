import { Etiqueta } from "@/components/ui/etiqueta";
import { ptBR } from "@/lib/i18n/pt-BR";
import { removerEtiquetaDoLead } from "@/modules/leads/acoes";
import type { Etiqueta as EtiquetaDoLead } from "@/modules/leads/tipos";
import { FormularioEtiquetaLead } from "./formulario-etiqueta-lead";

// Etiquetas de um lead: as atuais (cada uma com botão de remover) e o formulário
// para adicionar uma existente ou criar uma nova.
export function EtiquetasLead({
  leadId,
  etiquetas,
  disponiveis,
}: {
  leadId: string;
  etiquetas: EtiquetaDoLead[];
  disponiveis: { id: string; nome: string }[];
}) {
  const t = ptBR.leads.etiquetasDoLead;
  return (
    <div className="flex flex-col gap-4">
      {etiquetas.length === 0 ? (
        <p className="text-sm text-texto-suave">{t.nenhuma}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {etiquetas.map((etiqueta) => (
            <li key={etiqueta.id}>
              <Etiqueta variante={etiqueta.cor} className="gap-1 py-1 pr-1.5">
                {etiqueta.nome}
                <form action={removerEtiquetaDoLead} className="inline-flex">
                  <input type="hidden" name="leadId" value={leadId} />
                  <input type="hidden" name="etiquetaId" value={etiqueta.id} />
                  <button
                    type="submit"
                    aria-label={t.remover(etiqueta.nome)}
                    className="inline-flex size-5 items-center justify-center rounded-full text-base leading-none hover:bg-black/10"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </form>
              </Etiqueta>
            </li>
          ))}
        </ul>
      )}
      <FormularioEtiquetaLead leadId={leadId} disponiveis={disponiveis} />
    </div>
  );
}
