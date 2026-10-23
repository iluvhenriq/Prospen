import { Botao } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";
import { formatarDataHora } from "@/lib/formato";
import { excluirNota } from "@/modules/leads/acoes";
import type { NotaComAutor } from "@/modules/leads/repositorio-notas";
import { FormularioNota } from "./formulario-nota";

// Notas de um lead, da mais recente para a mais antiga.
export function NotasLead({
  leadId,
  notas,
  fusoHorario,
  usuarioId,
  podeApagarQualquer,
}: {
  leadId: string;
  notas: NotaComAutor[];
  fusoHorario: string;
  usuarioId: string;
  // Administradores e donos apagam qualquer nota. Os demais, só as próprias.
  podeApagarQualquer: boolean;
}) {
  const t = ptBR.leads.notas;
  return (
    <div className="flex flex-col gap-4">
      <FormularioNota leadId={leadId} />

      {notas.length === 0 ? (
        <p className="text-sm text-texto-suave">{t.nenhuma}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notas.map((nota) => {
            const podeApagar = podeApagarQualquer || nota.autorId === usuarioId;
            return (
              <li
                key={nota.id}
                className="rounded-lg border border-borda bg-fundo px-4 py-3"
              >
                {/* whitespace-pre-wrap preserva as quebras de linha da nota. */}
                <p className="whitespace-pre-wrap break-words text-sm text-texto">
                  {nota.texto}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-texto-suave">
                    {t.por(
                      nota.autorNome ?? t.autorDesconhecido,
                      formatarDataHora(nota.criadoEm, fusoHorario),
                    )}
                  </p>
                  {podeApagar ? (
                    <form action={excluirNota}>
                      <input type="hidden" name="notaId" value={nota.id} />
                      <Botao type="submit" variante="fantasma" tamanho="pequeno">
                        {t.excluir}
                      </Botao>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
