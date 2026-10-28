# Registro das operações de tratamento (LGPD, art. 37)

Rascunho de 23/10/2026. Atualize a cada tabela, finalidade ou fornecedor novo. Controlador e encarregado: responsável indicado em `src/lib/responsavel.ts` (contato: iluvhenriqdev@gmail.com).

| # | Operação | Titulares | Dados | Finalidade | Base legal | Papel do PROSPEN | Onde fica | Prazo de guarda | Compartilhamento |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Conta de usuário | Pessoas que usam o PROSPEN | Nome, e-mail, senha protegida (hash), sessões (com IP e navegador, enquanto a sessão existir) | Acesso e prestação do serviço | Contrato (art. 7º, V) | Controlador | Tabelas `user`, `account`, `session` | Enquanto a conta existir | Provedor de hospedagem |
| 2 | Empresa cliente e equipe | Integrantes da empresa | Nome da empresa, papel de cada pessoa, configuração regional | Prestação do serviço | Contrato (art. 7º, V) | Controlador | `organization`, `member`, `organizacao_config` | Enquanto a empresa existir | Provedor de hospedagem |
| 3 | Registros de acesso | Usuários | ID do usuário, IP, data e hora de cada entrada | Marco Civil, art. 15 | Obrigação legal (art. 7º, II) | Controlador | `registros_acesso` | 6 meses (184 dias), apagados automaticamente | Só com ordem judicial |
| 4 | Limite de tentativas | Quem tenta entrar, cadastrar, importar ou pedir remoção | E-mail e IP, só contagem | Segurança contra força bruta e abuso | Legítimo interesse (art. 7º, IX) | Controlador | Memória do servidor, nunca no banco | 15 minutos a 24 horas | Ninguém |
| 5 | Leads das empresas clientes | Contatos cadastrados, importados ou salvos da busca | Nome, empresa, e-mail, telefone, CNPJ, dados da Receita copiados, notas, etiquetas, etapa, valor da venda, campanhas, tentativas de contato (canal, resultado, data e autor) e próxima ação (data e texto curto) | Gestão comercial do cliente | Definida pelo cliente (controlador) | **Operador** (art. 39) | `leads`, `notas`, `contatos`, `etiquetas`, `lead_etiquetas`, `historico_etapas`, `campanhas`, `campanha_leads` | Até o cliente apagar ou excluir a empresa | Provedor de hospedagem |
| 6 | Histórico de importação | Pessoas da planilha (indiretamente) | Só resumo e amostra de problemas (linha e motivo), nunca o conteúdo | Mostrar o resultado ao cliente | Definida pelo cliente | Operador | `importacoes` | Até excluir a empresa | Provedor de hospedagem |
| 7 | Base pública de CNPJ | Empresas ativas; MEIs são pessoas naturais | Razão social (CPF do MEI retirado), nome fantasia, endereço, telefones, e-mail, atividade, porte, natureza jurídica, data de abertura, pontuação | Busca de empresas para prospecção entre empresas | Legítimo interesse (art. 7º, IX) sobre dado público (art. 7º, §§ 3º, 4º e 7º); ver `teste-legitimo-interesse.md` | Controlador | `base_cnpj_*`; arquivos brutos em `D:\prospen-dados\cnpj` | Substituída a cada carga mensal | Exibida às empresas clientes |
| 8 | Lista de exclusão | Empresas que pediram para sair | CNPJ e data do pedido | Garantir que não voltem | Legítimo interesse e exercício de direitos (art. 18) | Controlador | `base_cnpj_exclusoes` | Sem prazo (é o que garante o pedido) | Ninguém |
| 9 | Pré-cadastro da pré-venda | Interessados no PROSPEN | Nome, e-mail, empresa (opcional), data | Avisar da abertura e das condições da pré-venda | Procedimentos preliminares a contrato, a pedido do titular (art. 7º, V) | Controlador | `pre_cadastros`; listagem por `npm run pre-cadastro:listar` | Até 12 meses após a abertura ou até pedir para sair (`npm run pre-cadastro:excluir`) | Ninguém; o arquivo exportado não deve ser compartilhado |

## Fornecedores (suboperadores)

| Fornecedor | Para quê | País | Situação |
|---|---|---|---|
| Hospedagem e banco de dados | Rodar o sistema | A definir (preferência: Brasil) | Não contratado. Ao contratar: atualizar esta tabela, a política e conferir as regras de transferência internacional se for fora do Brasil |
| Provedor de e-mail | Recuperação de senha e confirmação de e-mail | A definir | Não contratado |

## O que NÃO é tratado

Dados sensíveis (art. 5º, II), dados de crianças e adolescentes, quadro de sócios da Receita, ferramentas de rastreamento ou publicidade, cookies além do de login.
