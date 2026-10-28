import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";
import { menorPlanoCom, type Recurso } from "@/modules/planos/planos";

// Aviso discreto no lugar de um recurso que o plano da empresa não tem.
// Só informa: a troca de plano é feita à mão, depois do pagamento.
export function AvisoDoPlano({ recurso, className }: { recurso: Recurso; className?: string }) {
  const t = ptBR.planos;
  const plano = menorPlanoCom(recurso);
  return (
    <p className={cn("rounded-controle border border-dashed border-borda px-4 py-3 text-sm text-texto-suave", className)}>
      {t.bloqueado(t.recursos[recurso], t.nomes[plano], plano === "grande")}
    </p>
  );
}
