import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormularioCampanha } from "@/components/campanhas/formulario-campanha";
import { Esqueleto } from "@/components/ui/carregando";
import { Cartao, CartaoConteudo } from "@/components/ui/cartao";
import { ptBR } from "@/lib/i18n/pt-BR";
import { criarCampanha } from "@/modules/campanhas/acoes";
import { obterMoedaDaEmpresa } from "@/modules/campanhas/consultas";
import { exigirContexto } from "@/modules/organizacoes/contexto";

export const metadata: Metadata = { title: ptBR.campanhas.nova };

async function FormularioNovaCampanha() {
  const contexto = await exigirContexto();
  const moeda = await obterMoedaDaEmpresa(contexto);
  return <FormularioCampanha acao={criarCampanha} moeda={moeda} rotuloBotao={ptBR.campanhas.criar} />;
}

export default function PaginaNovaCampanha() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/painel/campanhas" className="text-sm font-medium text-roxo-700 underline-offset-4 hover:underline">
          {ptBR.campanhas.voltar}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-musgo-800">{ptBR.campanhas.nova}</h1>
        <p className="text-texto-suave">{ptBR.campanhas.descricao}</p>
      </header>
      <Cartao>
        <CartaoConteudo>
          <Suspense fallback={<Esqueleto className="h-80 w-full" />}>
            <FormularioNovaCampanha />
          </Suspense>
        </CartaoConteudo>
      </Cartao>
    </div>
  );
}
