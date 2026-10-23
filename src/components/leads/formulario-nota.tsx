"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { CampoTexto } from "@/components/ui/campo-texto";
import { ptBR } from "@/lib/i18n/pt-BR";
import { adicionarNota } from "@/modules/leads/acoes";
import type { EstadoAcao } from "@/modules/leads/estados";

const inicial: EstadoAcao = {};

export function FormularioNota({ leadId }: { leadId: string }) {
  const [estado, executar, pendente] = useActionState(adicionarNota, inicial);
  const t = ptBR.leads.notas;

  return (
    <form action={executar} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      {estado.mensagem ? <Alerta variante="erro">{estado.mensagem}</Alerta> : null}
      <CampoTexto
        rotulo={t.campo}
        name="texto"
        placeholder={t.placeholder}
        defaultValue={estado.valores?.texto ?? ""}
        erro={estado.erros?.texto}
        rows={3}
        maxLength={2100}
        required
      />
      <div>
        <Botao type="submit" variante="secundario" carregando={pendente}>
          {t.adicionar}
        </Botao>
      </div>
    </form>
  );
}
