"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";
import { confirmarEmail } from "@/modules/contas/acoes";
import type { EstadoFormulario } from "@/modules/contas/validacao";

const inicial: EstadoFormulario = {};

export function FormularioConfirmar({ token, convite }: { token: string; convite?: string }) {
  const [estado, acao, pendente] = useActionState(confirmarEmail, inicial);

  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.mensagem ? <Alerta variante="erro">{estado.mensagem}</Alerta> : null}
      <input type="hidden" name="token" value={token} />
      {convite ? <input type="hidden" name="convite" value={convite} /> : null}
      <Botao type="submit" carregando={pendente} className="w-full">
        {ptBR.acesso.confirmar.botao}
      </Botao>
    </form>
  );
}
