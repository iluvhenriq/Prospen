import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormularioImportar } from "@/components/leads/formulario-importar";
import { Esqueleto } from "@/components/ui/carregando";
import {
  Cartao,
  CartaoCabecalho,
  CartaoConteudo,
  CartaoTitulo,
} from "@/components/ui/cartao";
import { formatarDataHora } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterHistoricoDeImportacoes } from "@/modules/leads/consultas";
import { exigirContexto } from "@/modules/organizacoes/contexto";

export const metadata: Metadata = { title: ptBR.leads.importacao.titulo };

async function HistoricoDeImportacoes() {
  const contexto = await exigirContexto();
  const { importacoes, fusoHorario } = await obterHistoricoDeImportacoes(contexto);
  const t = ptBR.leads.importacao;

  return (
    <Cartao>
      <CartaoCabecalho>
        <CartaoTitulo>{t.historicoTitulo}</CartaoTitulo>
      </CartaoCabecalho>
      <CartaoConteudo>
        {importacoes.length === 0 ? (
          <p className="text-sm text-texto-suave">{t.historicoVazio}</p>
        ) : (
          <ul className="divide-y divide-borda">
            {importacoes.map((importacao) => (
              <li key={importacao.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <p className="break-all font-medium text-texto">{importacao.nomeArquivo}</p>
                <p className="text-sm text-texto-suave">
                  {formatarDataHora(importacao.criadoEm, fusoHorario)}
                  {", "}
                  {t.historicoResumo(
                    importacao.aceitas,
                    importacao.duplicadas,
                    importacao.rejeitadas,
                  )}
                </p>
                {importacao.ocorrencias.length > 0 ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium text-roxo-700">
                      {t.verProblemas}
                    </summary>
                    <ul className="mt-2 flex max-h-56 flex-col gap-1 overflow-auto text-texto-suave">
                      {importacao.ocorrencias.map((ocorrencia) => (
                        <li key={`${ocorrencia.linha}-${ocorrencia.tipo}`}>
                          {t.linha} {ocorrencia.linha}: {ocorrencia.motivo}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CartaoConteudo>
    </Cartao>
  );
}

export default function PaginaImportar() {
  const t = ptBR.leads.importacao;
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

      <FormularioImportar />

      <Cartao>
        <CartaoCabecalho>
          <CartaoTitulo>{t.comoPrepararTitulo}</CartaoTitulo>
        </CartaoCabecalho>
        <CartaoConteudo>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-texto-suave">
            {t.comoPreparar.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CartaoConteudo>
      </Cartao>

      <Suspense fallback={<Esqueleto className="h-40 w-full" />}>
        <HistoricoDeImportacoes />
      </Suspense>
    </div>
  );
}
