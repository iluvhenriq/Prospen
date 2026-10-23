"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Selecao } from "@/components/ui/campo-texto";
import { ptBR } from "@/lib/i18n/pt-BR";
import { registrarMotivoPerda, registrarValorVenda } from "@/modules/leads/acoes";
import type { EstadoAcao } from "@/modules/leads/estados";
import type { EtapaFunil, MotivoPerda } from "@/modules/leads/tipos";

const inicial: EstadoAcao = {};

// Motivo da perda (lead em "Perdido") ou valor da venda (lead em "Ganho").
// Opcional: o lead pode ficar sem, mas o painel de indicadores usa os dois.
export function FormularioResultado({
  leadId,
  etapa,
  motivoPerda,
  valorCentavos,
  moeda,
}: {
  leadId: string;
  etapa: EtapaFunil;
  motivoPerda: MotivoPerda | null;
  valorCentavos: number | null;
  moeda: string;
}) {
  if (etapa === "perdido") return <FormularioMotivo leadId={leadId} motivoPerda={motivoPerda} />;
  if (etapa === "ganho") return <FormularioValor leadId={leadId} valorCentavos={valorCentavos} moeda={moeda} />;
  return null;
}

function Mensagem({ estado }: { estado: EstadoAcao }) {
  if (!estado.mensagem) return null;
  return <Alerta variante={estado.sucesso ? "sucesso" : "aviso"}>{estado.mensagem}</Alerta>;
}

function FormularioMotivo({ leadId, motivoPerda }: { leadId: string; motivoPerda: MotivoPerda | null }) {
  const [estado, executar, pendente] = useActionState(registrarMotivoPerda, inicial);
  const t = ptBR.funil.resultado;
  const idCampo = `motivo-${leadId}`;
  return (
    <form action={executar} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <Mensagem estado={estado} />
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {t.motivoRotulo}
      </label>
      <div className="flex flex-wrap gap-2">
        <Selecao
          id={idCampo}
          name="motivo"
          defaultValue={motivoPerda ?? ""}
          aria-invalid={estado.erros?.motivo ? true : undefined}
          className="min-w-0 flex-1 basis-40"
        >
          <option value="">{t.motivoNaoInformado}</option>
          {(Object.keys(t.motivos) as MotivoPerda[]).map((motivo) => (
            <option key={motivo} value={motivo}>
              {t.motivos[motivo]}
            </option>
          ))}
        </Selecao>
        <Botao type="submit" variante="contorno" carregando={pendente}>
          {t.salvar}
        </Botao>
      </div>
      {estado.erros?.motivo ? <p className="text-sm text-erro">{estado.erros.motivo}</p> : null}
      <p className="text-xs text-texto-suave">{t.motivoAjuda}</p>
    </form>
  );
}

function FormularioValor({ leadId, valorCentavos, moeda }: { leadId: string; valorCentavos: number | null; moeda: string }) {
  const [estado, executar, pendente] = useActionState(registrarValorVenda, inicial);
  const t = ptBR.funil.resultado;
  const valorAtual =
    valorCentavos === null
      ? ""
      : (valorCentavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <form action={executar} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <Mensagem estado={estado} />
      <div className="flex flex-wrap items-start gap-2">
        <Campo
          rotulo={t.valorRotulo}
          name="valor"
          inputMode="decimal"
          ajuda={t.valorAjuda(moeda)}
          erro={estado.erros?.valor}
          defaultValue={estado.valores?.valor ?? valorAtual}
          maxLength={40}
          className="min-w-0 flex-1 basis-40"
        />
        <Botao type="submit" variante="contorno" carregando={pendente} className="sm:mt-7">
          {t.salvar}
        </Botao>
      </div>
    </form>
  );
}
