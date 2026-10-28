"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";
import { CHAVE_TEMA, TEMAS, type Tema } from "@/lib/tema";

const EVENTO = "prospen-tema";
const consulta = () => window.matchMedia("(prefers-color-scheme: dark)");

function lerTema(): Tema {
  const valor = document.documentElement.dataset.tema;
  return valor === "escuro" || valor === "sistema" ? valor : "claro";
}

// Aplica na hora (sem recarregar) e guarda a escolha neste navegador.
function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  raiz.dataset.tema = tema;
  const escuro = tema === "escuro" || (tema === "sistema" && consulta().matches);
  raiz.toggleAttribute("data-escuro", escuro);
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // Navegador sem armazenamento (janela privada, por exemplo): vale só nesta visita.
  }
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(avisar: () => void) {
  // "Igual ao sistema" acompanha a troca do sistema com a página aberta.
  const aoMudarSistema = () => {
    if (lerTema() === "sistema") aplicar("sistema");
  };
  const media = consulta();
  media.addEventListener("change", aoMudarSistema);
  window.addEventListener(EVENTO, avisar);
  return () => {
    media.removeEventListener("change", aoMudarSistema);
    window.removeEventListener(EVENTO, avisar);
  };
}

const ICONE: Record<Tema, ReactNode> = {
  claro: (
    <>
      <circle cx="10" cy="10" r="3.2" />
      <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3" />
    </>
  ),
  escuro: <path d="M15.5 12.3A6 6 0 0 1 7.7 4.5a6 6 0 1 0 7.8 7.8z" />,
  sistema: (
    <>
      <rect x="2.75" y="3.75" width="14.5" height="9.5" rx="1.2" />
      <path d="M7 16.5h6" />
    </>
  ),
};

function Icone({ tema }: { tema: Tema }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0">
      {ICONE[tema]}
    </svg>
  );
}

// Escolha do tema. "lateral": três botões lado a lado, na coluna da esquerda.
// "compacto": um botão só, que passa para a próxima opção (barra do celular).
export function SeletorTema({ forma }: { forma: "lateral" | "compacto" }) {
  const t = ptBR.tema;
  // No servidor não há escolha: o script do <head> já pintou a tela certa, e
  // aqui o botão marcado se acerta logo depois de carregar.
  const tema = useSyncExternalStore(assinar, lerTema, () => "claro" as Tema);

  if (forma === "compacto") {
    const proximo = TEMAS[(TEMAS.indexOf(tema) + 1) % TEMAS.length];
    return (
      <button
        type="button"
        onClick={() => aplicar(proximo)}
        title={t.atual(t.opcoes[tema])}
        aria-label={t.trocar(t.opcoes[tema], t.opcoes[proximo])}
        className="grid size-8 place-items-center rounded-controle text-musgo-100 ring-1 ring-inset ring-mesa-linha hover:bg-mesa-clara hover:text-white"
      >
        <Icone tema={tema} />
      </button>
    );
  }

  return (
    <div role="group" aria-label={t.rotulo} className="grid grid-cols-3 gap-0.5 rounded-controle bg-black/20 p-0.5">
      {TEMAS.map((opcao) => (
        <button
          key={opcao}
          type="button"
          aria-pressed={tema === opcao}
          onClick={() => aplicar(opcao)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-[4px] px-1.5 py-1.5 text-xs font-medium transition-colors",
            tema === opcao ? "bg-mesa-clara text-white" : "text-musgo-200 hover:text-white",
          )}
        >
          <Icone tema={opcao} />
          {t.opcoes[opcao]}
        </button>
      ))}
    </div>
  );
}
