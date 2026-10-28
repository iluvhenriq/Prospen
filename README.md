# PROSPEN

Plataforma de aquisição de leads e gestão de marketing para empresas.

**Situação atual: etapa 4** (funil de vendas e histórico). Já é possível criar conta e empresa, cadastrar leads à mão, importar uma planilha CSV, buscar e filtrar a lista, anotar notas, etiquetar e acompanhar cada lead no funil (Novo, Contatado, Em conversa, Proposta, Ganho, Perdido), com histórico de mudanças. Busca de empresas e campanhas entram nas próximas etapas.

## Escopo do MVP

1. Cadastro, login e organizações, com dados isolados por empresa.
2. Busca real de leads na base pública de CNPJ da Receita Federal.
3. Enriquecimento opcional de leads com o Google Places.
4. Importação de listas próprias por planilha CSV.
5. Lista de leads com filtros, notas e etiquetas.
6. Funil de vendas simples com histórico de etapas.
7. Pontuação de leads por regras simples e transparentes.
8. Campanhas manuais (planejamento e registro, sem integração com anúncios).
9. Painel com indicadores de aquisição.

Fora do MVP: Google Ads, Meta Ads, formulários de captação, automação, inteligência artificial, cobrança e planos.

## Requisitos

- Node.js 22 ou superior
- npm
- Git
- PostgreSQL 16 ou superior, instalado no computador

## Como instalar e rodar

No PowerShell, dentro da pasta do projeto (a que tem o `package.json`):

```
npm install
copy .env.example .env.local
```

Abra o `.env.local` e troque `SUA_SENHA` pela senha do usuário `postgres`, criada na instalação do PostgreSQL. Se a senha tiver símbolos como `@ # / :`, troque cada um pelo código correspondente (por exemplo, `@` vira `%40`). Esse arquivo nunca vai para o Git.

Gere o segredo do login (ele protege as sessões) e cole a linha que aparecer no `.env.local`, no lugar da linha `AUTH_SECRET=`:

```
npm run auth:segredo
```

Depois, crie o banco e as tabelas:

```
npm run db:criar
npm run db:migrar
npm run dev
```

Abra http://localhost:3000. O terminal precisa ficar aberto enquanto você usa o projeto.

## Como conferir que está tudo certo

| Endereço | O que deve aparecer |
|---|---|
| http://localhost:3000 | Página "PROSPEN" com os botões "Criar conta" e "Entrar" |
| http://localhost:3000/cadastrar | Crie uma conta. Em seguida o sistema pede o nome da sua empresa |
| http://localhost:3000/painel | Painel da sua empresa, com "Olá, seu nome". Sem login, volta para a entrada |
| http://localhost:3000/painel/leads | Lista de leads, com busca, filtros por origem e etiqueta, e os botões "Novo lead", "Importar planilha" e "Etiquetas" |
| http://localhost:3000/painel/funil | Quadro do funil com as seis etapas. Cada cartão tem "Mover" para trocar a etapa. Na página do lead, o cartão "Funil" mostra a etapa atual e o histórico |
| http://localhost:3000/painel/leads/importar | Importação de planilha. Para testar, use o arquivo `docs/exemplos/leads-exemplo.csv` |

### Testando a importação com a planilha de exemplo

O arquivo `docs/exemplos/leads-exemplo.csv` tem **dados fictícios** (nomes "Exemplo", e-mails `@exemplo.com.br`), só para testar. Ao enviá-lo em "Importar planilha" e clicar em "Conferir planilha", o resultado esperado é:

- **5 serão importados**
- **1 repetida:** linha 7, e-mail igual ao da linha 2
- **2 com problema:** linha 8 (e-mail inválido) e linha 9 (sem nome)

Nada é gravado até você clicar em "Importar". Se enviar o mesmo arquivo de novo depois de importar, o resultado será "nenhuma linha pode ser importada", porque os contatos já existem.
| http://localhost:3000/design | Página de teste visual com cores, botões, campos, avisos e estados (só em desenvolvimento) |
| http://localhost:3000/api/saude | `{"banco":"ok"}` quando o banco responde, ou `{"banco":"erro"}` se algo estiver errado |

## Comandos úteis

| Comando | Para que serve |
|---|---|
| `npm run dev` | Roda o projeto em modo de desenvolvimento |
| `npm run lint` | Verifica o estilo e erros comuns do código |
| `npm test` | Roda os testes automáticos (inclui testar as migrações em um banco de teste em memória) |
| `npm run test:e2e` | Testes no navegador (login, isolamento, importação, funil). Recria o banco `prospen_e2e` (o seu banco não é tocado), gera a versão de produção e abre o Chrome na porta 3100. Leva cerca de 1 minuto. Se algo falhar, abra `e2e-relatorio/index.html` |
| `npm run build` | Gera a versão de produção e checa os tipos |
| `npm run start` | Roda a versão gerada pelo `build` |
| `npm run db:criar` | Cria o banco indicado no `.env.local`, se ainda não existir |
| `npm run db:migrar` | Aplica as migrações pendentes. Pode rodar várias vezes sem problema |
| `npm run db:gerar` | Gera uma nova migração depois de alterar as tabelas em `src/db/schema` |
| `npm run auth:segredo` | Gera um segredo novo para o login. Só mostra na tela, não grava nada |

