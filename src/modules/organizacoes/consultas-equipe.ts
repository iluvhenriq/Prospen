import "server-only";
import { connection } from "next/server";
import { getDb } from "@/db/client";
import { obterPlano, obterUsoDoMes, type UsoDoMes } from "@/modules/planos/acesso";
import { REGRAS, type Plano } from "@/modules/planos/planos";
import { obterConfiguracao } from "./configuracao";
import type { Contexto } from "./contexto";
import { lerConvite, repositorioEquipe, type ConviteParaAceitar, type ConvitePendente, type PessoaDaEquipe } from "./equipe";

export type TelaDeEquipe = {
  plano: Plano;
  fundador: boolean;
  usuarios: number;
  uso: UsoDoMes;
  pessoas: PessoaDaEquipe[];
  convites: ConvitePendente[];
  fuso: string;
};

export async function obterTelaDeEquipe(contexto: Contexto): Promise<TelaDeEquipe> {
  const db = getDb();
  const equipe = repositorioEquipe(db, contexto.organizacao.id);
  const [{ plano, fundador }, uso, pessoas, convites, configuracao] = await Promise.all([
    obterPlano(contexto),
    obterUsoDoMes(contexto),
    equipe.pessoas(),
    equipe.convitesPendentes(),
    obterConfiguracao(db, contexto.organizacao.id),
  ]);
  return { plano, fundador, usuarios: REGRAS[plano].usuarios, uso, pessoas, convites, fuso: configuracao.fusoHorario };
}

// Página pública do convite (quem recebeu o link ainda não é da equipe).
// Se o convite ainda vale depende da hora atual, que o Next não deixa ler na
// pré-renderização: `connection()` deixa a leitura para a hora do acesso. Sem
// isso, o servidor registrava "unstable value `new Date()`" a cada convite aberto.
export async function obterConvite(id: string): Promise<ConviteParaAceitar | null> {
  await connection();
  return lerConvite(getDb(), id);
}
