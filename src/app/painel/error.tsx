"use client";

import { Botao } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";

// Erro numa tela do painel. Fica dentro da moldura, então o menu continua à
// mão para ir a outra tela. Não mostra detalhes técnicos. "retry" busca a
// página de novo no servidor (veja src/app/error.tsx).
export default function ErroNoPainel({ retry }: { retry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-painel border border-dashed border-borda-campo px-6 py-12 text-center">
      <h1 className="text-lg font-semibold text-texto">{ptBR.erro.titulo}</h1>
      <p className="max-w-sm text-sm text-texto-suave">{ptBR.erro.descricao}</p>
      <Botao className="mt-2" onClick={() => retry()}>
        {ptBR.erro.tentarNovamente}
      </Botao>
    </div>
  );
}
