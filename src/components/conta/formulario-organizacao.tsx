"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { ptBR } from "@/lib/i18n/pt-BR";
import { criarOrganizacao } from "@/modules/contas/acoes";
import type { EstadoFormulario } from "@/modules/contas/validacao";

const inicial: EstadoFormulario = {};

export function FormularioOrganizacao() {
  const [estado, acao, pendente] = useActionState(criarOrganizacao, inicial);

  return (
    <form action={acao} noValidate className="flex flex-col gap-4">
      {estado.mensagem ? <Alerta variante="erro">{estado.mensagem}</Alerta> : null}
      <Campo
        rotulo={ptBR.acesso.campos.empresa}
        name="nome"
        autoComplete="organization"
        placeholder={ptBR.acesso.organizacao.exemplo}
        defaultValue={estado.valores?.nome}
        erro={estado.erros?.nome}
        required
      />
      <Botao type="submit" carregando={pendente} className="w-full">
        {ptBR.acesso.organizacao.botao}
      </Botao>
    </form>
  );
}
