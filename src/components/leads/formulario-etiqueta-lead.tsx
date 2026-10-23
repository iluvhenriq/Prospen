"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { CampoSelecao } from "@/components/ui/campo-texto";
import { ptBR } from "@/lib/i18n/pt-BR";
import { atribuirEtiqueta } from "@/modules/leads/acoes";
import type { EstadoAcao } from "@/modules/leads/estados";

const inicial: EstadoAcao = {};

export function FormularioEtiquetaLead({
  leadId,
  disponiveis,
  empresaSemEtiquetas,
}: {
  leadId: string;
  disponiveis: { id: string; nome: string }[];
  // Só nesse caso a dica "criar a primeira etiqueta" é verdadeira.
  empresaSemEtiquetas: boolean;
}) {
  const [estado, executar, pendente] = useActionState(atribuirEtiqueta, inicial);
  const t = ptBR.leads.etiquetasDoLead;

  return (
    <form action={executar} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      {estado.mensagem ? <Alerta variante="erro">{estado.mensagem}</Alerta> : null}

      {disponiveis.length > 0 ? (
        <CampoSelecao
          rotulo={t.escolher}
          name="etiquetaId"
          defaultValue=""
          erro={estado.erros?.etiquetaId}
        >
          <option value="">{t.escolherOpcao}</option>
          {disponiveis.map((etiqueta) => (
            <option key={etiqueta.id} value={etiqueta.id}>
              {etiqueta.nome}
            </option>
          ))}
        </CampoSelecao>
      ) : null}

      <Campo
        rotulo={disponiveis.length > 0 ? t.ouCriar : t.nova}
        name="nova"
        autoComplete="off"
        maxLength={80}
        defaultValue={estado.valores?.nova ?? ""}
        erro={estado.erros?.nova}
        ajuda={empresaSemEtiquetas ? t.semOpcoes : undefined}
      />
      <div>
        <Botao type="submit" variante="secundario" tamanho="pequeno" carregando={pendente}>
          {t.adicionar}
        </Botao>
      </div>
    </form>
  );
}
