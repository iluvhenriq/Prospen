"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { ptBR } from "@/lib/i18n/pt-BR";
import { pedirNovaSenha } from "@/modules/contas/acoes";
import type { EstadoFormulario } from "@/modules/contas/validacao";

const inicial: EstadoFormulario = {};

export function FormularioEsqueci() {
  const [estado, acao, pendente] = useActionState(pedirNovaSenha, inicial);

  if (estado.sucesso) return <Alerta variante="sucesso">{estado.sucesso}</Alerta>;

  return (
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
      <Botao type="submit" carregando={pendente} className="w-full">
        {ptBR.acesso.esqueci.botao}
      </Botao>
    </form>
  );
}
