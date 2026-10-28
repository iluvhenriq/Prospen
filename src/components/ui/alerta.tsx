import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variantes = cva("rounded-painel border p-4 text-sm", {
  variants: {
    variante: {
      info: "border-borda bg-superficie text-texto",
      sucesso: "border-musgo-200 bg-musgo-50 text-musgo-900",
      aviso: "border-aviso-borda bg-aviso-fundo text-aviso",
      erro: "border-erro-borda bg-erro-fundo text-erro",
    },
  },
  defaultVariants: { variante: "info" },
});

type AlertaProps = Omit<ComponentProps<"div">, "title"> &
  VariantProps<typeof variantes> & {
    titulo?: string;
  };

export function Alerta({
  variante = "info",
  titulo,
  className,
  children,
  ...props
}: AlertaProps) {
  // Erros e avisos interrompem a leitura; os demais são anunciados com calma.
  const papel = variante === "erro" || variante === "aviso" ? "alert" : "status";
  return (
    <div role={papel} className={cn(variantes({ variante }), className)} {...props}>
      {titulo ? <p className="font-semibold">{titulo}</p> : null}
      <div className={titulo ? "mt-1" : undefined}>{children}</div>
    </div>
  );
}
