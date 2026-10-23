"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { ptBR } from "@/lib/i18n/pt-BR";
import { entrar } from "@/modules/contas/acoes";
import type { EstadoFormulario } from "@/modules/contas/validacao";

const inicial: EstadoFormulario = {};

export function FormularioEntrar() {
  const [estado, acao, pendente] = useActionState(entrar, inicial);

  return (
    // noValidate: as mensagens vêm do servidor, sempre em português.
    <form action={acao} noValidate className="flex flex-col gap-4">
      {estado.mensagem ? <Alerta variante="erro">{estado.mensagem}</Alerta> : null}
      <Campo
        rotulo={ptBR.acesso.campos.email}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={estado.valores?.email}
        erro={estado.erros?.email}
        required
      />
      <Campo
        rotulo={ptBR.acesso.campos.senha}
        name="senha"
        type="password"
        autoComplete="current-password"
        erro={estado.erros?.senha}
        required
      />
      <Botao type="submit" carregando={pendente} className="w-full">
        {ptBR.acesso.entrar.botao}
      </Botao>
    </form>
  );
}
