import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type SpinnerProps = ComponentProps<"svg"> & {
  // Se informado, leitores de tela anunciam o texto. Sem ele, o ícone é decorativo.
  rotulo?: string;
};

export function Spinner({ rotulo, className, ...props }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-4 animate-spin motion-reduce:animate-none", className)}
      {...(rotulo
        ? { role: "status", "aria-label": rotulo }
        : { "aria-hidden": true })}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Bloco cinza pulsante que ocupa o lugar do conteúdo enquanto ele carrega.
export function Esqueleto({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-musgo-100 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
