import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type EstadoVazioProps = Omit<ComponentProps<"div">, "title"> & {
  titulo: string;
  descricao?: string;
  // Botão ou link com o próximo passo, quando houver.
  acao?: ReactNode;
};

// Mostrado quando uma lista ou painel ainda não tem dados.
export function EstadoVazio({
  titulo,
  descricao,
  acao,
  className,
  ...props
}: EstadoVazioProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-painel border border-dashed border-borda-campo px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      <p className="text-base font-semibold text-texto">{titulo}</p>
      {descricao ? (
        <p className="max-w-sm text-sm text-texto-suave">{descricao}</p>
      ) : null}
      {acao ? <div className="mt-2">{acao}</div> : null}
    </div>
  );
}
