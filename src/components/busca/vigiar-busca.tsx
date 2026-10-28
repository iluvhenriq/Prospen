"use client";

import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";
import { pararDeVigiar, vigiarBusca, type EstadoVigiar } from "@/modules/base-cnpj/acoes";

const inicial: EstadoVigiar = {};

// "Vigiar esta busca": guarda os filtros atuais para o painel avisar das
// empresas novas. Os filtros vão escondidos no formulário e são conferidos de
// novo no servidor.
export function VigiarBusca({
  uf,
  cidade,
  atividade,
  incluirMei,
  vigiadaId,
}: {
  uf: string;
  cidade: string;
  atividade: string;
  incluirMei: boolean;
  vigiadaId: string | null;
}) {
  const [estado, executar, pendente] = useActionState(vigiarBusca, inicial);
  const t = ptBR.busca.vigiar;

  if (vigiadaId) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-painel border border-borda bg-superficie px-4 py-3 text-sm">
        <span className="flex items-center gap-2 text-texto">
          <span aria-hidden="true" className="h-1.5 w-3 rounded-[1px] bg-marca-texto" />
          {estado.sucesso ? t.feito : t.vigiando}
        </span>
        <form action={pararDeVigiar}>
          <input type="hidden" name="id" value={vigiadaId} />
          <Botao type="submit" variante="fantasma" tamanho="pequeno">
            {t.parar}
          </Botao>
        </form>
      </div>
    );
  }

  return (
    <form action={executar} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-painel border border-dashed border-borda-campo px-4 py-3 text-sm">
      <input type="hidden" name="uf" value={uf} />
      <input type="hidden" name="cidade" value={cidade} />
      <input type="hidden" name="atividade" value={atividade} />
      <input type="hidden" name="mei" value={incluirMei ? "1" : ""} />
      <Botao type="submit" variante="secundario" tamanho="pequeno" carregando={pendente}>
        {t.botao}
      </Botao>
      <span className="text-texto-suave">{estado.mensagem && !estado.sucesso ? estado.mensagem : t.explicacao}</span>
    </form>
  );
}
