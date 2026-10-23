import type { Metadata } from "next";
import { Suspense } from "react";
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
import { ptBR } from "@/lib/i18n/pt-BR";
import { formatarValor } from "@/modules/leads/valor";
import { exigirContexto } from "@/modules/organizacoes/contexto";
import { DIAS_DE_LEADS_NOVOS, obterResumo } from "@/modules/painel/resumo";

export const metadata: Metadata = { title: ptBR.painel.titulo };

// Número em destaque com um rótulo e uma linha de apoio. Um número sozinho não
// precisa de gráfico.
function Destaque({ rotulo, valor, apoio }: { rotulo: string; valor: string; apoio?: string }) {
  return (
    <Cartao>
      <CartaoConteudo className="flex flex-col gap-1">
        <p className="text-sm text-texto-suave">{rotulo}</p>
        <p className="text-3xl font-semibold tabular-nums text-musgo-800">{valor}</p>
        {apoio ? <p className="text-xs text-texto-suave">{apoio}</p> : null}
      </CartaoConteudo>
    </Cartao>
  );
}

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
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-musgo-800">{t.saudacao(primeiroNome)}</h1>
        <p className="text-texto-suave">{t.empresa(contexto.organizacao.nome)}</p>
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Destaque
              rotulo={ti.total}
              valor={numero(painel.total)}
              apoio={ti.novos(DIAS_DE_LEADS_NOVOS) + `: ${numero(painel.novos)}`}
            />
            <Destaque rotulo={ti.emAndamento} valor={numero(painel.emAndamento)} apoio={ti.emAndamentoAjuda} />
            <Destaque
              rotulo={ti.conversao}
              valor={painel.taxaDeConversao === null ? "—" : `${painel.taxaDeConversao}%`}
              apoio={
                painel.taxaDeConversao === null ? ti.conversaoSemDados : ti.conversaoAjuda(painel.ganhos, encerrados)
              }
            />
            {painel.vendas.length === 0 ? (
              <Destaque rotulo={ti.vendido} valor="—" apoio={ti.vendidoSemDados} />
            ) : (
              painel.vendas.map((venda) => (
                <Destaque
                  key={venda.moeda}
                  rotulo={ti.vendido}
                  valor={formatarValor(venda.centavos, venda.moeda)}
                  apoio={`${ti.vendidoAjuda(venda.vendas)}. ${ti.ticketMedio(formatarValor(venda.ticketMedioCentavos, venda.moeda))}`}
                />
              ))
            )}
          </div>

          {painel.ganhosSemValor > 0 ? (
            <p className="text-sm text-texto-suave">{ti.ganhosSemValor(painel.ganhosSemValor)}</p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>{ti.funilTitulo}</CartaoTitulo>
                <CartaoDescricao>{ti.funilDescricao}</CartaoDescricao>
              </CartaoCabecalho>
              <CartaoConteudo className="flex flex-col gap-4">
                <Barras
                  titulo={ti.funilTitulo}
                  linhas={painel.funil.map((linha) => ({
                    rotulo: ptBR.funil.etapas[linha.etapa],
                    total: linha.total,
                  }))}
                />
                <div>
                  <BotaoLink href="/painel/funil" variante="contorno" tamanho="pequeno">
                    {t.verFunil}
                  </BotaoLink>
                </div>
              </CartaoConteudo>
            </Cartao>

            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>{ti.motivosTitulo}</CartaoTitulo>
              </CartaoCabecalho>
              <CartaoConteudo>
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
              </CartaoConteudo>
            </Cartao>

            <Cartao>
              <CartaoCabecalho>
                <CartaoTitulo>{ti.origensTitulo}</CartaoTitulo>
              </CartaoCabecalho>
              <CartaoConteudo className="flex flex-col gap-4">
                <Barras
                  titulo={ti.origensTitulo}
                  linhas={painel.origens.map((linha) => ({
                    rotulo: ptBR.leads.origens[linha.origem as keyof typeof ptBR.leads.origens] ?? linha.origem,
                    total: linha.total,
                  }))}
                />
                <div>
                  <BotaoLink href="/painel/leads" variante="contorno" tamanho="pequeno">
                    {t.verLeads}
                  </BotaoLink>
                </div>
              </CartaoConteudo>
            </Cartao>
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
