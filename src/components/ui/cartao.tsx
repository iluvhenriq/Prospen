import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Cartao({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-painel border border-borda bg-superficie",
        className,
      )}
      {...props}
    />
  );
}

export function CartaoCabecalho({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-0", className)} {...props} />;
}

export function CartaoTitulo({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-base font-semibold text-texto", className)}
      {...props}
    />
  );
}

export function CartaoDescricao({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-texto-suave", className)} {...props} />;
}

export function CartaoConteudo({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}
