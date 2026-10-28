"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { formatarDataIso } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import { salvarProximaAcao } from "@/modules/leads/acoes";
import type { EstadoAcao } from "@/modules/leads/estados";

const inicial: EstadoAcao = {};

// Próxima ação do lead: o que fazer e quando. Mostra a atual e deixa mudar ou
// remover. "Remover" vai pela mesma ação, que ignora os campos quando ele é usado.
export function ProximaAcao({
  leadId,
  em,
  texto,
  hoje,
}: {
  leadId: string;
  em: string | null;
  texto: string | null;
  hoje: string;
}) {
  const [estado, executar, pendente] = useActionState(salvarProximaAcao, inicial);
  const t = ptBR.contatos;
  const atrasada = em !== null && em < hoje;

  return (
    <div className="flex flex-col gap-4">
      {em ? (
        <p className="text-sm">
          <span className={atrasada ? "font-bold text-erro" : "font-bold text-texto"}>{formatarDataIso(em)}</span>
          {texto ? <span className="text-texto">{`: ${texto}`}</span> : null}
        </p>
      ) : (
        <p className="text-sm text-texto-suave">{t.proximaSemData}</p>
      )}

      {/* A chave recria os campos quando a próxima ação salva muda. */}
      <form key={`${em}-${texto}`} action={executar} className="flex flex-col gap-3">
        <input type="hidden" name="leadId" value={leadId} />
        {estado.mensagem ? <Alerta variante={estado.sucesso ? "sucesso" : "erro"}>{estado.mensagem}</Alerta> : null}
        <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <Campo
            rotulo={t.proximaData}
            name="proximaAcaoEm"
            type="date"
            defaultValue={estado.sucesso ? (em ?? "") : (estado.valores?.proximaAcaoEm ?? em ?? "")}
            erro={estado.erros?.proximaAcaoEm}
          />
          <Campo
            rotulo={t.proximaTexto}
            name="proximaAcao"
            maxLength={200}
            placeholder={t.proximaTextoExemplo}
            defaultValue={estado.sucesso ? (texto ?? "") : (estado.valores?.proximaAcao ?? texto ?? "")}
            erro={estado.erros?.proximaAcao}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao type="submit" variante="secundario" carregando={pendente}>
            {t.salvarProxima}
          </Botao>
          {em ? (
            <Botao type="submit" variante="fantasma" formNoValidate name="remover" value="1">
              {t.removerProxima}
            </Botao>
          ) : null}
        </div>
      </form>
    </div>
  );
}
