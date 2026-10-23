"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";

const itens = [
  { href: "/painel", rotulo: ptBR.menu.painel, exato: true },
  { href: "/painel/leads", rotulo: ptBR.menu.leads, exato: false },
  { href: "/painel/funil", rotulo: ptBR.menu.funil, exato: false },
  { href: "/painel/campanhas", rotulo: ptBR.menu.campanhas, exato: false },
  { href: "/painel/busca", rotulo: ptBR.menu.busca, exato: false },
];

// Menu da área logada. Marca a seção atual para quem vê e para leitores de tela.
export function Navegacao() {
  const caminho = usePathname();

  return (
    <nav aria-label={ptBR.menu.principal} className="border-b border-borda bg-superficie">
      <div className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
        {itens.map((item) => {
          const ativo = item.exato
            ? caminho === item.href
            : caminho === item.href || caminho.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                ativo
                  ? "border-roxo-600 text-roxo-700"
                  : "border-transparent text-texto-suave hover:text-texto",
              )}
            >
              {item.rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
