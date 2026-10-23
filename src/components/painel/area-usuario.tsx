import { Botao } from "@/components/ui/botao";
import { Etiqueta } from "@/components/ui/etiqueta";
import { ptBR } from "@/lib/i18n/pt-BR";
import { sair } from "@/modules/contas/acoes";
import { exigirContexto } from "@/modules/organizacoes/contexto";

// Canto direito do cabeçalho: empresa, pessoa, papel e botão de sair.
// Lê a sessão, então precisa ficar dentro de um <Suspense>.
export async function AreaUsuario() {
  const { usuario, organizacao, papel } = await exigirContexto();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden max-w-56 text-right text-sm leading-tight sm:block">
        <p className="truncate font-medium text-texto">{organizacao.nome}</p>
        <p className="truncate text-texto-suave">{usuario.nome}</p>
      </div>
      <Etiqueta variante="musgo">{ptBR.papeis[papel]}</Etiqueta>
      <form action={sair}>
        <Botao type="submit" variante="contorno" tamanho="pequeno">
          {ptBR.navegacao.sair}
        </Botao>
      </form>
    </div>
  );
}
