"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";
import { ContaDaNota } from "@/components/pontuacao/selo-pontuacao";
import { faixaDe, VALOR_DO_MOTIVO as VALOR, type Motivo } from "@/modules/pontuacao/regras";

// Cada linha é um perfil (combinação de motivos), não uma empresa. A largura
// é só a da tarja que cobre o nome.
const PERFIS: { motivos: Motivo[]; tarja: string }[] = [
  { motivos: ["telefone", "emailProprio", "empresaNova", "portePequena", "matriz"], tarja: "w-[64%]" },
  { motivos: ["telefone", "emailProprio", "empresaRecente", "porteMicro", "matriz"], tarja: "w-[46%]" },
  { motivos: ["telefone", "emailContador", "empresaRecente", "porteMicro", "matriz"], tarja: "w-[72%]" },
  { motivos: ["telefone", "porteDemais", "matriz"], tarja: "w-[40%]" },
  { motivos: ["emailContador", "matriz"], tarja: "w-[56%]" },
];

const LINHAS = PERFIS.map((perfil) => {
  const pontos = Math.max(0, Math.min(100, perfil.motivos.reduce((soma, m) => soma + VALOR[m], 0)));
  return { ...perfil, pontos, faixa: faixaDe(pontos) };
}).sort((a, b) => b.pontos - a.pontos);

// A lista impressa da busca sobre a mesa, com as melhores riscadas de
// marca-texto. Clicar numa empresa abre a conta da nota na própria linha.
export function DemonstracaoBusca() {
  const t = ptBR.preVenda.demonstracao;
  const [aberta, setAberta] = useState(0);

  return (
    <figure aria-label={t.rotulo} className="relative min-w-0">
      <div className="papel relative -rotate-[0.8deg] rounded-[3px] px-4 pb-4 pt-5 sm:px-7 sm:pb-6 sm:pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-texto pb-3">
          <p className="text-sm font-extrabold tracking-[-0.01em] text-texto">{t.tituloLista}</p>
          <p className="text-xs text-texto-suave">{t.filtros}</p>
        </div>
        <p className="mt-3 text-xs text-texto-suave">{t.ordem}</p>

        <ul className="mt-1.5 flex flex-col">
          {LINHAS.map((item, indice) => {
            const ativa = indice === aberta;
            const idConta = `conta-${item.pontos}`;
            return (
              <li key={item.pontos} className="border-b border-dashed border-borda-campo/60 last:border-b-0">
                <button
                  type="button"
                  aria-expanded={ativa}
                  aria-controls={idConta}
                  aria-label={`${t.empresaOculta}: ${t.linha(item.pontos, ptBR.pontuacao.faixas[item.faixa])}`}
                  onClick={() => setAberta(indice)}
                  className="relative flex w-full cursor-pointer items-center gap-3 py-3 pl-1 pr-1 text-left sm:gap-4"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span aria-hidden="true" className={cn("block h-3.5 rounded-[1px] bg-[#1d2117]", item.tarja)} />
                    <span className={cn("truncate text-xs", ativa ? "text-texto" : "text-texto-suave")}>
                      {item.motivos.map((m) => ptBR.pontuacao.motivos[m]).join(", ")}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="numeros w-7 text-right text-base font-extrabold text-texto">{item.pontos}</span>
                    <span className="w-12 text-xs font-semibold text-texto-suave sm:w-28">
                      <span className="sm:hidden">{t.faixasCurtas[item.faixa]}</span>
                      <span className="hidden sm:inline">{ptBR.pontuacao.faixas[item.faixa]}</span>
                    </span>
                  </span>
                  {/* Marca-texto por cima da tinta: multiplica, então a tarja e o texto aparecem por baixo. */}
                  {item.faixa === "alta" ? (
                    <span
                      aria-hidden="true"
                      className="risco risco-animado pointer-events-none absolute inset-y-1.5 -left-1.5 -right-1.5"
                      style={{ "--ordem": indice } as CSSProperties}
                    />
                  ) : null}
                </button>

                {/* A conta da nota, escrita como uma soma. */}
                {ativa ? (
                  <div id={idConta} className="revelar pb-4 pl-1 pr-1 pt-1">
                    <p className="sr-only">{t.tituloConta}</p>
                    <ContaDaNota pontos={item.pontos} motivos={item.motivos} className="sm:grid-cols-6" />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <figcaption className="mt-6 flex flex-col gap-1 text-sm text-musgo-200">
        <span className="font-semibold text-musgo-50">{t.dica}</span>
        <span>{t.legenda}</span>
      </figcaption>
    </figure>
  );
}
