import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./carregando";

export const variantes = cva(
  "inline-flex items-center justify-center gap-2 rounded-controle font-semibold whitespace-nowrap transition-colors active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0",
  {
    variants: {
      variante: {
        primario: "bg-acao text-acao-texto hover:bg-acao-forte",
        secundario: "bg-musgo-200 text-musgo-950 hover:bg-musgo-300",
        // Sobre a mesa verde-escura da página de apresentação.
        papel: "bg-papel text-musgo-950 shadow-[0_1px_1px_rgb(0_0_0/0.3),0_6px_14px_-6px_rgb(0_0_0/0.5)] hover:bg-white",
        contorno:
          "border border-borda-campo bg-superficie text-texto hover:bg-musgo-50",
        fantasma: "text-texto hover:bg-musgo-100",
        perigo: "bg-erro text-erro-contraste hover:bg-erro-escuro",
      },
      tamanho: {
        pequeno: "h-8 px-3 text-sm",
        medio: "h-10 px-4 text-sm",
        grande: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variante: "primario", tamanho: "medio" },
  },
);

type BotaoProps = ComponentProps<"button"> &
  VariantProps<typeof variantes> & {
    // Mostra o indicador de carregamento e bloqueia novos cliques.
    carregando?: boolean;
  };

export function Botao({
  variante,
  tamanho,
  carregando = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: BotaoProps) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cn(variantes({ variante, tamanho }), className)}
      {...props}
    >
      {carregando ? <Spinner /> : null}
      {children}
    </button>
  );
}

type BotaoLinkProps = ComponentProps<typeof Link> & VariantProps<typeof variantes>;

// Link com a aparência de um botão, para navegação entre páginas.
export function BotaoLink({
  variante,
  tamanho,
  className,
  ...props
}: BotaoLinkProps) {
  return (
    <Link className={cn(variantes({ variante, tamanho }), className)} {...props} />
  );
}
