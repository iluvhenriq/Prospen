import { BotaoLink } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";

// Lead ou campanha que não existe (ou é de outra empresa) dentro do painel.
// Fica dentro da moldura do painel, então o menu continua à mão.
// O código da resposta é 200, não 404: a página já começou a ser enviada quando
// a consulta termina (efeito do cacheComponents; o Next.js acrescenta noindex).
// Decisão de 23/10/2026 em docs/arquitetura.md.
export default function NaoEncontradoNoPainel() {
  const t = ptBR.naoEncontrado;
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-borda-campo px-6 py-12 text-center">
      <h1 className="text-lg font-semibold text-texto">{t.painelTitulo}</h1>
      <p className="max-w-sm text-sm text-texto-suave">{t.painelDescricao}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <BotaoLink href="/painel/leads">{t.verLeads}</BotaoLink>
        <BotaoLink href="/painel/campanhas" variante="contorno">
          {t.verCampanhas}
        </BotaoLink>
      </div>
    </div>
  );
}
