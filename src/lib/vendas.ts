// Como o cliente paga o plano (decisão do Henrique, 28/10/2026): Pix direto,
// comprovante por e-mail, e o plano é liberado à mão com `npm run plano:definir`.
// Sem número de WhatsApp por enquanto. Trocar aqui quando houver link de
// pagamento recorrente (ex.: Mercado Pago).
export const VENDAS = {
  chavePix: "contaspablohenrique@gmail.com",
  emailComprovante: "contaspablohenrique@gmail.com",
  // Nome e cidade que aparecem no Pix da página inicial (src/modules/planos/pix.ts).
  nomePix: "PROSPEN",
  cidadePix: "SAO PAULO",
} as const;
