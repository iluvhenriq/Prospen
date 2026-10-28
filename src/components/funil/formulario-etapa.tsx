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
  compacto = false,
  className,
}: {
  leadId: string;
  etapaAtual: EtapaFunil;
  rotulo: string;
  // No quadro o rótulo fica só para leitores de tela, para não poluir o cartão.
  rotuloVisivel?: boolean;
  rotuloBotao: string;
  // No quadro: lista e botão menores, na mesma linha, para o lead aparecer mais que o controle.
  compacto?: boolean;
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
      <div className={cn("flex gap-2", compacto ? "flex-nowrap" : "flex-wrap")}>
        <Selecao
          id={idCampo}
          name="etapa"
          defaultValue={etapaAtual}
          className={cn("min-w-0 flex-1", compacto ? "h-8 basis-0 px-2 sm:text-xs" : "basis-32")}
        >
          {ETAPAS_FUNIL.map((etapa) => (
            <option key={etapa} value={etapa}>
              {ptBR.funil.etapas[etapa]}
            </option>
          ))}
        </Selecao>
        <BotaoEnviar variante="secundario" tamanho={compacto ? "pequeno" : "medio"}>
          {rotuloBotao}
        </BotaoEnviar>
      </div>
    </form>
  );
}
