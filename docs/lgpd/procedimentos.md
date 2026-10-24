# Procedimentos: pedidos de titulares e incidentes

Para o responsável pelo PROSPEN. Rascunho de 23/10/2026. Todos os pedidos chegam pelo e-mail de privacidade (iluvhenriqdev@gmail.com). Guarde cada pedido e a resposta numa pasta própria do e-mail, por pelo menos 5 anos.

## 1. Pedidos de titulares (LGPD, arts. 18 e 19)

**Prazo:** confirmar o recebimento logo e dar a resposta completa em até **15 dias** (art. 19, II). Não usamos o prazo em dobro de pequeno porte (ver `relatorio-de-impacto.md`).

**Antes de tudo, confira a identidade.** O pedido sobre uma conta só vale se vier do próprio e-mail da conta. Se vier de outro e-mail, responda pedindo que escreva a partir do e-mail cadastrado. Nunca envie dados para um endereço diferente do da conta.

| Pedido | Quem pede | O que fazer |
|---|---|---|
| Acesso, confirmação ou portabilidade dos dados da conta | Usuário | `npm run conta:exportar -- email > dados.json` e responda com o arquivo, só para o e-mail da conta |
| Correção | Usuário | Nome e e-mail: hoje só pelo banco (não há tela). Responda o que foi corrigido |
| Exclusão da conta | Usuário | `npm run conta:excluir -- email --confirmar`. Apaga a pessoa e as empresas em que ela era a única integrante. Responda com o resumo que o comando mostra e explique que os registros de acesso ficam 6 meses (Marco Civil) |
| Tirar a empresa da busca | Responsável pela empresa | Indique a página `/remover-meus-dados` ou rode `npm run cnpj:excluir -- CNPJ` |
| Explicação ou revisão da pontuação (art. 20) | Empresa da base | Explique os critérios de `src/modules/pontuacao/regras.ts` (estão na política). A pontuação só ordena a busca; se pedir para não aparecer, use a remoção |
| Dados que um cliente do PROSPEN guardou como lead | Pessoa contatada por um cliente | O cliente é o controlador. Diga com qual empresa cliente falar e avise essa empresa do pedido (dever de operador, termos seção 4). Não apague dado do cliente sem instrução dele |
| Oposição ao tratamento da base pública | Empresa ou MEI | Mesmo que a remoção |

**Atenção ao excluir conta de dono de empresa compartilhada:** se a pessoa era a única dona e há outros integrantes, a empresa fica sem dono. Avise os integrantes restantes e, se preciso, promova alguém pelo banco.

## 2. Incidentes de segurança (Resolução CD/ANPD nº 15/2024)

Incidente: acesso indevido, vazamento, perda ou alteração de dados pessoais.

1. **Conter:** troque o `AUTH_SECRET` (`npm run auth:segredo`; derruba todas as sessões), troque a senha do banco, tire o servidor do ar se for preciso.
2. **Avaliar:** quais dados, de quantas pessoas, desde quando. Use os registros do servidor e do banco.
3. **Registrar sempre**, mesmo que não precise comunicar: data, o que aconteceu, dados afetados, decisão e motivo. Guardar por **pelo menos 5 anos**.
4. **Comunicar em até 3 dias úteis** a contar de quando souber que dados pessoais foram afetados, se o incidente puder causar risco ou dano relevante: à ANPD (formulário no site gov.br/anpd) e aos titulares afetados. Se ainda faltar informação, comunique o que tiver e complemente depois (até 20 dias úteis).
5. **Clientes:** se o incidente atingir leads de uma empresa cliente, avise essa empresa sem demora, porque ela é a controladora e também tem prazos.
