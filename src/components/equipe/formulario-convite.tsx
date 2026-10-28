"use client";

import { useActionState, useState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { ptBR } from "@/lib/i18n/pt-BR";
import { convidarPessoa, type EstadoConvite } from "@/modules/organizacoes/acoes-equipe";

const inicial: EstadoConvite = {};

// Copia o link completo do convite (o servidor manda só o caminho).
export function CopiarLink({ caminho }: { caminho: string }) {
  const [copiado, setCopiado] = useState(false);
  const t = ptBR.equipe;
  return (
    <Botao
      type="button"
      variante="contorno"
      tamanho="pequeno"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${caminho}`);
          setCopiado(true);
        } catch {
          setCopiado(false);
        }
      }}
    >
      {copiado ? t.copiado : t.copiar}
    </Botao>
  );
}

// "cheio": aviso de limite quando não há vaga. O formulário continua montado
// mesmo assim, para o link do convite recém-criado não sumir quando a tela
// se atualiza e vê a última vaga ocupada.
export function FormularioConvite({ cheio }: { cheio: string | null }) {
  const [estado, acao, pendente] = useActionState(convidarPessoa, inicial);
  const t = ptBR.equipe;

  return (
    <form action={acao} noValidate className="flex flex-col gap-4">
      {estado.mensagem ? (
        <Alerta variante={estado.link ? "sucesso" : "erro"}>
          <p>{estado.mensagem}</p>
          {estado.link ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="break-all rounded-controle bg-superficie px-2 py-1 text-xs text-texto">{estado.link}</code>
              <CopiarLink caminho={estado.link} />
            </div>
          ) : null}
        </Alerta>
      ) : null}
      {cheio ? (
        <Alerta variante="info">{cheio}</Alerta>
      ) : (
        <>
          <Campo rotulo={t.email} name="email" type="email" autoComplete="off" ajuda={t.convidarAjuda} required />
          <Botao type="submit" carregando={pendente} className="self-start">
            {t.gerarLink}
          </Botao>
        </>
      )}
    </form>
  );
}
