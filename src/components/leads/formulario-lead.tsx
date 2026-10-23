"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { CampoSelecao } from "@/components/ui/campo-texto";
import { ptBR } from "@/lib/i18n/pt-BR";
import type { EstadoAcao } from "@/modules/leads/estados";
import { opcoesDePais } from "@/modules/leads/paises";

type DadosDoLead = {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  pais: string;
};

type FormularioLeadProps = {
  // Ação do servidor: criarLead (novo) ou atualizarLead (edição).
  acao: (anterior: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;
  // Presente só na edição.
  lead?: DadosDoLead;
  paisPadrao: string;
  rotuloBotao: string;
};

const inicial: EstadoAcao = {};

export function FormularioLead({ acao, lead, paisPadrao, rotuloBotao }: FormularioLeadProps) {
  const [estado, executar, pendente] = useActionState(acao, inicial);
  const valores = estado.valores;
  const erros = estado.erros ?? {};
  const f = ptBR.leads.formulario;

  const pais = valores?.pais ?? lead?.pais ?? paisPadrao;

  return (
    // noValidate: as mensagens vêm do servidor, sempre em português.
    <form action={executar} noValidate className="flex flex-col gap-4">
      {lead ? <input type="hidden" name="id" value={lead.id} /> : null}

      {estado.mensagem && !estado.sucesso ? (
        <Alerta variante="erro">{estado.mensagem}</Alerta>
      ) : null}
      {estado.sucesso && estado.mensagem ? (
        <Alerta variante="sucesso">{estado.mensagem}</Alerta>
      ) : null}
      {estado.duplicado ? (
        <Alerta variante="aviso">
          <Link
            href={`/painel/leads/${estado.duplicado.id}`}
            className="font-medium underline underline-offset-4"
          >
            {f.verExistente(estado.duplicado.nome)}
          </Link>
        </Alerta>
      ) : null}

      <Campo
        rotulo={f.nome}
        name="nome"
        autoComplete="off"
        defaultValue={valores?.nome ?? lead?.nome ?? ""}
        erro={erros.nome}
        ajuda={f.ajudaNome}
        maxLength={200}
        required
      />
      <Campo
        rotulo={f.empresa}
        name="empresa"
        autoComplete="off"
        defaultValue={valores?.empresa ?? lead?.empresa ?? ""}
        erro={erros.empresa}
        maxLength={200}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo={f.email}
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={valores?.email ?? lead?.email ?? ""}
          erro={erros.email}
          maxLength={300}
        />
        <Campo
          rotulo={f.telefone}
          name="telefone"
          type="tel"
          autoComplete="off"
          defaultValue={valores?.telefone ?? lead?.telefone ?? ""}
          erro={erros.telefone}
          ajuda={f.ajudaTelefone}
          maxLength={60}
        />
      </div>
      <CampoSelecao
        rotulo={f.pais}
        name="pais"
        defaultValue={pais}
        erro={erros.pais}
        className="sm:max-w-xs"
      >
        {opcoesDePais(pais).map((opcao) => (
          <option key={opcao.codigo} value={opcao.codigo}>
            {opcao.nome}
          </option>
        ))}
      </CampoSelecao>

      <div>
        <Botao type="submit" carregando={pendente}>
          {rotuloBotao}
        </Botao>
      </div>
    </form>
  );
}
