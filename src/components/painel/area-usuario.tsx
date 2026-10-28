import Link from "next/link";
import { Botao } from "@/components/ui/botao";
import { ptBR } from "@/lib/i18n/pt-BR";
import { sair } from "@/modules/contas/acoes";
import { exigirContexto } from "@/modules/organizacoes/contexto";
import { obterPlano } from "@/modules/planos/acesso";

// Empresa, plano, pessoa, papel e botão de sair. A empresa leva à tela de equipe e plano. "lateral": pé da coluna da esquerda,
// no computador. "topo": canto direito da barra, no celular.
// Lê a sessão, então precisa ficar dentro de um <Suspense>.
export async function AreaUsuario({ forma }: { forma: "lateral" | "topo" }) {
  const contexto = await exigirContexto();
  const { usuario, organizacao, papel } = contexto;
  const { plano } = await obterPlano(contexto);

  const botaoSair = (
    <form action={sair}>
      <Botao
        type="submit"
        variante="fantasma"
        tamanho="pequeno"
        className="text-musgo-100 ring-1 ring-inset ring-mesa-linha hover:bg-mesa-clara hover:text-white"
      >
        {ptBR.navegacao.sair}
      </Botao>
    </form>
  );

  if (forma === "topo") {
    return (
      <div className="flex items-center gap-3">
        <Link href="/painel/equipe" className="max-w-36 truncate text-sm font-medium text-musgo-100 hover:text-white">
          {organizacao.nome}
        </Link>
        {botaoSair}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-mesa-linha pt-4">
      <div className="min-w-0 px-1 text-sm leading-snug">
        <p className="truncate font-semibold text-white">{organizacao.nome}</p>
        <p className="truncate text-musgo-200">
          {usuario.nome}, {ptBR.papeis[papel].toLocaleLowerCase("pt-BR")}
        </p>
        <Link href="/painel/equipe" className="mt-1 inline-block text-musgo-200 underline hover:text-white">
          {ptBR.planos.seuPlano(ptBR.planos.nomes[plano])} · {ptBR.equipe.titulo}
        </Link>
      </div>
      {botaoSair}
    </div>
  );
}