## Problemas comuns

- **"Não consegui conectar ao PostgreSQL":** o PostgreSQL está desligado ou a porta do `.env.local` não é a 5432.
- **"Usuário ou senha incorretos":** confira a senha no `.env.local` (veja a observação sobre símbolos acima).
- **"Configuração inválida ... AUTH_SECRET":** falta gerar o segredo do login. Rode `npm run auth:segredo` e cole a linha no `.env.local`. Depois, pare e ligue o `npm run dev` de novo.
- **Esqueci a senha de uma conta de teste:** ainda não existe recuperação de senha (ela depende de envio de e-mail). Em desenvolvimento, crie outra conta com outro e-mail.
- **Erro dizendo que a extensão `unaccent` ou `pg_trgm` não foi encontrada:** o PostgreSQL foi instalado sem os módulos adicionais. O instalador oficial do Windows já os inclui. Reinstale por ele, mantendo a opção padrão.
- **`npm audit` mostra avisos:** veja "Pontos de atenção" em [docs/arquitetura.md](docs/arquitetura.md). Não rode `npm audit fix --force`.

## Estrutura de pastas

```
src/
  app/            telas e rotas (só interface)
  modules/        lógica de negócio, um módulo por assunto
  integrations/   um adaptador por serviço externo
  db/             conexão, tabelas (schema) e migrações
  components/ui/  componentes visuais reutilizáveis
  lib/            configuração, erros, validação, textos (i18n)
scripts/          comandos de linha (criar banco, migrar)
docs/
  arquitetura.md  decisões do projeto
  exemplos/       planilha de exemplo (dados fictícios) para testar a importação
tests/            testes automáticos
e2e/              testes no navegador (Playwright)
```

## Documentação

- [Arquitetura e decisões](docs/arquitetura.md)

## Etapas

| Etapa | Entrega | Situação |
|---|---|---|
| 0 | Projeto limpo, README, arquitetura | concluída |
| 1 | Banco, migrações, identidade visual, componentes base | concluída |
| 2 | Login, organizações, papéis, isolamento de dados, tabelas base | concluída |
| 3 | Leads, importação CSV, notas, etiquetas | concluída, testada no navegador em 22/10/2026 |
| 4 | Funil e histórico | concluída, testada no navegador em 22/10/2026 |
| 5 | Base de CNPJ e busca real | em andamento: 5a testes de navegador e 5b regra de duplicados por CNPJ concluídas; 5c prova de conceito com SP concluída em 23/10/2026 (8,8 milhões de estabelecimentos, cerca de 4 GB); 5d tela de busca concluída em 23/10/2026 (estado, cidade, atividade, CNPJ exato, sem MEI por padrão, adicionar como lead, aviso de contato compartilhado); em aberto: busca por nome |
| 6 | Pontuação dos leads por regras | concluída |
| 7 | Campanhas manuais e painel | concluída: motivo da perda, valor da venda, painel de indicadores e campanhas |
| 8 | Revisão final, testes, segurança, celular | em andamento: revisão de segurança, telas vazias e com dados (computador e celular), testes de navegador de etiquetas, exclusão de lead e limite de login, limite de frequência na importação, página pública "remover meus dados", política de privacidade e termos de uso (rascunhos), documentos de LGPD em `docs/lgpd/`, registros de acesso do Marco Civil, comandos para pedidos de titulares, limite diário da busca. Falta o que depende do Henrique: domínio e e-mail, hospedagem, identificação completa do responsável, revisão por advogado |
| 9 | Nova identidade e diferenciais | em andamento (27/10/2026): 9a identidade nova (sem roxo, marca-texto, Schibsted Grotesk) concluída; 9b página de pré-venda refeita (direção "mesa do vendedor") concluída; 9c telas internas redesenhadas (topo verde-musgo, painel como relatório, leads e busca em colunas com a nota na frente, conta da nota na página do lead) concluída; contato em um clique (WhatsApp, ligar, e-mail) concluído; registro de contato, próxima ação e tela "Hoje" concluídos (27/10/2026); 9d aprendizado com os resultados no painel concluído (27/10/2026); 9e recém-abertas e buscas vigiadas concluído (27/10/2026); radar de mudanças na Receita (nova unidade, mudou de cidade ou de atividade, deixou de constar como ativa) nas empresas dos leads, no painel e na página do lead, concluído (28/10/2026); exportação dos leads em CSV com os filtros da lista (só administrador e dono) concluída (28/10/2026); 9f pontuação ajustada ao cliente ideal (tela `/painel/cliente-ideal`; nota dos leads ajustada, busca na ordem geral com marca) concluída (28/10/2026). Próximo: depois da validação da pré-venda: primeiro assistente de inteligência artificial |
