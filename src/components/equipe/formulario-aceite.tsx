"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";
import { aceitarConvite, type EstadoAceite } from "@/modules/organizacoes/acoes-equipe";

const inicial: EstadoAceite = {};

export function FormularioAceite({ conviteId }: { conviteId: string }) {
  const [estado, acao, pendente] = useActionState(aceitarConvite, inicial);
  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.mensagem ? <Alerta variante="erro">{estado.mensagem}</Alerta> : null}
      <input type="hidden" name="id" value={conviteId} />
      <Botao type="submit" carregando={pendente} className="w-full">
        {ptBR.equipe.convite.aceitar}
      </Botao>
    </form>
  );
}
