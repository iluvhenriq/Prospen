# Documentos de proteção de dados do PROSPEN

Escritos em 23/10/2026 a partir do que o código faz. São rascunhos: revisar com advogado antes de cobrar clientes. Se o código mudar o tratamento de dados, atualize o documento correspondente na mesma mudança.

| Documento | Para que serve | Base |
|---|---|---|
| [teste-legitimo-interesse.md](teste-legitimo-interesse.md) | Justifica a busca na base pública de CNPJ | LGPD, art. 10; guia da ANPD de 2024 |
| [registro-de-operacoes.md](registro-de-operacoes.md) | Lista de todos os tratamentos, bases legais, prazos e fornecedores | LGPD, art. 37 |
| [relatorio-de-impacto.md](relatorio-de-impacto.md) | Riscos e medidas; explica por que o PROSPEN se trata como alto risco | LGPD, art. 38; Resolução CD/ANPD nº 2/2022 |
| [procedimentos.md](procedimentos.md) | Como atender titulares e o que fazer num incidente | LGPD, arts. 18, 19 e 48; Resolução CD/ANPD nº 15/2024 |

Documentos públicos no próprio sistema: política de privacidade (`/privacidade`), termos de uso (`/termos`) e remoção (`/remover-meus-dados`).

## Pendências que dependem do responsável

1. Identificação do controlador em `src/lib/responsavel.ts`. **Risco aceito pelo Henrique em 23/10/2026:** fica sem CPF e sem nome completo até haver cobrança ou questionamento. A LGPD não exige CPF; o nome completo já fortaleceria. Em 24/10/2026 o Henrique decidiu manter assim mesmo com vendas, por pelo menos 6 meses, ciente de que vender pela internet pede CPF ou CNPJ (Decreto 7.962/2013), de que clientes empresa costumam pedir nota fiscal e de que a receita precisa ser declarada. Reavaliar em abril de 2027.
2. Ao abrir CNPJ: confirmar com o contador se a empresa se enquadra no Marco Civil, art. 15 (os registros de acesso já são guardados) e incluir nome empresarial, CNPJ e endereço nas páginas de venda (Decreto 7.962/2013, comércio eletrônico).
3. Hospedagem e provedor de e-mail: atualizar `registro-de-operacoes.md` e a política; se o servidor for fora do Brasil, seguir as regras de transferência internacional.
4. Revisão por advogado destes documentos, da política e dos termos.
