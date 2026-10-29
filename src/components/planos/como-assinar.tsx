import { ptBR } from "@/lib/i18n/pt-BR";
import { VENDAS } from "@/lib/vendas";
import { PLANOS, REGRAS } from "@/modules/planos/planos";

function preco(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(centavos / 100);
}

// Passo a passo para assinar enquanto o pagamento é manual (src/lib/vendas.ts).
// O e-mail da conta vai no comprovante: é por ele que o plano é liberado.
export function ComoAssinar({ emailDaConta }: { emailDaConta: string }) {
  const t = ptBR.planos.comoAssinar;
  const precos = PLANOS.map((plano) => `${ptBR.planos.nomes[plano]} ${preco(REGRAS[plano].precoCentavos)}`).join(", ");
  const assunto = encodeURIComponent(t.assunto);
  const corpo = encodeURIComponent(t.corpo(emailDaConta));
  return (
    <div id="assinar" className="flex scroll-mt-6 flex-col gap-3 rounded-painel border border-borda bg-superficie px-5 py-4">
      <h2 className="font-bold text-texto">{t.titulo}</h2>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-texto">
        {t.passos(precos, VENDAS.chavePix, VENDAS.emailComprovante, emailDaConta).map((passo) => (
          <li key={passo}>{passo}</li>
        ))}
      </ol>
      <a
        href={`mailto:${VENDAS.emailComprovante}?subject=${assunto}&body=${corpo}`}
        className="self-start text-sm font-semibold text-musgo-700 underline underline-offset-4 hover:text-musgo-900"
      >
        {t.botao}
      </a>
    </div>
  );
}
