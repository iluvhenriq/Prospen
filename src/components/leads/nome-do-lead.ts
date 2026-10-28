import { nomeParaExibir } from "@/lib/formato";
import type { Lead } from "@/modules/leads/tipos";

// Só tira a caixa alta do que veio da base da Receita. O que o usuário digitou
// (cadastro manual ou planilha) aparece exatamente como ele escreveu.
export function textoDoLead(texto: string, origem: Lead["origem"]): string {
  return origem === "busca_cnpj" ? nomeParaExibir(texto) : texto;
}
