import { BotaoEnviar } from "@/components/ui/botao-enviar";
import { Selecao } from "@/components/ui/campo-texto";
import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";
import { mudarEtapaDoLead } from "@/modules/leads/acoes";
import { ETAPAS_FUNIL, type EtapaFunil } from "@/modules/leads/tipos";

// Lista de etapas e botão para mover o lead. É um formulário comum: funciona
// sem JavaScript, pelo teclado e no celular, onde arrastar cartões é ruim.
export function FormularioEtapa({
  leadId,
  etapaAtual,
  rotulo,
  rotuloVisivel = false,
  rotuloBotao,
  className,
}: {
  leadId: string;
  etapaAtual: EtapaFunil;
  rotulo: string;
  // No quadro o rótulo fica só para leitores de tela, para não poluir o cartão.
  rotuloVisivel?: boolean;
  rotuloBotao: string;
  className?: string;
}) {
  const idCampo = `etapa-${leadId}`;
  // A chave recria o formulário quando a etapa muda. Sem ela, o React limpa o
  // formulário depois da ação e a lista volta para a etapa antiga, e um segundo
  // clique devolveria o lead para trás.
  return (
    <form
      key={etapaAtual}
      action={mudarEtapaDoLead}
      className={cn("flex flex-col gap-2", className)}
    >
      <input type="hidden" name="leadId" value={leadId} />
      <label
        htmlFor={idCampo}
        className={rotuloVisivel ? "text-sm font-medium text-texto" : "sr-only"}
      >
        {rotulo}
      </label>
      <div className="flex flex-wrap gap-2">
        <Selecao
          id={idCampo}
          name="etapa"
          defaultValue={etapaAtual}
          className="min-w-0 flex-1 basis-32"
        >
          {ETAPAS_FUNIL.map((etapa) => (
            <option key={etapa} value={etapa}>
              {ptBR.funil.etapas[etapa]}
            </option>
          ))}
        </Selecao>
        <BotaoEnviar variante="secundario">{rotuloBotao}</BotaoEnviar>
      </div>
    </form>
  );
}
