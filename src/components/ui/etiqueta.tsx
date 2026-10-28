import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variantes = cva(
  "inline-flex items-center rounded-[4px] px-2 py-0.5 text-xs font-semibold",
  {
    variants: {
      variante: {
        neutra: "bg-musgo-50 text-texto-suave ring-1 ring-inset ring-borda",
        andamento: "bg-musgo-100 text-musgo-900",
        musgo: "bg-acao text-acao-texto",
        // Marca-texto: só para o que merece atenção primeiro (prioridade alta).
        destaque: "bg-marca-texto text-tinta",
        // Roxo só existe como cor de etiqueta escolhida pelo usuário (fica no banco).
        roxo: "bg-[#ece6fb] text-[#4a2f8f]",
        erro: "bg-erro-fundo text-erro",
        aviso: "bg-aviso-fundo text-aviso",
      },
    },
    defaultVariants: { variante: "neutra" },
  },
);

type EtiquetaProps = ComponentProps<"span"> & VariantProps<typeof variantes>;

export function Etiqueta({ variante, className, ...props }: EtiquetaProps) {
  return <span className={cn(variantes({ variante }), className)} {...props} />;
}
