# Relatório de impacto à proteção de dados (LGPD, arts. 5º, XVII, e 38)

Rascunho de 23/10/2026, a revisar com advogado. A ANPD pode pedir este relatório, em especial quando a base legal é o legítimo interesse (art. 10, § 3º).

## Por que este relatório existe

Pela Resolução CD/ANPD nº 2/2022 (art. 4º), o tratamento é de **alto risco** quando reúne um critério geral e um específico. O PROSPEN, na leitura conservadora, reúne os dois:
- **Geral, larga escala:** milhões de estabelecimentos, com milhões de MEIs, que são pessoas naturais.
- **Específico, perfil automatizado:** a pontuação que ordena a busca.

Consequência adotada (decisão de 23/10/2026): **não contar com as facilidades de agente de pequeno porte.** Encarregado indicado, prazos normais (15 dias para o titular, 3 dias úteis para incidentes), registro completo das operações e este relatório.

## Descrição do tratamento

Ver `registro-de-operacoes.md` (operações 1 a 8) e `teste-legitimo-interesse.md`.

## Riscos e medidas

| Risco | Probabilidade | Impacto | Medidas em funcionamento | Risco que resta |
|---|---|---|---|---|
| Contato comercial indesejado com donos de empresa e MEIs | Alta | Baixo | Remoção pública e imediata; MEI fora da busca por padrão; termos proíbem spam sem descadastro e contato com quem pediu para sair | Médio: o cliente pode descumprir os termos. Medida futura: canal de denúncia e suspensão |
| Extração em massa da base por um cliente | Média | Médio | Termos proíbem; páginas de 50; sem exportação; limite de 300 páginas (15 mil empresas) por dia por empresa (`src/modules/base-cnpj/limite-busca.ts`) | Médio: o limite vive na memória de um servidor e um cliente pode criar várias empresas. Medida futura: limite no banco e verificação de e-mail no cadastro |
| Uso da base para golpes | Baixa | Alto | Contas identificadas; termos proíbem; suspensão | Médio. Medida futura: verificação de e-mail e de empresa no cadastro |
| Dados de uma empresa cliente vistos por outra | Baixa | Alto | Isolamento no SQL e nas chaves do banco, testado (`tests/isolamento.test.ts`, `e2e/isolamento.spec.ts`), teste de arquitetura | Baixo |
| Invasão de conta | Média | Médio | Senha protegida, limite de tentativas por e-mail e por IP, registros de acesso | Médio até existir confirmação de e-mail e recuperação de senha |
| Vazamento do banco | Baixa | Alto | Segredos só no servidor, sem dados sensíveis, CPF do MEI não guardado | Depende da hospedagem: banco sem acesso público, cópia de segurança cifrada |
| Pedido de remoção falso (tirar concorrente da busca) | Média | Baixo | 5 pedidos por hora por IP e 100 por dia no total | Baixo |
| Pontuação vista como discriminação | Baixa | Baixo | Critérios publicados na política; sem dado sensível; só ordena, não recusa nada; revisão por e-mail (art. 20) | Baixo |

## Conclusão

O tratamento pode seguir com as medidas acima. Antes de abrir para muitos clientes: confirmação de e-mail no cadastro e hospedagem com banco sem acesso público. Revisar este relatório a cada mudança relevante e no máximo a cada 12 meses.
