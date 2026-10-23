import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variantes = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variante: {
        neutra: "bg-musgo-50 text-texto-suave ring-1 ring-inset ring-borda",
        roxo: "bg-roxo-100 text-roxo-700",
        musgo: "bg-musgo-100 text-musgo-800",
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
