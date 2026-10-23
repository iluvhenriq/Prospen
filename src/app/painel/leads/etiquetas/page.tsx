import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormularioEtiqueta } from "@/components/leads/formulario-etiqueta";
import { Botao } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import {
  Cartao,
  CartaoCabecalho,
  CartaoConteudo,
  CartaoTitulo,
} from "@/components/ui/cartao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Etiqueta } from "@/components/ui/etiqueta";
import { ptBR } from "@/lib/i18n/pt-BR";
import { excluirEtiqueta } from "@/modules/leads/acoes";
import { obterEtiquetasDaEmpresa } from "@/modules/leads/consultas";
import { exigirContexto } from "@/modules/organizacoes/contexto";
import { papelPode } from "@/modules/organizacoes/membros";

export const metadata: Metadata = { title: ptBR.leads.etiquetasPagina.titulo };

async function ListaDeEtiquetas() {
  const contexto = await exigirContexto();
  const etiquetas = await obterEtiquetasDaEmpresa(contexto);
  const podeExcluir = papelPode(contexto.papel, "gerenciarEtiquetas");
  const t = ptBR.leads.etiquetasPagina;

  if (etiquetas.length === 0) {
    return <EstadoVazio titulo={t.vazioTitulo} descricao={t.vazioDescricao} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie">
        {etiquetas.map((etiqueta) => (
          <li
            key={etiqueta.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Etiqueta variante={etiqueta.cor}>{etiqueta.nome}</Etiqueta>
              {/* A contagem leva para a lista já filtrada por esta etiqueta. */}
              <Link
                href={`/painel/leads?etiqueta=${etiqueta.id}`}
                className="text-sm text-roxo-700 underline-offset-4 hover:underline"
              >
                {t.totalLeads(etiqueta.totalLeads)}
              </Link>
            </div>
            {podeExcluir ? (
              <form action={excluirEtiqueta} className="flex items-center gap-3">
                <input type="hidden" name="etiquetaId" value={etiqueta.id} />
                <span className="hidden text-xs text-texto-suave sm:inline">{t.excluirAviso}</span>
                <Botao type="submit" variante="fantasma" tamanho="pequeno">
                  {t.excluir}
                </Botao>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {!podeExcluir ? <p className="text-sm text-texto-suave">{t.soAdmin}</p> : null}
    </div>
  );
}

export default function PaginaEtiquetas() {
  const t = ptBR.leads.etiquetasPagina;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/painel/leads"
          className="text-sm font-medium text-roxo-700 underline-offset-4 hover:underline"
        >
          {ptBR.leads.voltarParaLista}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-musgo-800">{t.titulo}</h1>
        <p className="text-texto-suave">{t.descricao}</p>
      </header>

      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>{t.nova}</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoConteudo>
          <FormularioEtiqueta />
        </CartaoConteudo>
      </Cartao>

      <Suspense fallback={<Esqueleto className="h-40 w-full" />}>
        <ListaDeEtiquetas />
      </Suspense>
    </div>
  );
}
