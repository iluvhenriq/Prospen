"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";
import { ICONES } from "./icones";

const itens: { href: string; rotulo: string; curto?: string; exato: boolean; icone: keyof typeof ICONES }[] = [
  { href: "/painel", rotulo: ptBR.menu.painel, exato: true, icone: "painel" },
  { href: "/painel/leads", rotulo: ptBR.menu.leads, exato: false, icone: "leads" },
  { href: "/painel/funil", rotulo: ptBR.menu.funil, exato: false, icone: "funil" },
  { href: "/painel/campanhas", rotulo: ptBR.menu.campanhas, exato: false, icone: "campanhas" },
  { href: "/painel/busca", rotulo: ptBR.menu.busca, curto: ptBR.menu.buscaCurto, exato: false, icone: "busca" },
];

function ativoEm(caminho: string, item: (typeof itens)[number]) {
  return item.exato ? caminho === item.href : caminho === item.href || caminho.startsWith(`${item.href}/`);
}

// Menu da área logada. Marca a seção atual para quem vê e para leitores de tela.
// "lateral": coluna da esquerda, no computador, com ícones.
// "topo": no celular, itens mais justos que quebram de linha em vez de rolar de
// lado (com rolagem, "Buscar empresas" ficava escondido fora da tela).
export function Navegacao({ forma }: { forma: "lateral" | "topo" }) {
  const caminho = usePathname();

  if (forma === "lateral") {
    return (
      <nav aria-label={ptBR.menu.principal}>
        <ul className="flex flex-col gap-0.5">
          {itens.map((item) => {
            const ativo = ativoEm(caminho, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-controle px-3 py-2 text-sm font-medium transition-colors",
                    ativo ? "bg-mesa-clara text-white" : "text-musgo-200 hover:bg-mesa-clara/60 hover:text-white",
                  )}
                >
                  <span className={ativo ? "text-marca-texto" : undefined}>{ICONES[item.icone]}</span>
                  {item.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={ptBR.menu.principal}>
      <div className="flex w-full flex-wrap gap-x-1 px-2">
        {itens.map((item) => {
          const ativo = ativoEm(caminho, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "whitespace-nowrap border-b-2 px-2 pb-2 pt-2.5 text-sm font-medium transition-colors",
                ativo ? "border-marca-texto text-white" : "border-transparent text-musgo-200 hover:text-white",
              )}
            >
              {item.curto ?? item.rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
