"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { CampoTexto } from "@/components/ui/campo-texto";
import { ptBR } from "@/lib/i18n/pt-BR";
import type { EstadoAcao } from "@/modules/leads/estados";

type DadosDaCampanha = {
  id: string;
  nome: string;
  objetivo: string | null;
  inicio: string | null;
  fim: string | null;
  custoCentavos: number | null;
};

const inicial: EstadoAcao = {};

function custoComoTexto(centavos: number | null): string {
  if (centavos === null) return "";
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Criação (sem "campanha") e edição (com "campanha") de uma campanha.
export function FormularioCampanha({
  acao,
  campanha,
  moeda,
  rotuloBotao,
}: {
  acao: (anterior: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;
  campanha?: DadosDaCampanha;
  moeda: string;
  rotuloBotao: string;
}) {
  const [estado, executar, pendente] = useActionState(acao, inicial);
  const valores = estado.valores;
  const erros = estado.erros ?? {};
  const t = ptBR.campanhas.campos;

  return (
    // noValidate: as mensagens vêm do servidor, sempre em português.
    <form action={executar} noValidate className="flex flex-col gap-4">
      {campanha ? <input type="hidden" name="id" value={campanha.id} /> : null}
      {estado.mensagem ? (
        <Alerta variante={estado.sucesso ? "sucesso" : "erro"}>{estado.mensagem}</Alerta>
      ) : null}
      <Campo
        rotulo={t.nome}
        name="nome"
        placeholder={t.nomePlaceholder}
        defaultValue={valores?.nome ?? campanha?.nome ?? ""}
        erro={erros.nome}
        maxLength={80}
        required
      />
      <CampoTexto
        rotulo={t.objetivo}
        name="objetivo"
        ajuda={t.objetivoAjuda}
        defaultValue={valores?.objetivo ?? campanha?.objetivo ?? ""}
        erro={erros.objetivo}
        maxLength={500}
        rows={2}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo={t.inicio}
          name="inicio"
          type="date"
          defaultValue={valores?.inicio ?? campanha?.inicio ?? ""}
          erro={erros.inicio}
        />
        <Campo
          rotulo={t.fim}
          name="fim"
          type="date"
          defaultValue={valores?.fim ?? campanha?.fim ?? ""}
          erro={erros.fim}
        />
      </div>
      <Campo
        rotulo={t.custo}
        name="custo"
        inputMode="decimal"
        ajuda={t.custoAjuda(moeda)}
        defaultValue={valores?.custo ?? custoComoTexto(campanha?.custoCentavos ?? null)}
        erro={erros.custo}
        maxLength={40}
      />
      <div>
        <Botao type="submit" carregando={pendente}>
          {rotuloBotao}
        </Botao>
      </div>
    </form>
  );
}
