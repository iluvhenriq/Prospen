import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SeloEtapa } from "@/components/funil/selo-etapa";
import { BotoesContato } from "@/components/leads/botoes-contato";
import { textoDoLead } from "@/components/leads/nome-do-lead";
import { NotaPontuacao } from "@/components/pontuacao/selo-pontuacao";
import { BotaoLink } from "@/components/ui/botao";
import { Esqueleto } from "@/components/ui/carregando";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { diasEntre, formatarData } from "@/lib/formato";
import { ptBR } from "@/lib/i18n/pt-BR";
import { obterAgendaDoDia, type AgendaDoDia } from "@/modules/leads/consultas";
import { exigirContexto } from "@/modules/organizacoes/contexto";
import { obterClienteIdeal } from "@/modules/pontuacao/cliente-ideal";
import { pontuar, type ClienteIdeal } from "@/modules/pontuacao/regras";

export const metadata: Metadata = { title: ptBR.hoje.titulo };

// Um grupo da agenda (atrasados ou do dia), como uma lista de trabalho: nota,
// lead, o que fazer, contato em um clique.
function Grupo({
  titulo,
  leads,
  agenda,
  perfil,
}: {
  titulo: string;
  leads: AgendaDoDia["leads"];
  agenda: AgendaDoDia;
  perfil: ClienteIdeal | null;
}) {
  const t = ptBR.hoje;
  const c = ptBR.contatos;
  if (leads.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold text-texto">
        {titulo} <span className="font-normal text-texto-suave">({t.total(leads.length)})</span>
      </h2>
      <ul className="divide-y divide-borda overflow-hidden rounded-painel border border-borda bg-superficie">
        {leads.map((lead) => {
          const atraso = lead.proximaAcaoEm ? diasEntre(lead.proximaAcaoEm, agenda.hoje) : 0;
          const resumo = agenda.contatosPorLead.get(lead.id);
          const nome = textoDoLead(lead.nome, lead.origem);
          return (
            <li
              key={lead.id}
              className="relative grid gap-x-5 gap-y-1.5 px-4 py-3 transition-colors hover:bg-musgo-50 lg:grid-cols-[6.5rem_minmax(0,1.2fr)_minmax(0,1.4fr)_auto] lg:items-center"
            >
              <NotaPontuacao {...pontuar(lead, undefined, perfil)} />
              <div className="min-w-0">
                {/* O link é o nome, mas cobre a linha inteira; os botões ficam por cima. */}
                <Link href={`/painel/leads/${lead.id}`} className="block truncate font-semibold text-texto after:absolute after:inset-0 hover:underline">
                  {nome}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-texto-suave">
                  <SeloEtapa etapa={lead.etapa} />
                  {resumo ? (
                    <span>
                      {c.tentativas(resumo.tentativas)}, {c.ultima(formatarData(resumo.ultimo, agenda.fusoHorario))}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="min-w-0 text-sm">
                <p className="text-texto">{lead.proximaAcao ?? c.proxima}</p>
                {atraso > 0 ? <p className="text-xs font-semibold text-erro">{t.atrasadoHa(atraso)}</p> : null}
              </div>
              <BotoesContato
                nome={nome}
                telefone={lead.telefone}
                email={lead.email}
                pais={lead.pais}
                compacto
                className="relative z-10 flex-nowrap"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function ConteudoHoje() {
  const contexto = await exigirContexto();
  const [agenda, perfil] = await Promise.all([obterAgendaDoDia(contexto), obterClienteIdeal(contexto)]);
  const t = ptBR.hoje;

  if (agenda.total === 0) {
    return (
      <EstadoVazio
        titulo={t.vazioTitulo}
        descricao={t.vazioDescricao}
        acao={<BotaoLink href="/painel/leads">{t.verLeads}</BotaoLink>}
      />
    );
  }

  const atrasados = agenda.leads.filter((lead) => lead.proximaAcaoEm !== null && lead.proximaAcaoEm < agenda.hoje);
  const doDia = agenda.leads.filter((lead) => lead.proximaAcaoEm === agenda.hoje);

  return (
    <div className="flex flex-col gap-6">
      <Grupo titulo={t.atrasados} leads={atrasados} agenda={agenda} perfil={perfil} />
      <Grupo titulo={t.doDia} leads={doDia} agenda={agenda} perfil={perfil} />
      {agenda.total > agenda.leads.length ? (
        <p className="text-sm text-texto-suave">{t.mostrandoParte(agenda.leads.length, agenda.total)}</p>
      ) : null}
    </div>
  );
}

function CarregandoHoje() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Esqueleto className="h-5 w-32" />
      <Esqueleto className="h-64 w-full" />
    </div>
  );
}

export default function PaginaHoje() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-texto">{ptBR.hoje.titulo}</h1>
        <p className="max-w-2xl text-sm text-texto-suave">{ptBR.hoje.descricao}</p>
      </header>
      <Suspense fallback={<CarregandoHoje />}>
        <ConteudoHoje />
      </Suspense>
    </div>
  );
}
