"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Botao } from "@/components/ui/botao";
import { Selecao } from "@/components/ui/campo-texto";
import { ptBR } from "@/lib/i18n/pt-BR";
import { adicionarLeadNaCampanha, removerLeadDaCampanha } from "@/modules/campanhas/acoes";
import type { EstadoAcao } from "@/modules/leads/estados";

const inicial: EstadoAcao = {};

// Campanhas em que o lead está, com a opção de tirar, e a lista das campanhas
// ativas em que ele ainda pode entrar.
export function CampanhasDoLead({
  leadId,
  doLead,
  ativas,
}: {
  leadId: string;
  doLead: { id: string; nome: string }[];
  ativas: { id: string; nome: string }[];
}) {
  const [estado, executar, pendente] = useActionState(adicionarLeadNaCampanha, inicial);
  const t = ptBR.campanhas;
  const idCampo = `campanha-${leadId}`;

  return (
    <div className="flex flex-col gap-4">
      {doLead.length === 0 ? (
        <p className="text-sm text-texto-suave">{t.doLeadVazio}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {doLead.map((campanha) => (
            <li key={campanha.id} className="flex items-center justify-between gap-2 text-sm">
              <Link
                href={`/painel/campanhas/${campanha.id}`}
                className="min-w-0 truncate font-medium text-texto underline-offset-4 hover:text-roxo-700 hover:underline"
              >
                {campanha.nome}
              </Link>
              <form action={removerLeadDaCampanha}>
                <input type="hidden" name="campanhaId" value={campanha.id} />
                <input type="hidden" name="leadId" value={leadId} />
                <Botao type="submit" variante="fantasma" tamanho="pequeno" aria-label={t.remover(campanha.nome)}>
                  {t.removerCurto}
                </Botao>
              </form>
            </li>
          ))}
        </ul>
      )}

      {ativas.length === 0 ? (
        <p className="text-xs text-texto-suave">{t.doLeadSemAtivas}</p>
      ) : (
        // A chave recria o formulário quando a lista muda: a campanha recém-usada some da lista.
        <form key={ativas.map((campanha) => campanha.id).join()} action={executar} className="flex flex-col gap-2">
          <input type="hidden" name="leadId" value={leadId} />
          <label htmlFor={idCampo} className="text-sm font-medium text-texto">
            {t.doLeadAdicionar}
          </label>
          <div className="flex flex-wrap gap-2">
            <Selecao id={idCampo} name="campanhaId" defaultValue="" className="min-w-0 flex-1 basis-40">
              <option value="" disabled>
                {t.doLeadEscolha}
              </option>
              {ativas.map((campanha) => (
                <option key={campanha.id} value={campanha.id}>
                  {campanha.nome}
                </option>
              ))}
            </Selecao>
            <Botao type="submit" variante="contorno" carregando={pendente}>
              {t.adicionarBotao}
            </Botao>
          </div>
          {estado.erros?.campanhaId ? <p className="text-sm text-erro">{estado.erros.campanhaId}</p> : null}
        </form>
      )}
    </div>
  );
}
