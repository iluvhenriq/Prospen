import Link from "next/link";
import { SeloEtapa } from "@/components/funil/selo-etapa";
import { textoDoLead } from "@/components/leads/nome-do-lead";
import { NotaPontuacao } from "@/components/pontuacao/selo-pontuacao";
import { Botao, BotaoLink } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Selecao } from "@/components/ui/campo-texto";
import { Etiqueta } from "@/components/ui/etiqueta";
import { cn } from "@/lib/cn";
import { ptBR } from "@/lib/i18n/pt-BR";
import {
  enderecoDaLista,
  type ParametrosLista,
} from "@/modules/leads/parametros";
import { formatarTelefone } from "@/modules/leads/normalizacao";
import { pontuar } from "@/modules/pontuacao/regras";
import {
  ETAPAS_FUNIL,
  ORIGENS_LEAD,
  type Etiqueta as EtiquetaDoLead,
  type Lead,
} from "@/modules/leads/tipos";

// Busca e filtros. É um formulário comum de navegação (GET): funciona sem
// JavaScript e deixa o endereço da página compartilhável.
export function FiltrosLeads({
  parametros,
  etiquetas,
  temFiltro,
}: {
  parametros: ParametrosLista;
  etiquetas: { id: string; nome: string }[];
  temFiltro: boolean;
}) {
  const b = ptBR.leads.busca;
  return (
    <form
      method="get"
      action="/painel/leads"
      className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_11rem_auto] lg:items-end"
    >
      <Campo
        rotulo={b.rotulo}
        name="q"
        type="search"
        placeholder={b.placeholder}
        defaultValue={parametros.busca}
        maxLength={100}
        className="sm:col-span-3 lg:col-span-1"
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filtro-origem" className="text-sm font-medium text-texto">
          {b.origem}
        </label>
        <Selecao id="filtro-origem" name="origem" defaultValue={parametros.origem ?? ""}>
          <option value="">{b.todasOrigens}</option>
          {ORIGENS_LEAD.map((origem) => (
            <option key={origem} value={origem}>
              {ptBR.leads.origens[origem]}
            </option>
          ))}
        </Selecao>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filtro-etapa" className="text-sm font-medium text-texto">
          {b.etapa}
        </label>
        <Selecao id="filtro-etapa" name="etapa" defaultValue={parametros.etapa ?? ""}>
          <option value="">{b.todasEtapas}</option>
          {ETAPAS_FUNIL.map((etapa) => (
            <option key={etapa} value={etapa}>
              {ptBR.funil.etapas[etapa]}
            </option>
          ))}
        </Selecao>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filtro-etiqueta" className="text-sm font-medium text-texto">
          {b.etiqueta}
        </label>
        <Selecao id="filtro-etiqueta" name="etiqueta" defaultValue={parametros.etiquetaId ?? ""}>
          <option value="">{b.todasEtiquetas}</option>
          {etiquetas.map((etiqueta) => (
            <option key={etiqueta.id} value={etiqueta.id}>
              {etiqueta.nome}
            </option>
          ))}
        </Selecao>
      </div>
      <div className="flex items-center gap-2 sm:col-span-3 lg:col-span-1">
        <Botao type="submit" variante="secundario">
          {b.filtrar}
        </Botao>
        {temFiltro ? (
          <BotaoLink href="/painel/leads" variante="fantasma">
            {b.limpar}
          </BotaoLink>
        ) : null}
      </div>
    </form>
  );
}

// Colunas da tabela de leads em tela larga: nota, lead, contato, etapa e origem.
const GRADE_LEADS = "lg:grid-cols-[6.5rem_minmax(0,1.3fr)_minmax(0,1.2fr)_7.5rem_minmax(0,1fr)] lg:gap-5";

export function ListaLeads({
  leads,
  etiquetasPorLead,
}: {
  leads: Lead[];
  etiquetasPorLead: Map<string, EtiquetaDoLead[]>;
}) {
  const c = ptBR.leads.colunas;
  return (
    <div className="overflow-hidden rounded-painel border border-borda bg-superficie">
      {/* Cabeçalho só para quem enxerga as colunas; cada linha já é um link completo. */}
      <div aria-hidden="true" className={cn(GRADE_LEADS, "hidden border-b-2 border-texto px-4 py-2.5 text-xs font-bold text-texto-suave lg:grid")}>
        <span>{c.nota}</span>
        <span>{c.lead}</span>
        <span>{c.contato}</span>
        <span>{c.etapa}</span>
        <span>{c.origem}</span>
      </div>
      <ul className="divide-y divide-borda">
        {leads.map((lead) => {
          const etiquetas = etiquetasPorLead.get(lead.id) ?? [];
          const telefone = formatarTelefone(lead.telefone, lead.pais);
          return (
            <li key={lead.id}>
              <Link
                href={`/painel/leads/${lead.id}`}
                className={cn(GRADE_LEADS, "flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-musgo-50 lg:grid lg:items-center")}
              >
                <NotaPontuacao {...pontuar(lead)} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-texto">{textoDoLead(lead.nome, lead.origem)}</p>
                  {lead.empresa && lead.empresa !== lead.nome ? (
                    <p className="truncate text-sm text-texto-suave">{textoDoLead(lead.empresa, lead.origem)}</p>
                  ) : null}
                </div>
                <div className="min-w-0 text-sm text-texto-suave">
                  {lead.email ? <p className="truncate">{lead.email}</p> : null}
                  {telefone ? <p className="numeros truncate">{telefone}</p> : null}
                </div>
                <div>
                  <SeloEtapa etapa={lead.etapa} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Etiqueta>{ptBR.leads.origens[lead.origem]}</Etiqueta>
                  {etiquetas.map((etiqueta) => (
                    <Etiqueta key={etiqueta.id} variante={etiqueta.cor}>
                      {etiqueta.nome}
                    </Etiqueta>
                  ))}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Paginacao({
  parametros,
  pagina,
  paginas,
}: {
  parametros: ParametrosLista;
  pagina: number;
  paginas: number;
}) {
  if (paginas <= 1) return null;
  const p = ptBR.leads.paginacao;
  const classe = "min-w-24 justify-center";
  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-3">
      {pagina > 1 ? (
        <BotaoLink
          href={enderecoDaLista(parametros, pagina - 1)}
          variante="contorno"
          tamanho="pequeno"
          className={classe}
        >
          {p.anterior}
        </BotaoLink>
      ) : (
        <span className={cn(classe, "inline-block")} />
      )}
      <p className="text-sm text-texto-suave">{p.pagina(pagina, paginas)}</p>
      {pagina < paginas ? (
        <BotaoLink
          href={enderecoDaLista(parametros, pagina + 1)}
          variante="contorno"
          tamanho="pequeno"
          className={classe}
        >
          {p.proxima}
        </BotaoLink>
      ) : (
        <span className={cn(classe, "inline-block")} />
      )}
    </nav>
  );
}
