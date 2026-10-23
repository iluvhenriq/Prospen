import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        // 16px no celular: abaixo disso o iPhone aproxima a tela ao tocar no campo.
        "h-10 w-full rounded-lg border border-borda-campo bg-superficie px-3 text-base text-texto placeholder:text-placeholder sm:text-sm",
        "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-roxo-500",
        "disabled:cursor-not-allowed disabled:bg-musgo-50 disabled:text-texto-suave",
        "aria-[invalid=true]:border-erro",
        className,
      )}
      {...props}
    />
  );
}

type CampoProps = ComponentProps<"input"> & {
  rotulo: string;
  // Texto de orientação abaixo do campo.
  ajuda?: string;
  // Mensagem de erro. Quando existe, o campo fica marcado como inválido.
  erro?: string;
};

// Rótulo + campo + ajuda + erro, já ligados para leitores de tela.
export function Campo({ rotulo, ajuda, erro, id, className, ...props }: CampoProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  // Com erro na tela, a dica sai: o erro já diz o que fazer e evita repetir a mesma ideia.
  const mostrarAjuda = Boolean(ajuda) && !erro;
  const idAjuda = mostrarAjuda ? `${idCampo}-ajuda` : undefined;
  const idErro = erro ? `${idCampo}-erro` : undefined;
  const descricao = [idErro, idAjuda].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <Entrada
        id={idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        {...props}
      />
      {erro ? (
        <p id={idErro} className="text-sm text-erro">
          {erro}
        </p>
      ) : null}
      {mostrarAjuda ? (
        <p id={idAjuda} className="text-sm text-texto-suave">
          {ajuda}
        </p>
      ) : null}
    </div>
  );
}
