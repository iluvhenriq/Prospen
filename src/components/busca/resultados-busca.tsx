"use client";

import { useActionState, useState } from "react";
import { Alerta } from "@/components/ui/alerta";
import { Botao, BotaoLink } from "@/components/ui/botao";
import { Etiqueta } from "@/components/ui/etiqueta";
import { ptBR } from "@/lib/i18n/pt-BR";
import { adicionarDaBusca, type EstadoAdicionar } from "@/modules/base-cnpj/acoes";
import type { ResultadoDaBusca } from "@/modules/base-cnpj/repositorio";
import { formatarCnpj } from "@/modules/leads/cnpj";
import { formatarTelefone } from "@/modules/leads/normalizacao";

const inicial: EstadoAdicionar = {};

// Lista de empresas achadas, com marcação para virar lead. Quem já é lead da
// empresa aparece marcado como tal e não pode ser marcado de novo.
export function ResultadosBusca({
  resultados,
  jaSaoLeads,
}: {
  resultados: ResultadoDaBusca[];
  jaSaoLeads: string[];
}) {
  const t = ptBR.busca;
  const [estado, executar, pendente] = useActionState(adicionarDaBusca, inicial);
  const jaLeads = new Set(jaSaoLeads);
  const disponiveis = resultados.filter((linha) => !jaLeads.has(linha.cnpj)).map((linha) => linha.cnpj);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const todasMarcadas = disponiveis.length > 0 && disponiveis.every((cnpj) => marcados.has(cnpj));

  // Depois de adicionar, desmarca tudo (as adicionadas passam a "Já é lead").
  const [estadoVisto, setEstadoVisto] = useState(estado);
  if (estado !== estadoVisto) {
    setEstadoVisto(estado);
    setMarcados(new Set());
  }

  function alternar(cnpj: string) {
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(cnpj)) novo.delete(cnpj);
      else novo.add(cnpj);
      return novo;
    });
  }

  return (
    <form action={executar} className="flex flex-col gap-3">
      {estado.mensagem ? (
        <Alerta variante={estado.sucesso ? "sucesso" : "aviso"}>
          <div className="flex flex-wrap items-center gap-3">
            <span>{estado.mensagem}</span>
            {estado.sucesso ? (
              <BotaoLink href="/painel/leads?origem=busca_cnpj" variante="contorno" tamanho="pequeno">
                {t.adicionar.verLeads}
              </BotaoLink>
            ) : null}
          </div>
        </Alerta>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-texto">
          <input
            type="checkbox"
            checked={todasMarcadas}
            disabled={disponiveis.length === 0}
            onChange={() => setMarcados(todasMarcadas ? new Set() : new Set(disponiveis))}
            className="size-4 accent-roxo-600"
          />
          {t.colunas.marcarTodas}
        </label>
        <Botao type="submit" carregando={pendente} disabled={marcados.size === 0}>
          {pendente ? t.adicionar.enviando : `${t.adicionar.botao} (${marcados.size})`}
        </Botao>
      </div>

      <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie">
        {resultados.map((linha) => {
          const jaEhLead = jaLeads.has(linha.cnpj);
          const nome = linha.nomeFantasia ?? linha.razaoSocial ?? formatarCnpj(linha.cnpj);
          const telefone = formatarTelefone(linha.telefone);
          const contato = [telefone, linha.email].filter(Boolean).join("  ·  ");
          const local = [linha.bairro, linha.municipio && `${linha.municipio}/${linha.uf}`].filter(Boolean).join(", ");
          return (
            <li key={linha.cnpj} className="flex gap-3 px-4 py-3">
              <input
                type="checkbox"
                name="cnpj"
                value={linha.cnpj}
                checked={marcados.has(linha.cnpj)}
                disabled={jaEhLead}
                onChange={() => alternar(linha.cnpj)}
                aria-label={t.colunas.marcar(nome)}
                className="mt-1 size-4 shrink-0 accent-roxo-600"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:gap-6">
                <div className="min-w-0 sm:flex-1">
                  <p className="truncate font-medium text-texto">{nome}</p>
                  {linha.razaoSocial && linha.razaoSocial !== nome ? (
                    <p className="truncate text-sm text-texto-suave">{linha.razaoSocial}</p>
                  ) : null}
                  <p className="text-xs text-texto-suave">
                    {formatarCnpj(linha.cnpj)}
                    {linha.dataInicioAtividade ? `  ·  ${t.abertaEm(linha.dataInicioAtividade.slice(0, 4))}` : ""}
                  </p>
                </div>
                <div className="min-w-0 text-sm text-texto-suave sm:flex-1">
                  {linha.atividade ? <p className="truncate">{linha.atividade}</p> : null}
                  {local ? <p className="truncate">{local}</p> : null}
                  <p className="truncate">{contato || t.semContato}</p>
                </div>
                <div className="flex flex-wrap items-start gap-1.5 sm:w-28 sm:justify-end">
                  {jaEhLead ? <Etiqueta variante="musgo">{t.jaEhLead}</Etiqueta> : null}
                  {linha.mei ? <Etiqueta>{t.mei}</Etiqueta> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </form>
  );
}
