import type { Metadata } from "next";
import { Suspense } from "react";
import { BotaoLink } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import {
  Cartao,
  CartaoCabecalho,
  CartaoConteudo,
  CartaoDescricao,
  CartaoTitulo,
} from "@/components/ui/cartao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { ptBR } from "@/lib/i18n/pt-BR";
import { exigirContexto } from "@/modules/organizacoes/contexto";
import { obterResumo } from "@/modules/painel/resumo";

export const metadata: Metadata = { title: ptBR.painel.titulo };

async function ConteudoPainel() {
  // Exige login e empresa. Quem ainda não criou a empresa vai para essa etapa.
  const contexto = await exigirContexto();
  const resumo = await obterResumo(contexto);
  const primeiroNome = contexto.usuario.nome.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-musgo-800">
          {ptBR.painel.saudacao(primeiroNome)}
        </h1>
        <p className="text-texto-suave">
          {ptBR.painel.empresa(contexto.organizacao.nome)}
        </p>
      </header>

      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>{ptBR.painel.leads}</CartaoTitulo>
          <CartaoDescricao>{ptBR.painel.leadsTotal(resumo.totalLeads)}</CartaoDescricao>
        </CartaoCabecalho>
        <CartaoConteudo>
          {resumo.totalLeads === 0 ? (
            <EstadoVazio
              titulo={ptBR.painel.leadsVazioTitulo}
              descricao={ptBR.painel.leadsVazioDescricao}
              acao={
                <div className="flex flex-wrap justify-center gap-3">
                  <BotaoLink href="/painel/leads/novo">{ptBR.leads.novo}</BotaoLink>
                  <BotaoLink href="/painel/leads/importar" variante="contorno">
                    {ptBR.leads.importar}
                  </BotaoLink>
                </div>
              }
            />
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-4">
              <p className="text-4xl font-semibold text-roxo-700">{resumo.totalLeads}</p>
              <BotaoLink href="/painel/leads" variante="contorno">
                {ptBR.painel.verLeads}
              </BotaoLink>
            </div>
          )}
        </CartaoConteudo>
      </Cartao>
    </div>
  );
}

function CarregandoPainel() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Esqueleto className="h-8 w-56" />
        <Esqueleto className="h-5 w-40" />
      </div>
      <Esqueleto className="h-64 w-full" />
    </div>
  );
}

export default function PaginaPainel() {
  return (
    <Suspense fallback={<CarregandoPainel />}>
      <ConteudoPainel />
    </Suspense>
  );
}
