import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Barras } from "@/components/painel/barras";
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
import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";
import { formatarValor } from "@/modules/leads/valor";
import { exigirContexto } from "@/modules/organizacoes/contexto";
import { DIAS_DE_LEADS_NOVOS, obterResumo } from "@/modules/painel/resumo";

export const metadata: Metadata = { title: ptBR.painel.titulo };

// Um número do relatório: rótulo, valor e uma linha de apoio. Ficam lado a
// lado na mesma folha, separados por linhas (não em cartões soltos).
function Numero({ rotulo, valor, apoio }: { rotulo: string; valor: string; apoio?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-superficie px-5 py-5">
      <p className="text-sm font-semibold text-texto-suave">{rotulo}</p>
      <p className="numeros text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-texto">{valor}</p>
      {apoio ? <p className="text-xs text-texto-suave">{apoio}</p> : null}
    </div>
  );
}

// Cabeçalho de uma parte do relatório: título à esquerda, atalho à direita.
function TituloParte({ titulo, descricao, atalho }: { titulo: string; descricao?: string; atalho?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div>
        <h2 className="text-base font-bold text-texto">{titulo}</h2>
        {descricao ? <p className="text-sm text-texto-suave">{descricao}</p> : null}
      </div>
      {atalho}
    </div>
  );
}

const classeAtalho = "text-sm font-semibold text-musgo-700 underline hover:text-musgo-900";

async function ConteudoPainel() {
  // Exige login e empresa. Quem ainda não criou a empresa vai para essa etapa.
  const contexto = await exigirContexto();
  const painel = await obterResumo(contexto);
  const primeiroNome = contexto.usuario.nome.split(" ")[0];
  const t = ptBR.painel;
  const ti = t.indicadores;
  const numero = (valor: number) => valor.toLocaleString("pt-BR");
  const encerrados = painel.ganhos + painel.perdidos;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-texto">{t.saudacao(primeiroNome)}</h1>
          <p className="text-texto-suave">{t.empresa(contexto.organizacao.nome)}</p>
        </div>
        {painel.total > 0 ? <BotaoLink href="/painel/busca">{ptBR.busca.titulo}</BotaoLink> : null}
      </header>

      {painel.total === 0 ? (
        <Cartao>
          <CartaoCabecalho>
            <CartaoTitulo>{t.leads}</CartaoTitulo>
            <CartaoDescricao>{t.leadsTotal(0)}</CartaoDescricao>
          </CartaoCabecalho>
          <CartaoConteudo>
            <EstadoVazio
              titulo={t.leadsVazioTitulo}
              descricao={t.leadsVazioDescricao}
              acao={
                <div className="flex flex-wrap justify-center gap-3">
                  <BotaoLink href="/painel/busca">{ptBR.busca.titulo}</BotaoLink>
                  <BotaoLink href="/painel/leads/novo" variante="contorno">
                    {ptBR.leads.novo}
                  </BotaoLink>
                  <BotaoLink href="/painel/leads/importar" variante="contorno">
                    {ptBR.leads.importar}
                  </BotaoLink>
                </div>
              }
            />
          </CartaoConteudo>
        </Cartao>
      ) : (
        <>
          {/* O relatório: uma folha só, dividida por linhas. */}
          <div className="overflow-hidden rounded-painel border border-borda bg-superficie">
            {/* As linhas entre os números são o fundo aparecendo no espaço de 1px. */}
            <div className="grid grid-cols-2 gap-px border-b border-borda bg-borda lg:grid-cols-4">
              <Numero
                rotulo={ti.total}
                valor={numero(painel.total)}
                apoio={ti.novos(DIAS_DE_LEADS_NOVOS) + `: ${numero(painel.novos)}`}
              />
              <Numero rotulo={ti.emAndamento} valor={numero(painel.emAndamento)} apoio={ti.emAndamentoAjuda} />
              <Numero
                rotulo={ti.conversao}
                valor={painel.taxaDeConversao === null ? "—" : `${painel.taxaDeConversao}%`}
                apoio={
                  painel.taxaDeConversao === null ? ti.conversaoSemDados : ti.conversaoAjuda(painel.ganhos, encerrados)
                }
              />
              {painel.vendas.length === 0 ? (
                <Numero rotulo={ti.vendido} valor="—" apoio={ti.vendidoSemDados} />
              ) : (
                painel.vendas.map((venda) => (
                  <Numero
                    key={venda.moeda}
                    rotulo={ti.vendido}
                    valor={formatarValor(venda.centavos, venda.moeda)}
                    apoio={`${ti.vendidoAjuda(venda.vendas)}. ${ti.ticketMedio(formatarValor(venda.ticketMedioCentavos, venda.moeda))}`}
                  />
                ))
              )}
            </div>

            {/* O funil como a sequência que ele é. */}
            <div className="flex flex-col gap-4 border-b border-borda px-5 py-5">
              <TituloParte
                titulo={ti.funilTitulo}
                descricao={ti.funilDescricao}
                atalho={
                  <Link href="/painel/funil" className={classeAtalho}>
                    {t.verFunil}
                  </Link>
                }
              />
              <ol className="grid grid-cols-3 gap-px overflow-hidden rounded-controle border border-borda bg-borda sm:grid-cols-6">
                {painel.funil.map((linha) => (
                  <li
                    key={linha.etapa}
                    className={cn(
                      "flex flex-col gap-0.5 px-3 py-3",
                      linha.etapa === "ganho" ? "bg-acao text-acao-texto" : "bg-superficie",
                    )}
                  >
                    <span className={cn("numeros text-xl font-bold leading-none", linha.etapa !== "ganho" && "text-texto")}>
                      {numero(linha.total)}
                    </span>
                    <span className={cn("text-xs font-semibold", linha.etapa === "ganho" ? "text-acao-texto/80" : "text-texto-suave")}>
                      {ptBR.funil.etapas[linha.etapa]}
                    </span>
                  </li>
                ))}
              </ol>
              {painel.ganhosSemValor > 0 ? (
                <p className="text-sm text-texto-suave">{ti.ganhosSemValor(painel.ganhosSemValor)}</p>
              ) : null}
            </div>

            <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-borda">
              <div className="flex flex-col gap-4 border-b border-borda px-5 py-5 lg:border-b-0">
                <TituloParte titulo={ti.motivosTitulo} />
                {painel.perdidos === 0 ? (
                  <p className="text-sm text-texto-suave">{ti.motivosVazio}</p>
                ) : (
                  <Barras
                    titulo={ti.motivosTitulo}
                    linhas={painel.motivos.map((linha) => ({
                      rotulo: linha.motivo
                        ? ptBR.funil.resultado.motivos[linha.motivo]
                        : ptBR.funil.resultado.motivoNaoInformado,
                      total: linha.total,
                    }))}
                  />
                )}
              </div>
              <div className="flex flex-col gap-4 px-5 py-5">
                <TituloParte
                  titulo={ti.origensTitulo}
                  atalho={
                    <Link href="/painel/leads" className={classeAtalho}>
                      {t.verLeads}
                    </Link>
                  }
                />
                <Barras
                  titulo={ti.origensTitulo}
                  linhas={painel.origens.map((linha) => ({
                    rotulo: ptBR.leads.origens[linha.origem as keyof typeof ptBR.leads.origens] ?? linha.origem,
                    total: linha.total,
                  }))}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-texto-suave">{ti.nota}</p>
        </>
      )}
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Esqueleto className="h-28 w-full" />
        <Esqueleto className="h-28 w-full" />
        <Esqueleto className="h-28 w-full" />
        <Esqueleto className="h-28 w-full" />
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
