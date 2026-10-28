import { Etiqueta } from "@/components/ui/etiqueta";
import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";
import { VALOR_DO_MOTIVO, type Faixa, type Motivo } from "@/modules/pontuacao/regras";

// Alta leva o marca-texto: é quem o vendedor contata primeiro.
const VARIANTE = { alta: "destaque", media: "andamento", baixa: "neutra" } as const;

// Faixa de prioridade do lead. O título (passar o mouse) mostra os pontos e os
// motivos: pontuação sem explicação o vendedor não usa.
export function SeloPontuacao({ pontos, faixa, motivos }: { pontos: number; faixa: Faixa; motivos: Motivo[] }) {
  const t = ptBR.pontuacao;
  return (
    <Etiqueta variante={VARIANTE[faixa]} title={`${t.pontos(pontos)}: ${textoDosMotivos(motivos)}`}>
      {t.faixas[faixa]}
    </Etiqueta>
  );
}

// A nota como primeira coluna das listas: o número em destaque e a faixa
// embaixo. Prioridade alta leva o marca-texto, como na página de apresentação.
export function NotaPontuacao({ pontos, faixa, motivos }: { pontos: number; faixa: Faixa; motivos: Motivo[] }) {
  const t = ptBR.pontuacao;
  return (
    <span className="flex items-baseline gap-2 lg:flex-col lg:items-start lg:gap-0.5" title={textoDosMotivos(motivos)}>
      <span
        className={cn(
          "numeros -mx-1 rounded-[3px] px-1 text-base font-bold leading-tight text-texto",
          faixa === "alta" && "bg-marca-texto text-tinta",
        )}
      >
        {pontos}
      </span>
      <span className="text-xs font-semibold text-texto-suave">{t.faixas[faixa]}</span>
    </span>
  );
}

// Primeira parcela sem sinal; as outras com "+" ou "−", como numa conta escrita.
function parcela(valor: number, posicao: number) {
  if (valor < 0) return `−${Math.abs(valor)}`;
  return posicao === 0 ? String(valor) : `+${valor}`;
}

// A conta da nota escrita como soma: cada motivo com o seu valor e, no fim, o
// total. É o mesmo desenho da página de apresentação.
export function ContaDaNota({ pontos, motivos, className }: { pontos: number; motivos: Motivo[]; className?: string }) {
  const t = ptBR.pontuacao;
  if (motivos.length === 0) return <p className="text-sm text-texto-suave">{t.semMotivos}</p>;
  return (
    <ol className={cn("grid grid-cols-3 gap-x-3 gap-y-3 rounded-[3px] bg-musgo-50/70 px-3 py-3", className)}>
      {motivos.map((motivo, posicao) => (
        <li key={motivo} className="flex flex-col gap-0.5">
          <span className="numeros text-base font-extrabold leading-tight text-texto">
            {parcela(VALOR_DO_MOTIVO[motivo], posicao)}
          </span>
          <span className="text-[0.7rem] leading-snug text-texto-suave">{t.motivos[motivo]}</span>
        </li>
      ))}
      <li className="flex flex-col gap-0.5 border-l-2 border-texto pl-3">
        <span className="numeros text-base font-extrabold leading-tight text-musgo-800">= {pontos}</span>
        <span className="text-[0.7rem] leading-snug text-texto-suave">{t.deCem}</span>
      </li>
    </ol>
  );
}

export function textoDosMotivos(motivos: Motivo[]): string {
  if (motivos.length === 0) return ptBR.pontuacao.semMotivos;
  return motivos.map((motivo) => ptBR.pontuacao.motivos[motivo]).join(", ");
}
