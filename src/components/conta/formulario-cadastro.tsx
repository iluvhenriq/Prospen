"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { ptBR } from "@/lib/i18n/pt-BR";
import { cadastrar } from "@/modules/contas/acoes";
import type { EstadoFormulario } from "@/modules/contas/validacao";

const inicial: EstadoFormulario = {};

export function FormularioCadastro({ convite }: { convite?: string } = {}) {
  const [estado, acao, pendente] = useActionState(cadastrar, inicial);

  // Conta criada: falta só confirmar o e-mail.
  if (estado.sucesso) return <Alerta variante="sucesso">{estado.sucesso}</Alerta>;

  return (
    <form action={acao} noValidate className="flex flex-col gap-4">
      {estado.mensagem ? <Alerta variante="erro">{estado.mensagem}</Alerta> : null}
      {convite ? <input type="hidden" name="convite" value={convite} /> : null}
      <Campo
        rotulo={ptBR.acesso.campos.nome}
        name="nome"
        autoComplete="name"
        defaultValue={estado.valores?.nome}
        erro={estado.erros?.nome}
        required
      />
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
        autoComplete="new-password"
        ajuda={ptBR.acesso.cadastro.ajudaSenha}
        erro={estado.erros?.senha}
        required
      />
      <Botao type="submit" carregando={pendente} className="w-full">
        {ptBR.acesso.cadastro.botao}
      </Botao>
    </form>
  );
}
