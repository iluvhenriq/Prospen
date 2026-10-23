"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { CampoSelecao } from "@/components/ui/campo-texto";
import { ptBR } from "@/lib/i18n/pt-BR";
import { adicionarLeadsPorFiltro } from "@/modules/campanhas/acoes";
import type { EstadoAcao } from "@/modules/leads/estados";
import type { EtapaFunil, OrigemLead } from "@/modules/leads/tipos";

const inicial: EstadoAcao = {};

// Coloca na campanha todos os leads que passam nos filtros (os mesmos da
// lista de leads). O servidor relê os filtros e decide quem entra.
export function AdicionarPorFiltro({
  campanhaId,
  etiquetas,
}: {
  campanhaId: string;
  etiquetas: { id: string; nome: string }[];
}) {
  const [estado, executar, pendente] = useActionState(adicionarLeadsPorFiltro, inicial);
  const b = ptBR.leads.busca;
  return (
    <form action={executar} className="flex flex-col gap-3">
      <input type="hidden" name="campanhaId" value={campanhaId} />
      {estado.mensagem ? (
        <Alerta variante={estado.sucesso ? "sucesso" : "aviso"}>{estado.mensagem}</Alerta>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo={b.rotulo} name="q" type="search" placeholder={b.placeholder} maxLength={100} />
        <CampoSelecao rotulo={b.etiqueta} name="etiqueta" defaultValue="">
          <option value="">{b.todasEtiquetas}</option>
          {etiquetas.map((etiqueta) => (
            <option key={etiqueta.id} value={etiqueta.id}>
              {etiqueta.nome}
            </option>
          ))}
        </CampoSelecao>
        <CampoSelecao rotulo={b.origem} name="origem" defaultValue="">
          <option value="">{b.todasOrigens}</option>
          {(Object.keys(ptBR.leads.origens) as OrigemLead[]).map((origem) => (
            <option key={origem} value={origem}>
              {ptBR.leads.origens[origem]}
            </option>
          ))}
        </CampoSelecao>
        <CampoSelecao rotulo={b.etapa} name="etapa" defaultValue="">
          <option value="">{b.todasEtapas}</option>
          {(Object.keys(ptBR.funil.etapas) as EtapaFunil[]).map((etapa) => (
            <option key={etapa} value={etapa}>
              {ptBR.funil.etapas[etapa]}
            </option>
          ))}
        </CampoSelecao>
      </div>
      <div>
        <Botao type="submit" variante="secundario" carregando={pendente}>
          {ptBR.campanhas.adicionarBotao}
        </Botao>
      </div>
    </form>
  );
}
