"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { ptBR } from "@/lib/i18n/pt-BR";
import { pedirRemocaoDosDados, type EstadoRemocao } from "@/modules/base-cnpj/acoes-remocao";

const inicial: EstadoRemocao = {};

// Pedido público de remoção da base. Funciona sem JavaScript (o formulário
// envia direto para a ação do servidor).
export function FormularioRemocao() {
  const [estado, acao, pendente] = useActionState(pedirRemocaoDosDados, inicial);
  const t = ptBR.remocao;

  return (
    // noValidate: as mensagens vêm do servidor, sempre em português.
    <form action={acao} noValidate className="flex flex-col gap-4">
      {estado.sucesso ? <Alerta variante="sucesso">{estado.sucesso}</Alerta> : null}
      {estado.mensagem ? <Alerta variante="erro">{estado.mensagem}</Alerta> : null}
      <Campo
        rotulo={t.cnpj}
        name="cnpj"
        autoComplete="off"
        placeholder="00.000.000/0000-00"
        maxLength={30}
        ajuda={t.cnpjAjuda}
        defaultValue={estado.sucesso ? "" : estado.valores?.cnpj}
        erro={estado.erros?.cnpj}
        required
      />
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2 text-sm text-texto">
          <input
            type="checkbox"
            name="confirmacao"
            value="sim"
            className="mt-0.5 size-4 shrink-0 accent-musgo-700"
            aria-invalid={estado.erros?.confirmacao ? true : undefined}
            aria-describedby={estado.erros?.confirmacao ? "remocao-confirmacao-erro" : undefined}
          />
          {t.confirmacao}
        </label>
        {estado.erros?.confirmacao ? (
          <p id="remocao-confirmacao-erro" className="text-sm text-erro">
            {estado.erros.confirmacao}
          </p>
        ) : null}
      </div>
      <Botao type="submit" carregando={pendente} variante="perigo" className="self-start">
        {t.botao}
      </Botao>
    </form>
  );
}
