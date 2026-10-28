// Planos do PROSPEN (decisão de 28/10/2026). O Médio existe para fazer o
// Grande parecer a escolha óbvia: R$ 20 a mais levam radar, nota pelo
// cliente ideal, aprendizado e empresas sem limite mensal.
// Mudou um número aqui, confira a página inicial e o PRODUCT.md.

export const PLANOS = ["pequeno", "medio", "grande"] as const;
export type Plano = (typeof PLANOS)[number];

// Recursos que nem todo plano tem. O que não está aqui (busca, nota com
// motivos, funil, "Hoje", contato em um clique) vale para todos.
export const RECURSOS = ["exportarCsv", "buscasVigiadas", "radar", "clienteIdeal", "aprendizado"] as const;
export type Recurso = (typeof RECURSOS)[number];

export type RegrasDoPlano = {
  precoCentavos: number;
  usuarios: number;
  // Empresas da base pública salvas como lead por mês. Nulo: sem limite mensal
  // (continua valendo o limite diário de páginas da busca).
  empresasPorMes: number | null;
  recursos: readonly Recurso[];
};

export const REGRAS: Record<Plano, RegrasDoPlano> = {
  pequeno: { precoCentavos: 9700, usuarios: 1, empresasPorMes: 300, recursos: [] },
  medio: { precoCentavos: 17700, usuarios: 2, empresasPorMes: 1000, recursos: ["exportarCsv", "buscasVigiadas"] },
  grande: { precoCentavos: 19700, usuarios: 3, empresasPorMes: null, recursos: RECURSOS },
};

// Empresa sem plano gravado (acabou de criar a conta e ainda não pagou).
// Vale o menor plano, com o limite mensal de EMPRESAS_SEM_PAGAMENTO.
export const PLANO_PADRAO: Plano = "pequeno";

// Empresas da base salvas por mês enquanto o plano não é liberado (decisão de
// 28/10/2026). Sem confirmação de e-mail, qualquer um cria várias contas: com
// o limite do Pequeno, cada uma levaria 300 empresas da base de graça. 20 dão
// para conhecer o produto. Liberar o plano (`plano:definir`) tira a trava.
export const EMPRESAS_SEM_PAGAMENTO = 20;

// Limite mensal que vale para a empresa: o do plano, se liberado.
export function empresasPorMesDa(empresa: { plano: Plano; gravado: boolean }): number | null {
  return empresa.gravado ? REGRAS[empresa.plano].empresasPorMes : EMPRESAS_SEM_PAGAMENTO;
}

// Vagas com preço travado para sempre.
export const VAGAS_DE_FUNDADOR = 20;

export function planoValido(valor: string): valor is Plano {
  return (PLANOS as readonly string[]).includes(valor);
}

export function planoTem(plano: Plano, recurso: Recurso): boolean {
  return REGRAS[plano].recursos.includes(recurso);
}

// O plano mais barato que tem o recurso (para o aviso "disponível no plano X").
export function menorPlanoCom(recurso: Recurso): Plano {
  return PLANOS.find((plano) => planoTem(plano, recurso)) ?? "grande";
}

// Mês no calendário da empresa, a partir do "hoje" dela (AAAA-MM-DD).
export function mesDoDia(dia: string): string {
  return dia.slice(0, 7);
}

// Quantas das empresas novas cabem no que sobra do mês.
export function cabemNoMes(novas: number, usadas: number, limite: number | null): number {
  if (limite === null) return novas;
  return Math.max(0, Math.min(novas, limite - usadas));
}

// O plano seguinte, para o aviso "para mais, mude para o plano X". Nulo no maior.
export function proximoPlano(plano: Plano): Plano | null {
  return PLANOS[PLANOS.indexOf(plano) + 1] ?? null;
}
