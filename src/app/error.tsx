"use client";

import { Botao } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";

// Tela de erro para qualquer página que falhar. Não mostra detalhes técnicos.
export default function Erro({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-musgo-800">
        {ptBR.erro.titulo}
      </h1>
      <p className="max-w-md text-texto-suave">{ptBR.erro.descricao}</p>
      <Botao onClick={reset}>{ptBR.erro.tentarNovamente}</Botao>
    </main>
  );
}
