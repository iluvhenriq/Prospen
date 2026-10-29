import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FiltrosBusca } from "@/components/busca/filtros-busca";
import { ResultadosBusca } from "@/components/busca/resultados-busca";
import { VigiarBusca } from "@/components/busca/vigiar-busca";
import { AvisoDoPlano } from "@/components/planos/aviso-do-plano";
import { Alerta } from "@/components/ui/alerta";
import { BotaoLink } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterTelaDeBusca } from "@/modules/base-cnpj/busca";
import { obterUsoDoMes, temRecurso } from "@/modules/planos/acesso";
import { obterClienteIdeal } from "@/modules/pontuacao/cliente-ideal";
import { enderecoDaBusca, lerParametrosBusca } from "@/modules/base-cnpj/parametros";
import { MAXIMO_DE_ATIVIDADES } from "@/modules/base-cnpj/repositorio";
import { exigirContexto } from "@/modules/organizacoes/contexto";

export const metadata: Metadata = { title: ptBR.busca.titulo };

async function ConteudoBusca({ searchParams }: { searchParams: PageProps<"/painel/busca">["searchParams"] }) {
  const contexto = await exigirContexto();
  const parametros = lerParametrosBusca(await searchParams);
  const [tela, perfil, vigia, uso] = await Promise.all([
    obterTelaDeBusca(contexto, parametros),
    obterClienteIdeal(contexto),
    temRecurso(contexto, "buscasVigiadas"),
    obterUsoDoMes(contexto),
  ]);
  const t = ptBR.busca;

  if (tela.estados.length === 0) {
    return <EstadoVazio titulo={t.semBaseTitulo} descricao={t.semBaseDescricao} />;
  }

  const mes = tela.estados.find((estado) => estado.uf === parametros.uf)?.mesReferencia;

  return (
    <div className="flex flex-col gap-5">
      <FiltrosBusca parametros={parametros} estados={tela.estados} municipios={tela.municipios} />

      {tela.vigia.pode && parametros.uf && !vigia ? (
        <AvisoDoPlano recurso="buscasVigiadas" />
      ) : tela.vigia.pode && parametros.uf ? (
        <VigiarBusca
          uf={parametros.uf}
          cidade={parametros.municipio ?? ""}
          atividade={parametros.atividade}
          incluirMei={parametros.incluirMei}
          vigiadaId={tela.vigia.id}
        />
      ) : null}

      {tela.atividades && tela.atividades.length > 0 ? (
        <div className="text-sm text-texto-suave">
          <p>{t.atividadesUsadas(tela.atividades.length)}</p>
          <p className="line-clamp-2">{tela.atividades.map((atividade) => atividade.descricao).join("; ")}</p>
          {tela.atividades.length >= MAXIMO_DE_ATIVIDADES ? <p>{t.atividadesNoLimite}</p> : null}
        </div>
      ) : null}

      {tela.limiteAtingido !== null ? (
        <Alerta variante="aviso">{t.limiteDiario(tela.limiteAtingido)}</Alerta>
      ) : parametros.cnpjDigitado && !parametros.cnpj ? (
        <Alerta variante="aviso">{t.cnpjInvalido(parametros.cnpjDigitado)}</Alerta>
      ) : !tela.buscou ? (
        <EstadoVazio titulo={t.escolhaEstadoTitulo} descricao={t.escolhaEstadoDescricao} />
      ) : tela.atividades && tela.atividades.length === 0 ? (
        <Alerta variante="aviso">{t.atividadeNaoEncontrada(parametros.atividade)}</Alerta>
      ) : tela.resultados.length === 0 && parametros.cnpj ? (
        <EstadoVazio titulo={t.cnpjNaoEncontradoTitulo} descricao={t.cnpjNaoEncontradoDescricao} />
      ) : tela.resultados.length === 0 ? (
        <EstadoVazio
          titulo={t.semResultadoTitulo}
          descricao={t.semResultadoDescricao}
          acao={
            parametros.depoisDe ? (
              <BotaoLink href={enderecoDaBusca(parametros)} variante="contorno">
                {t.voltarAoInicio}
              </BotaoLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-texto-suave" aria-live="polite">
            {t.mostrando(tela.resultados.length)}. {ptBR.pontuacao.ordemDaBusca}
          </p>
          {uso.limite !== null && uso.usadas >= uso.limite ? (
            <Alerta variante="aviso">
              {ptBR.planos.limiteDoMesAtingido(uso.limite, uso.semPagamento)}
              {uso.semPagamento ? (
                <>
                  {" "}
                  <Link href="/painel/equipe#assinar" className="font-semibold underline">
                    {ptBR.planos.comoAssinar.link}
                  </Link>
                </>
              ) : null}
            </Alerta>
          ) : (
            <p className="text-sm text-texto-suave">
              {ptBR.planos.usoDoMes(uso.usadas, uso.limite)}
              {uso.semPagamento && uso.limite !== null ? (
                <>
                  {` ${ptBR.planos.semPagamento(uso.limite)} `}
                  <Link href="/painel/equipe#assinar" className="font-semibold text-musgo-700 underline hover:text-musgo-900">
                    {ptBR.planos.comoAssinar.link}
                  </Link>
                </>
              ) : null}
            </p>
          )}
          {/* A chave troca a cada página: a marcação não passa de uma página para outra. */}
          <p className="text-sm text-texto-suave">
            {perfil ? ptBR.clienteIdeal.marcadasNaBusca : ptBR.clienteIdeal.semPerfilNaBusca}{" "}
            <Link href="/painel/cliente-ideal" className="font-semibold text-musgo-700 underline hover:text-musgo-900">
              {perfil ? ptBR.clienteIdeal.mudar : ptBR.clienteIdeal.definir}
            </Link>
            {perfil?.idade === "estabelecidas" ? <span className="block">{ptBR.clienteIdeal.contraOrdemGeral}</span> : null}
          </p>
          <ResultadosBusca
            perfil={perfil}
            key={`${parametros.depoisDe?.cnpj ?? ""}-${tela.resultados[0].cnpj}`}
            resultados={tela.resultados}
            jaSaoLeads={[...tela.jaSaoLeads]}
            campanhasAtivas={tela.campanhasAtivas}
          />
          <div className="flex flex-wrap gap-2">
            {parametros.depoisDe ? (
              <BotaoLink href={enderecoDaBusca(parametros)} variante="fantasma">
                {t.voltarAoInicio}
              </BotaoLink>
            ) : null}
            {tela.proximo ? (
              <BotaoLink href={enderecoDaBusca(parametros, tela.proximo)} variante="contorno">
                {t.proxima}
              </BotaoLink>
            ) : null}
          </div>
        </>
      )}

      {mes ? <p className="text-xs text-texto-suave">{t.origemDosDados(mes)}</p> : null}
    </div>
  );
}

function CarregandoBusca() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <Esqueleto className="h-24 w-full" />
      <Esqueleto className="h-96 w-full" />
    </div>
  );
}

export default function PaginaBusca(props: PageProps<"/painel/busca">) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-texto">{ptBR.busca.titulo}</h1>
        <p className="max-w-2xl text-sm text-texto-suave">{ptBR.busca.descricao}</p>
      </header>
      <Suspense fallback={<CarregandoBusca />}>
        <ConteudoBusca searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
