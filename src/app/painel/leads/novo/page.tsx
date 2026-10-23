import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormularioLead } from "@/components/leads/formulario-lead";
import { Esqueleto } from "@/components/ui/carregando";
import { Cartao, CartaoConteudo } from "@/components/ui/cartao";
import { ptBR } from "@/lib/i18n/pt-BR";
import { criarLead } from "@/modules/leads/acoes";
import { obterPaisPadrao } from "@/modules/leads/consultas";
import { exigirContexto } from "@/modules/organizacoes/contexto";

export const metadata: Metadata = { title: ptBR.leads.novoPagina.titulo };

async function FormularioNovoLead() {
  const contexto = await exigirContexto();
  const paisPadrao = await obterPaisPadrao(contexto);
  return (
    <FormularioLead
      acao={criarLead}
      paisPadrao={paisPadrao}
      rotuloBotao={ptBR.leads.formulario.criar}
    />
  );
}

export default function PaginaNovoLead() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/painel/leads"
          className="text-sm font-medium text-roxo-700 underline-offset-4 hover:underline"
        >
          {ptBR.leads.voltarParaLista}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-musgo-800">
          {ptBR.leads.novoPagina.titulo}
        </h1>
        <p className="text-texto-suave">{ptBR.leads.novoPagina.descricao}</p>
      </header>
      <Cartao>
        <CartaoConteudo>
          <Suspense fallback={<Esqueleto className="h-80 w-full" />}>
            <FormularioNovoLead />
          </Suspense>
        </CartaoConteudo>
      </Cartao>
    </div>
  );
}
