import type { ComponentProps } from "react";

// Ícones do menu, desenhados no mesmo traço (20x20, linha de 1,6). Decorativos:
// o texto ao lado já diz o que é.
function Icone({ children, ...props }: ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[1.125rem] shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ICONES = {
  painel: (
    <Icone>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="4" rx="1" />
      <rect x="11" y="9" width="6" height="8" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
    </Icone>
  ),
  leads: (
    <Icone>
      <circle cx="7.5" cy="7" r="3" />
      <path d="M2.5 16.5c.6-2.6 2.6-4 5-4s4.4 1.4 5 4" />
      <path d="M13 4.3a3 3 0 0 1 0 5.4M14.8 12.8c1.4.5 2.4 1.8 2.7 3.7" />
    </Icone>
  ),
  funil: (
    <Icone>
      <path d="M3 4h14l-5.2 6.3V16l-3.6-1.6v-4.1z" />
    </Icone>
  ),
  campanhas: (
    <Icone>
      <path d="M4 17V3.5M4 4h10.5l-2 3.5 2 3.5H4" />
    </Icone>
  ),
  busca: (
    <Icone>
      <circle cx="8.5" cy="8.5" r="5" />
      <path d="m12.3 12.3 4.2 4.2" />
    </Icone>
  ),
  novo: (
    <Icone>
      <path d="M10 4v12M4 10h12" />
    </Icone>
  ),
  importar: (
    <Icone>
      <path d="M10 3v9M6.5 8.5 10 12l3.5-3.5M4 14v2.5h12V14" />
    </Icone>
  ),
} as const;
