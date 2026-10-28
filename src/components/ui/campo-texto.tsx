import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

// Mesmo visual do campo de uma linha (veja campo.tsx): borda, foco e erro.
const base =
  "w-full rounded-controle border border-borda-campo bg-superficie px-3 text-base text-texto placeholder:text-placeholder sm:text-sm " +
  "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-musgo-700 " +
  "disabled:cursor-not-allowed disabled:bg-musgo-50 disabled:text-texto-suave " +
  "aria-[invalid=true]:border-erro";

export function AreaTexto({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(base, "min-h-24 py-2", className)} {...props} />;
}

export function Selecao({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(base, "h-10 pr-8", className)} {...props} />;
}

type RotuloEErro = {
  rotulo: string;
  ajuda?: string;
  erro?: string;
};

function useLigacoes(id: string | undefined, { ajuda, erro }: Pick<RotuloEErro, "ajuda" | "erro">) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  // Com erro na tela, a dica sai: o erro já diz o que fazer.
  const mostrarAjuda = Boolean(ajuda) && !erro;
  const idAjuda = mostrarAjuda ? `${idCampo}-ajuda` : undefined;
  const idErro = erro ? `${idCampo}-erro` : undefined;
  return {
    idCampo,
    idAjuda,
    idErro,
    mostrarAjuda,
    descricao: [idErro, idAjuda].filter(Boolean).join(" ") || undefined,
  };
}

function Mensagens({
  ligacoes,
  ajuda,
  erro,
}: {
  ligacoes: ReturnType<typeof useLigacoes>;
} & Pick<RotuloEErro, "ajuda" | "erro">) {
  return (
    <>
      {erro ? (
        <p id={ligacoes.idErro} className="text-sm text-erro">
          {erro}
        </p>
      ) : null}
      {ligacoes.mostrarAjuda ? (
        <p id={ligacoes.idAjuda} className="text-sm text-texto-suave">
          {ajuda}
        </p>
      ) : null}
    </>
  );
}

// Rótulo + área de texto de várias linhas + ajuda + erro.
export function CampoTexto({
  rotulo,
  ajuda,
  erro,
  id,
  className,
  ...props
}: ComponentProps<"textarea"> & RotuloEErro) {
  const ligacoes = useLigacoes(id, { ajuda, erro });
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={ligacoes.idCampo} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <AreaTexto
        id={ligacoes.idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={ligacoes.descricao}
        {...props}
      />
      <Mensagens ligacoes={ligacoes} ajuda={ajuda} erro={erro} />
    </div>
  );
}

// Rótulo + lista de opções + ajuda + erro.
export function CampoSelecao({
  rotulo,
  ajuda,
  erro,
  id,
  className,
  children,
  ...props
}: ComponentProps<"select"> & RotuloEErro) {
  const ligacoes = useLigacoes(id, { ajuda, erro });
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={ligacoes.idCampo} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <Selecao
        id={ligacoes.idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={ligacoes.descricao}
        {...props}
      >
        {children}
      </Selecao>
      <Mensagens ligacoes={ligacoes} ajuda={ajuda} erro={erro} />
    </div>
  );
}
