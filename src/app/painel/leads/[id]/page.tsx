import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CampanhasDoLead } from "@/components/campanhas/campanhas-do-lead";
import { FormularioEtapa } from "@/components/funil/formulario-etapa";
import { FormularioResultado } from "@/components/funil/formulario-resultado";
import { HistoricoEtapas } from "@/components/funil/historico-etapas";
import { SeloEtapa } from "@/components/funil/selo-etapa";
import { EtiquetasLead } from "@/components/leads/etiquetas-lead";
import { FormularioLead } from "@/components/leads/formulario-lead";
import { textoDoLead } from "@/components/leads/nome-do-lead";
import { ContaDaNota, NotaPontuacao } from "@/components/pontuacao/selo-pontuacao";
import { NotasLead } from "@/components/leads/notas-lead";
import { Alerta } from "@/components/ui/alerta";
import { Botao } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import {
  Cartao,
  CartaoCabecalho,
  CartaoConteudo,
  CartaoDescricao,
  CartaoTitulo,
} from "@/components/ui/cartao";
import { formatarData, formatarDataHora } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterCampanhasDoLead } from "@/modules/campanhas/consultas";
import { atualizarLead, excluirLead } from "@/modules/leads/acoes";
import { formatarCnpj } from "@/modules/leads/cnpj";
import { obterDetalheDoLead } from "@/modules/leads/consultas";
import { exigirContexto } from "@/modules/organizacoes/contexto";
import { pontuar } from "@/modules/pontuacao/regras";
import { papelPode } from "@/modules/organizacoes/membros";

export const metadata: Metadata = { title: ptBR.leads.detalhe.dados };

