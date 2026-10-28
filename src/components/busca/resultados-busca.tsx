"use client";

import { useActionState, useState } from "react";
import { BotoesContato } from "@/components/leads/botoes-contato";
import { NotaPontuacao, textoDosMotivos } from "@/components/pontuacao/selo-pontuacao";
import { Alerta } from "@/components/ui/alerta";
import { Botao, BotaoLink } from "@/components/ui/botao";
import { Selecao } from "@/components/ui/campo-texto";
import { Etiqueta } from "@/components/ui/etiqueta";
import { cn } from "@/lib/cn";
import { nomeParaExibir } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import { adicionarDaBusca, type EstadoAdicionar } from "@/modules/base-cnpj/acoes";
import type { ResultadoDaBusca } from "@/modules/base-cnpj/repositorio";
import { formatarCnpj } from "@/modules/leads/cnpj";
import { formatarTelefone } from "@/modules/leads/normalizacao";
import { combinaComClienteIdeal, pontuar, type ClienteIdeal } from "@/modules/pontuacao/regras";

const inicial: EstadoAdicionar = {};

// Colunas em tela larga: marcar, nota, empresa, atividade e local, contato e motivos.
const GRADE_BUSCA = "lg:grid-cols-[1.25rem_6.5rem_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,1.2fr)] lg:gap-x-5";

// Lista de empresas achadas, com marcação para virar lead. Quem já é lead da
// empresa aparece marcado como tal e não pode ser marcado de novo.
export function ResultadosBusca({
  resultados,
  jaSaoLeads,
  campanhasAtivas,
  perfil,
}: {
  // Cliente ideal da empresa: marca as que combinam. A nota é a geral (a ordem da busca).
  perfil: ClienteIdeal | null;
  resultados: ResultadoDaBusca[];
  jaSaoLeads: string[];
  campanhasAtivas: { id: string; nome: string }[];
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
            className="size-4 accent-musgo-700"
          />
          {t.colunas.marcarTodas}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {campanhasAtivas.length > 0 ? (
            <label className="flex items-center gap-2 text-sm text-texto">
              {ptBR.campanhas.naBusca}
              <Selecao name="campanhaId" defaultValue="" className="w-auto max-w-56">
                <option value="">{ptBR.campanhas.naBuscaNenhuma}</option>
                {campanhasAtivas.map((campanha) => (
                  <option key={campanha.id} value={campanha.id}>
                    {campanha.nome}
                  </option>
                ))}
              </Selecao>
            </label>
          ) : null}
          <Botao type="submit" carregando={pendente} disabled={marcados.size === 0}>
            {pendente ? t.adicionar.enviando : `${t.adicionar.botao} (${marcados.size})`}
          </Botao>
        </div>
      </div>

      <div className="overflow-hidden rounded-painel border border-borda bg-superficie">
      <div aria-hidden="true" className={cn(GRADE_BUSCA, "hidden border-b-2 border-texto px-4 py-2.5 text-xs font-bold text-texto-suave lg:grid")}>
        <span />
        <span>{t.colunas.nota}</span>
        <span>{t.colunas.empresa}</span>
        <span>{t.colunas.atividade}</span>
        <span>{t.colunas.contato}</span>
      </div>
      <ul className="divide-y divide-borda">
        {resultados.map((linha) => {
          const jaEhLead = jaLeads.has(linha.cnpj);
          const nome = linha.nomeFantasia ?? linha.razaoSocial ?? formatarCnpj(linha.cnpj);
          const telefone = formatarTelefone(linha.telefone);
          const local = [
            linha.bairro && nomeParaExibir(linha.bairro),
            linha.municipio && `${nomeParaExibir(linha.municipio)}/${linha.uf}`,
          ]
            .filter(Boolean)
            .join(", ");
          const pontuacao = pontuar({
            telefone: linha.telefone,
            email: linha.email,
            dataAbertura: linha.dataInicioAtividade,
            porte: linha.porte,
            matriz: linha.matriz,
            naturezaJuridica: linha.naturezaJuridica,
          });
          return (
            <li
              key={linha.cnpj}
              className={cn(
                GRADE_BUSCA,
                "grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 px-4 py-3 lg:items-start",
                marcados.has(linha.cnpj) && "bg-musgo-50",
              )}
            >
              <input
                type="checkbox"
                name="cnpj"
                value={linha.cnpj}
                checked={marcados.has(linha.cnpj)}
                disabled={jaEhLead}
                onChange={() => alternar(linha.cnpj)}
                aria-label={t.colunas.marcar(nomeParaExibir(nome))}
                className="row-span-4 mt-1 size-4 shrink-0 accent-musgo-700 lg:row-span-1"
              />
              <div className="flex flex-wrap items-baseline gap-2 lg:flex-col lg:gap-1">
                <NotaPontuacao {...pontuacao} />
                {jaEhLead ? <Etiqueta variante="musgo">{t.jaEhLead}</Etiqueta> : null}
                {linha.mei ? <Etiqueta>{t.mei}</Etiqueta> : null}
                {perfil &&
                combinaComClienteIdeal(
                  { dataAbertura: linha.dataInicioAtividade, porte: linha.porte, naturezaJuridica: linha.naturezaJuridica },
                  perfil,
                ) ? (
                  <Etiqueta variante="destaque">{ptBR.clienteIdeal.combina}</Etiqueta>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-texto">{nomeParaExibir(nome)}</p>
                {linha.razaoSocial && linha.razaoSocial !== nome ? (
                  <p className="truncate text-sm text-texto-suave">{nomeParaExibir(linha.razaoSocial)}</p>
                ) : null}
                <p className="text-xs text-texto-suave">
                  {formatarCnpj(linha.cnpj)}
                  {linha.dataInicioAtividade ? `, ${t.abertaEm(linha.dataInicioAtividade.slice(0, 4)).toLowerCase()}` : ""}
                </p>
              </div>
              <div className="min-w-0 text-sm text-texto-suave">
                {linha.atividade ? <p className="truncate">{linha.atividade}</p> : null}
                {local ? <p className="truncate">{local}</p> : null}
              </div>
              <div className="min-w-0 text-sm text-texto-suave">
                {telefone ? <p className="numeros truncate text-texto">{telefone}</p> : null}
                {linha.email ? <p className="truncate text-texto">{linha.email}</p> : null}
                {!telefone && !linha.email ? <p>{t.semContato}</p> : null}
                <BotoesContato
                  nome={nomeParaExibir(nome)}
                  telefone={linha.telefone}
                  email={linha.email}
                  compacto
                  className="my-1.5"
                />
                <p className="text-xs">{textoDosMotivos(pontuacao.motivos)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      </div>
    </form>
  );
}
