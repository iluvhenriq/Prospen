"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { ptBR } from "@/lib/i18n/pt-BR";
import { definirNovaSenha } from "@/modules/contas/acoes";
import type { EstadoFormulario } from "@/modules/contas/validacao";

const inicial: EstadoFormulario = {};

export function FormularioNovaSenha({ token }: { token: string }) {
  const [estado, acao, pendente] = useActionState(definirNovaSenha, inicial);

  return (
    <form action={acao} noValidate className="flex flex-col gap-4">
      {estado.mensagem ? <Alerta variante="erro">{estado.mensagem}</Alerta> : null}
      <input type="hidden" name="token" value={token} />
      <Campo
        rotulo={ptBR.acesso.novaSenha.campo}
        name="senha"
        type="password"
        autoComplete="new-password"
        ajuda={ptBR.acesso.cadastro.ajudaSenha}
        erro={estado.erros?.senha}
        required
      />
      <Botao type="submit" carregando={pendente} className="w-full">
        {ptBR.acesso.novaSenha.botao}
      </Botao>
    </form>
  );
}