async function ConteudoDoLead({
  params,
}: {
  params: PageProps<"/painel/leads/[id]">["params"];
}) {
  const { id } = await params;
  const contexto = await exigirContexto();
  const detalhe = await obterDetalheDoLead(contexto, id);
  // Identificador inválido, lead apagado ou de outra empresa: a resposta é a mesma.
  if (!detalhe) notFound();

  const { lead } = detalhe;
  const t = ptBR.leads;
  const pontuacao = pontuar(lead);
  const campanhas = await obterCampanhasDoLead(contexto, lead.id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/painel/leads"
          className="text-sm font-medium text-musgo-700 underline-offset-4 hover:underline"
        >
          {t.voltarParaLista}
        </Link>
        <h1 className="break-words text-2xl font-bold tracking-[-0.02em] text-texto">
          {textoDoLead(lead.nome, lead.origem)}
        </h1>
        <p className="text-sm text-texto-suave">
          {t.origens[lead.origem]}
          {", "}
          {t.detalhe.criadoEm(formatarDataHora(lead.criadoEm, detalhe.fusoHorario))}
          {lead.cnpj ? `, ${t.detalhe.cnpj(formatarCnpj(lead.cnpj))}` : null}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>{t.detalhe.dados}</CartaoTitulo>
            </CartaoCabecalho>
            <CartaoConteudo className="flex flex-col gap-4">
              {(["email", "telefone"] as const)
                .filter((campo) => detalhe.compartilhado[campo] > 0)
                .map((campo) => (
                  <Alerta key={campo} variante="aviso">
                    {t.detalhe.contatoCompartilhado(campo, detalhe.compartilhado[campo])}{" "}
                    <Link
                      href={`/painel/leads?q=${encodeURIComponent((campo === "email" ? lead.emailNormalizado : lead.telefoneNormalizado) ?? "")}`}
                      className="font-medium underline underline-offset-4"
                    >
                      {t.detalhe.verCompartilhados}
                    </Link>
                  </Alerta>
                ))}
              <FormularioLead
                acao={atualizarLead}
                lead={lead}
                paisPadrao={lead.pais}
                rotuloBotao={t.formulario.salvar}
              />
            </CartaoConteudo>
          </Cartao>

          {/* <details> funciona sem JavaScript e pede uma segunda decisão antes de excluir. */}
          <details className="rounded-painel border border-erro-borda bg-erro-fundo p-4">
            <summary className="cursor-pointer text-sm font-medium text-erro">
              {t.detalhe.excluirTitulo}
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-sm text-erro">{t.detalhe.excluirAviso}</p>
              <form action={excluirLead}>
                <input type="hidden" name="id" value={lead.id} />
                <Botao type="submit" variante="perigo" tamanho="pequeno">
                  {t.detalhe.excluirBotao}
                </Botao>
              </form>
            </div>
          </details>
        </div>

        <div className="flex flex-col gap-6">
          <Cartao>
            <CartaoCabecalho className="flex-row items-start justify-between gap-4">
              <CartaoTitulo>{ptBR.pontuacao.titulo}</CartaoTitulo>
              <NotaPontuacao {...pontuacao} />
            </CartaoCabecalho>
            <CartaoConteudo className="flex flex-col gap-2 text-sm text-texto-suave">
              <ContaDaNota pontos={pontuacao.pontos} motivos={pontuacao.motivos} />
              {lead.cnpj ? null : <p className="text-xs">{ptBR.pontuacao.semDadosDaReceita}</p>}
            </CartaoConteudo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>{ptBR.funil.cartaoTitulo}</CartaoTitulo>
            </CartaoCabecalho>
            <CartaoConteudo className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-texto-suave">{ptBR.funil.etapaAtual}</span>
                <SeloEtapa etapa={lead.etapa} />
                <span className="text-xs text-texto-suave">
                  {ptBR.funil.desde(formatarData(lead.etapaAtualizadaEm, detalhe.fusoHorario))}
                </span>
              </div>
              <FormularioEtapa
                leadId={lead.id}
                etapaAtual={lead.etapa}
                rotulo={ptBR.funil.mudarPara}
                rotuloVisivel
                rotuloBotao={ptBR.funil.salvarEtapa}
              />
              <FormularioResultado
                leadId={lead.id}
                etapa={lead.etapa}
                motivoPerda={lead.motivoPerda}
                valorCentavos={lead.valorVendaCentavos}
                moeda={lead.moedaVenda ?? detalhe.moeda}
              />
              <HistoricoEtapas
                historico={detalhe.historico}
                criadoEm={lead.criadoEm}
                fusoHorario={detalhe.fusoHorario}
              />
            </CartaoConteudo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>{ptBR.campanhas.doLeadTitulo}</CartaoTitulo>
            </CartaoCabecalho>
            <CartaoConteudo>
              <CampanhasDoLead
                leadId={lead.id}
                doLead={campanhas.doLead.map(({ id, nome }) => ({ id, nome }))}
                ativas={campanhas.ativas.map(({ id, nome }) => ({ id, nome }))}
              />
            </CartaoConteudo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>{t.etiquetasDoLead.titulo}</CartaoTitulo>
            </CartaoCabecalho>
            <CartaoConteudo>
              <EtiquetasLead
                leadId={lead.id}
                etiquetas={detalhe.etiquetas}
                disponiveis={detalhe.etiquetasDisponiveis}
              />
            </CartaoConteudo>
          </Cartao>

          <Cartao>
            <CartaoCabecalho>
              <CartaoTitulo>{t.notas.titulo}</CartaoTitulo>
              <CartaoDescricao>{detalhe.notas.length > 0 ? `${detalhe.notas.length}` : ""}</CartaoDescricao>
            </CartaoCabecalho>
            <CartaoConteudo>
              <NotasLead
                leadId={lead.id}
                notas={detalhe.notas}
                fusoHorario={detalhe.fusoHorario}
                usuarioId={contexto.usuario.id}
                podeApagarQualquer={papelPode(contexto.papel, "gerenciarEquipe")}
              />
            </CartaoConteudo>
          </Cartao>
        </div>
      </div>
    </div>
  );
}

function CarregandoLead() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Esqueleto className="h-4 w-32" />
        <Esqueleto className="h-8 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Esqueleto className="h-96 w-full" />
        <Esqueleto className="h-96 w-full" />
      </div>
    </div>
  );
}

export default function PaginaDoLead(props: PageProps<"/painel/leads/[id]">) {
  return (
    <Suspense fallback={<CarregandoLead />}>
      <ConteudoDoLead params={props.params} />
    </Suspense>
  );
}
