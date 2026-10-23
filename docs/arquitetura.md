# Arquitetura da PROSPEN

Documento vivo. Registra as decisões do projeto e o motivo de cada uma. Última atualização: etapa 4 (22/10/2026).

## 1. Princípios

1. **Simples antes de sofisticado.** Um projeto só, sem microsserviços e sem infraestrutura extra no começo.
2. **Nada falso.** Sem dados de leads inventados, sem integração fingida, sem resultado de campanha simulado.
3. **Cada coisa no seu lugar.** Interface, regra de negócio e acesso ao banco são camadas separadas.
4. **Dados de uma empresa nunca aparecem para outra.**
5. **Preparar sem construir.** A arquitetura já prevê o que vem depois (anúncios, outros países), mas nada disso é implementado antes da hora.

## 2. Stack e motivos

| Camada | Escolha | Motivo |
|---|---|---|
| Linguagem | TypeScript | Erros aparecem antes de ir ao ar. Mesma linguagem na tela e no servidor. |
| Aplicação | Next.js (App Router) | Tela e servidor no mesmo projeto. Boa base para a landing no futuro. |
| Banco | PostgreSQL | Padrão para este tipo de produto. Bom para dados de várias empresas e buscas grandes. |
| Acesso ao banco | Drizzle ORM (instalado) | Leve, tipado, migrações em SQL legível. |
| Login | Better Auth (instalado) | Roda dentro do projeto, sem mensalidade por usuário, com organizações e papéis. |
| Validação | Zod (instalado) | Valida toda entrada do usuário e de serviços externos. Já valida as variáveis de ambiente. |
| Visual | Tailwind CSS e componentes próprios (instalados) | Componentes pequenos e reutilizáveis em `src/components/ui`, que o projeto controla. |
| Fontes | Geist, pacote `geist` | Vem dentro do projeto, sem depender de baixar do Google. |
| Testes | Vitest (instalado) e Playwright (a partir da etapa 2) | Vitest cobre regras e migrações. Playwright cobrirá os fluxos principais. |

As peças marcadas como instaladas já existem. As demais entram na etapa indicada.

## 3. Camadas e regra de dependência

```
Interface (src/app, src/components)
        chama
Lógica de negócio (src/modules)
        chama
Acesso a dados (src/db) e serviços externos (src/integrations)
```

A seta só vai para baixo. Uma tela nunca fala direto com o banco. Um módulo nunca depende de uma tela.

- `src/modules/<assunto>`: regras de negócio (leads, funil, campanhas, painel, organizações).
- `src/integrations/<serviço>`: um adaptador por serviço externo, todos com a mesma interface. Trocar de fornecedor não afeta o resto.
- `src/lib`: configuração, tratamento de erros, validação e textos.

## 4. Isolamento por organização

- Toda tabela que pertence a um cliente tem `organizacao_id`.
- Toda consulta passa por uma camada única de acesso que aplica esse filtro. Nenhuma tela precisa lembrar de filtrar.
- **Como funciona (implementado na etapa 2):** o repositório de cada tabela (hoje `src/modules/leads/repositorio.ts`) é criado já amarrado a UMA empresa. Cada consulta, alteração e exclusão carrega `organizacao_id = X` dentro do próprio SQL. Não existe função que aceite a empresa como parâmetro de uma operação, então nenhuma tela consegue esquecer o filtro nem apontar para outra empresa. Se o identificador for de outra empresa, o resultado é o mesmo de "não existe".
- **A empresa e o papel nunca vêm do navegador.** Em `src/modules/organizacoes/contexto.ts`, a empresa é descoberta pela tabela de membros, a cada requisição. A empresa "ativa" guardada na sessão só vale se a pessoa for membro dela.
- **Regra para as próximas etapas:** toda tabela nova que pertença a uma empresa ganha o seu repositório amarrado do mesmo jeito. Um teste automático (`tests/arquitetura.test.ts`) falha se alguma tela, componente ou outro módulo consultar a tabela de leads direto.
- **Testes de isolamento (`tests/isolamento.test.ts`):** cada empresa lista só os seus dados; ler, alterar ou apagar o lead de outra empresa não faz nada; não dá para criar lead em outra empresa nem mover um lead para ela; a API de login recusa ler, ativar ou apagar a empresa de outra pessoa; apagar uma empresa apaga só os dados dela.
- A base pública de empresas (CNPJ) é compartilhada e não pertence a nenhuma organização. O lead só nasce quando o usuário escolhe salvar.

## 5. Fontes de leads e visão internacional

| Fonte | Papel | Observação |
|---|---|---|
| Base pública de CNPJ (Receita Federal) | Núcleo da busca no Brasil | Gratuita. Arquivos grandes. O telefone e o e-mail cadastrais muitas vezes são do contador. |
| Google Places | Adiado (decisão de 23/10/2026) | Exige faturamento com cartão de crédito, que o Henrique não tem. Os termos também limitam guardar os dados. Reavaliar quando houver receita e conta da empresa. Alternativa gratuita a avaliar depois da pré-venda: OpenStreetMap (licença permite guardar com crédito à fonte; cobertura de empresas no Brasil menor; volume exige rodar localmente). |
| Importação CSV | Lista própria do usuário | Sem custo. |

**Não será usado:** raspagem de Google Maps, LinkedIn, Instagram e similares (viola os termos e quebra com frequência); listas compradas (qualidade e risco de LGPD).

**Foco internacional em cerca de 1 ano.** A base de CNPJ só existe para o Brasil, então fora daqui a busca dependerá de fontes pagas, o que afeta o preço do produto. Decisões já tomadas para não precisar refazer:

1. Campo **país** em empresas e leads.
2. **Moeda e fuso horário** configurados por organização.
3. Textos da interface em arquivos de idioma (`src/lib/i18n`), mesmo com só português.
4. Fonte de leads separada por país, em módulos independentes.

Fora do escopo agora: integrações internacionais, outros idiomas e regras de privacidade de outros países (a Europa é mais rígida que a LGPD).

## 6. Segurança e privacidade

- Chaves privadas só no servidor, em variáveis de ambiente. Nunca na interface.
- `.env.local` nunca vai para o Git. O `.env.example` mostra os nomes sem valores reais.
- Toda entrada é validada antes de ser usada.
- LGPD: registrar a origem de cada lead, permitir exclusão e ter política de privacidade antes de cobrar clientes. Recomenda-se consulta com advogado.

## 6.1 Login, sessões e papéis

- **Login por e-mail e senha** (Better Auth). A senha é guardada protegida (nunca em texto puro), com mínimo de 8 e máximo de 128 caracteres.
- **Segredo do login (`AUTH_SECRET`):** só no servidor, gerado por `npm run auth:segredo`, com pelo menos 32 caracteres. Se vazar, gere outro (todos terão de entrar de novo).
- **Duas camadas de proteção das telas privadas.** `src/proxy.ts` é só uma checagem rápida do cookie (quem não tem cookie vai direto para a entrada). A segurança de verdade é `src/modules/organizacoes/contexto.ts`, que confere sessão válida, empresa e papel no servidor em toda tela e ação. Um cookie falso passa pela primeira e é barrado pela segunda (testado).
- **Papéis:** dono, administrador e membro. As permissões ficam em uma tabela só (`PAPEL_MINIMO` em `src/modules/organizacoes/membros.ts`), e toda ação restrita no servidor começa por `exigirPermissao`. Esconder um botão não protege nada. As telas ainda só oferecem dono e membro. O administrador existe no login e fica entre os dois.
- **Uma empresa por pessoa**, por enquanto. A regra vale também para quem chamar a API direto, não só para as telas.
- **Proteção contra tentativa e erro de senha:** 8 falhas por e-mail e 30 por endereço a cada 15 minutos, e 10 cadastros por endereço a cada hora. As mensagens de login não revelam se um e-mail existe.
- **Origem das requisições:** o login recusa requisições vindas de outro site (testado).
- **Textos** em português, em `src/lib/i18n/pt-BR.ts`.

## 6.2 Leads, notas, etiquetas e importação

**Acesso aos dados.** Leads, etiquetas, notas e importações têm cada um o seu repositório (`src/modules/leads/repositorio*.ts`), todos amarrados a uma única empresa, como descrito na seção 4. As telas usam `src/modules/leads/consultas.ts` e as ações do servidor em `acoes.ts`. Toda ação começa por `exigirPermissao`, valida a entrada no servidor e nunca deixa um identificador vindo do formulário escolher a empresa.

**Isolamento reforçado no banco.** Notas e ligações de etiqueta guardam a empresa junto do lead e usam chaves estrangeiras compostas (lead e empresa juntos). Mesmo que um erro de código tentasse ligar dados de empresas diferentes, o banco recusaria.

**Regra de duplicados.** Dentro de uma empresa, o mesmo e-mail ou o mesmo telefone só pode existir uma vez. O e-mail é comparado em minúsculas e o telefone só pelos dígitos (sem o código do país no Brasil). Vale no cadastro manual, na edição e na importação. O banco garante a regra com índices únicos, mesmo se duas pessoas cadastrarem o mesmo contato ao mesmo tempo. Duas empresas diferentes podem ter o mesmo contato, porque a regra é por empresa.

**Importação de planilha, em duas fases.**
1. **Conferir:** lê, valida e compara com os leads existentes. Não grava nada e mostra quantos entram, quantos se repetem e quantos têm problema, linha por linha.
2. **Importar:** o servidor refaz a análise completa e grava tudo em uma transação só. Se algo falhar no meio, nada fica pela metade. Se alguém cadastrar o mesmo contato entre as duas fases, a linha é pulada e contada como repetida.

Regras da leitura:
- Aceita só CSV, até 2 MB e 5.000 linhas por importação. Arquivos `.xlsx` e PDF são recusados com a orientação de salvar como CSV UTF-8.
- Detecta sozinho o separador (vírgula, ponto e vírgula, tabulação) e a codificação (UTF-8 ou Windows-1252, a que o Excel em português costuma usar), então acentos chegam corretos.
- Reconhece os títulos de coluna Nome, Empresa (ou Razão social, Nome fantasia), E-mail e Telefone (ou Celular, WhatsApp). Só o nome é obrigatório. Sem coluna de nome, o nome vem da coluna de empresa. Outras colunas são ignoradas e avisadas.
- O histórico guarda só o resumo e uma amostra dos problemas (limitada a 200), nunca o conteúdo da planilha, para não acumular dados pessoais.
- O limite de envio de arquivo das ações do servidor foi subido para 3 MB em `next.config.ts` (o padrão do Next.js é 1 MB). Vale para todas as ações.

**Notas e etiquetas.** Notas têm até 2.000 caracteres e aparecem para todos da empresa. Cada pessoa apaga as próprias notas, e administradores e donos apagam qualquer uma. Qualquer membro cria etiquetas e as aplica aos leads. Excluir uma etiqueta (que a tira de todos os leads) exige administrador ou dono.

**Busca.** Ignora acentos e maiúsculas e procura em nome, empresa, e-mail e telefone. Cada palavra digitada precisa aparecer. Os caracteres especiais da busca são tratados como texto comum.

## 6.3 Funil de vendas e histórico

- **Etapas fixas:** Novo, Contatado, Em conversa, Proposta, Ganho, Perdido (`ETAPAS_FUNIL` em `src/db/schema/leads.ts`). O banco recusa qualquer outro valor. Todo lead nasce em Novo, seja cadastrado à mão ou importado. Não há ordem obrigatória: o lead pode ir de qualquer etapa para qualquer outra, inclusive sair de Perdido e voltar a ser trabalhado.
- **Um único caminho para mudar a etapa:** `mudarEtapa`, no repositório de leads. Ele trava a linha do lead, muda a etapa e grava o registro no histórico na mesma transação: ou as duas coisas acontecem, ou nenhuma. Criar e editar o lead não mexem na etapa, mesmo que o pedido traga uma (testado). Pedir a etapa em que o lead já está não grava nada.
- **Histórico (`historico_etapas`):** etapa anterior, etapa nova, quem mudou e quando. Só registra mudanças; a entrada no funil é a data de cadastro do lead. Usa chave estrangeira composta (lead e empresa juntos), como as notas, e é apagado junto com o lead. Se a pessoa que mudou sair do sistema, o registro fica sem autor. A leitura fica em `repositorio-historico.ts`, amarrado a uma empresa.
- **Quadro (`/painel/funil`):** uma coluna por etapa, com o total e os 30 leads movidos mais recentemente. Quando há mais, a coluna leva à lista filtrada pela etapa. Mover é feito por uma lista de etapas e o botão "Mover", e não por arrastar: funciona sem JavaScript, pelo teclado e no celular. Em telas estreitas as colunas rolam para o lado dentro do quadro.
- **Lista de leads:** ganhou o filtro por etapa (`?etapa=`) e o selo da etapa em cada lead.
- **Permissão:** mudar a etapa exige `trabalharComLeads` (qualquer membro).

## 7. Banco de dados

- **Desenvolvimento:** PostgreSQL instalado no computador, sem Docker. O banco em nuvem gratuito tem limite de espaço pequeno demais para a base de CNPJ.
- **Produção:** banco em nuvem, contratado só quando o projeto for publicado.
- Esquema (`src/db/schema`) e migrações (`src/db/migrations`) versionados no Git. A conexão fica em `src/db/client.ts`, é criada só no primeiro uso (o build não exige o banco) e é reaproveitada entre recarregamentos.
- Fluxo de mudança: alterar o esquema, rodar `npm run db:gerar`, revisar o SQL gerado, rodar `npm run db:migrar`.
- A migração `0000_extensoes` instala duas extensões para a busca de empresas (etapa 5): `unaccent` (ignora acentos) e `pg_trgm` (busca por parte do nome, tolerando erro de digitação).
- **Teste das migrações:** o teste automático aplica as migrações reais em um PostgreSQL de teste em memória (PGlite). Uma migração quebrada falha ali, antes de chegar ao seu banco.
- **Tabelas criadas até agora (5 migrações):** as do login (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, nomes do Better Auth), `organizacao_config` (país, moeda, fuso horário e idioma de cada empresa, criada automaticamente com o padrão do Brasil), `leads`, `etiquetas`, `lead_etiquetas` (liga lead e etiqueta), `notas`, `historico_etapas` (mudanças de etapa no funil) e `importacoes` (histórico de importações). A migração do funil coloca os leads que já existiam em Novo, com a data de cadastro como data da etapa (testado). As demais tabelas do modelo entram junto da etapa que as usa.
- O banco impõe regras por conta própria (origem do lead válida, país com 2 letras, moeda com 3), além das validações do código.
- Rota `/api/saude`: confere se o banco responde e devolve só `ok` ou `erro`, sem detalhes de configuração.
- Recomendação: guardar os dados pesados (base de CNPJ) em disco com bastante espaço, o que será definido na etapa 5.

## 7.1 Identidade visual e componentes

- Verde-musgo para estrutura, marca e sucesso. Roxo para ações principais e destaque. As cores ficam como variáveis em `src/app/globals.css`.
- Combinações de texto e fundo usadas nos componentes passam de 4,5:1 de contraste.
- Componentes em `src/components/ui`: botão, campo, cartão, aviso, etiqueta, indicador de carregamento, bloco de espera e estado vazio.
- Página de teste visual em `/design`, que só existe em desenvolvimento e responde 404 na versão publicada.
- Só existe tema claro por enquanto.

## 8. Decisões registradas

| Data | Decisão | Motivo |
|---|---|---|
| 18/10/2026 | Stack: Next.js, TypeScript, PostgreSQL, Drizzle, Better Auth | Custo baixo, boa manutenção, espaço para crescer |
| 18/10/2026 | Campanhas manuais no MVP | Sem integração real com anúncios, não se promete métrica que não existe |
| 18/10/2026 | Busca de leads: Brasil inteiro, em lotes, só empresas ativas, começando por um estado na prova de conceito | Controla o volume de dados |
| 18/10/2026 | Só português por enquanto, com textos em arquivos de idioma | Prepara a expansão sem custo agora |
| 18/10/2026 | Sem Docker | Menos peças, o mesmo resultado no desenvolvimento |
| 18/10/2026 | Publicação só após a meta de pré-vendas ou pré-cadastros | Sem custo de nuvem antes da validação |
| 18/10/2026 | Tabelas do produto na etapa 2, não na 1 | Dependem de como o login cria usuários e organizações |
| 18/10/2026 | Componentes próprios em vez do instalador do shadcn/ui | Sem depender de baixar de serviço externo, e o código fica pequeno e conhecido |
| 18/10/2026 | Fontes pelo pacote `geist`, não pelo Google Fonts | O build e o uso offline não dependem de internet |
| 18/10/2026 | Migrações testadas em PostgreSQL em memória (PGlite) | Pega migração quebrada antes de chegar ao banco real |
| 18/10/2026 | Página `/design` só em desenvolvimento | Ferramenta interna, não deve ir ao ar |
| 20/10/2026 | Isolamento por empresa dentro do repositório, não nas telas | Nenhuma tela consegue esquecer o filtro |
| 20/10/2026 | Empresa e papel sempre conferidos no banco, nunca aceitos do navegador | Um cookie ou identificador adulterado não dá acesso a outra empresa |
| 20/10/2026 | Uma empresa por pessoa no início | Simplifica o produto. Várias empresas por pessoa podem entrar depois |
| 20/10/2026 | Configuração regional (país, moeda, fuso, idioma) por empresa desde já | Prepara a expansão internacional sem refazer o banco |
| 20/10/2026 | Verificação de e-mail e recuperação de senha adiadas | Dependem de um provedor de e-mail, ainda não contratado |
| 22/10/2026 | Importação em duas fases (conferir, depois importar) | A pessoa vê o resultado antes de gravar, e a mesma análise vale nas duas fases |
| 22/10/2026 | Só CSV na importação, sem `.xlsx` | Evita ler arquivos complexos e traz menos risco. Pode entrar depois |
| 22/10/2026 | E-mail e telefone únicos por empresa | Evita lead duplicado. Precisa ser revisto na etapa 5 (veja pontos de atenção) |
| 22/10/2026 | Histórico de importação sem o conteúdo da planilha | Não acumular dados pessoais sem necessidade |
| 22/10/2026 | Chaves estrangeiras compostas em notas e etiquetas | O próprio banco impede ligar dados de empresas diferentes |
| 22/10/2026 | Etapas do funil fixas, iguais para todas as empresas | Simples para o MVP. Etapas personalizadas por empresa podem vir depois, se os clientes pedirem |
| 22/10/2026 | Mudança de etapa e histórico na mesma transação, por uma função só | O histórico nunca fica diferente da etapa atual |
| 22/10/2026 | Mover lead por lista e botão, sem arrastar | Funciona no celular, pelo teclado e sem JavaScript, sem biblioteca extra |
| 22/10/2026 | Lead com CNPJ é identificado pelo CNPJ (14 dígitos); e-mail e telefone únicos só para leads sem CNPJ; contato repetido entre leads com CNPJ gera aviso, não bloqueio | Na base de CNPJ, vários negócios dividem o contato do contador. Substitui a regra de e-mail e telefone únicos para todos |
| 22/10/2026 | Testes de navegador (Playwright) criados antes da etapa 5, não na 8 | O teste manual achou erros de tela que os testes automáticos não pegavam, e a etapa 5 mexe nesses fluxos |
| 22/10/2026 | Motivo de perda e valor da venda entram no início da etapa 7 | O sistema ainda não tem uso real, então adiantar não guarda dado nenhum. Entram junto com o painel que os usa |
| 22/10/2026 | Testes de navegador contra a versão de produção (build + start na porta 3100), num banco próprio (`<nome>_e2e`) recriado a cada rodada, com o Chrome instalado e um teste por vez | Testa o que vai ao ar, não atrapalha o `npm run dev` nem o banco de desenvolvimento, não baixa navegador e respeita o limite de cadastros por endereço |
| 23/10/2026 | CNPJ guardado padronizado (sem pontuação, maiúsculo) e aceito no formato alfanumérico, com o cálculo oficial dos verificadores | A Receita emite CNPJ alfanumérico desde julho de 2026. Guardar como "14 números" recusaria as empresas novas |
| 23/10/2026 | Prova de conceito da base de CNPJ com São Paulo | Maior volume do país: testa o pior caso de desempenho logo no início |
| 23/10/2026 | Base pública de CNPJ no mesmo PostgreSQL, em tabela própria sem `organizacao_id`, só de leitura para as empresas. Arquivos brutos em `D:\prospen-dados\cnpj` | Dado público, não pertence a nenhum cliente: exceção consciente à regra 2. O lead copiado para a empresa continua isolado. Um banco só para manter |
| 23/10/2026 | CNPJ não muda depois de gravado | É a identidade do lead. Corrigir um CNPJ errado, se for preciso, será uma ação própria |
| 22/10/2026 | Registro das ações do servidor desligado no terminal (`logging.serverFunctions: false`) | Em desenvolvimento, o Next.js escrevia nome, e-mail e telefone de leads no terminal |

## 9. Pontos de atenção

- **Avisos do `npm audit` (9: 5 altos e 4 moderados):** todos vêm de ferramentas de desenvolvimento, nenhum de código da aplicação. Os 5 altos são da cadeia do `eslint-config-next` e não aparecem na checagem de produção (`npm audit --omit=dev`, que mostra 0 altos e 0 críticos). Os 4 moderados são de uma versão antiga do `esbuild` dentro do `drizzle-kit`. Eles aparecem também na checagem de produção, porque o `drizzle-kit` é uma dependência opcional do adaptador do login, mas é só uma ferramenta de linha de comando (gerar migrações) e não roda no servidor. O problema descrito só afeta quem usa o servidor de desenvolvimento do esbuild, que o projeto não usa. A correção sugerida (`npm audit fix --force`) rebaixaria o `eslint-config-next` e o `drizzle-kit` para versões antigas e **não deve ser aplicada**. Reavaliar a cada atualização das ferramentas.
- **Sem recuperação de senha e sem verificação de e-mail ainda.** Ambas exigem enviar e-mail. **Obrigatório antes de abrir para clientes:** contratar um provedor de e-mail, ligar `requireEmailVerification` em `src/lib/auth-config.ts` e criar a recuperação de senha. Hoje, quem esquece a senha perde o acesso, e qualquer um pode se cadastrar com o e-mail de outra pessoa.
- **O limite de tentativas vive na memória do servidor** (`src/lib/limite-tentativas.ts`). Reinicia quando o servidor reinicia e cada servidor conta separado. Serve para um servidor só. Antes de publicar com mais de um servidor, mover a contagem para o banco.
- **O limite por endereço depende do cabeçalho `x-forwarded-for`**, que quem chama pode falsificar se o servidor não estiver atrás de um proxy confiável. O limite por e-mail não depende disso e continua valendo. Ao escolher a hospedagem, confirmar quem preenche esse cabeçalho.
- **O login também responde por HTTP** (`/api/auth/...`). Esse caminho tem a proteção própria do Better Auth, que só fica ativa em produção, e não passa pelos limites acima.
- **A regra de "um e-mail ou telefone por empresa" vai atrapalhar a etapa 5.** Na base pública de CNPJ, o telefone e o e-mail muitas vezes são do contador, então várias empresas diferentes compartilham o mesmo contato. Decidido em 22/10/2026 (seção 8) e aplicado no banco e no repositório em 23/10/2026 (migração 0005, testes em `tests/duplicados-cnpj.test.ts`): o CNPJ identifica o lead e o contato repetido entre leads com CNPJ é permitido. O aviso "contato compartilhado com N leads" está na página do lead desde 23/10/2026. Em aberto: um lead que entrou à mão sem CNPJ e depois aparece na busca com CNPJ vira dois leads; decidir na 5b se a tela oferece juntar.
- **Motivo de perda e valor da venda (feito em 23/10/2026):** colunas `motivo_perda` (lista fechada: preço, concorrente, parou de responder, sem interesse, sem orçamento, não é o momento, outro), `valor_venda_centavos` e `moeda_venda` (a moeda da empresa no momento do registro) no lead. Opcionais: o lead pode ficar sem. Só valem na etapa certa: o banco recusa motivo fora de "perdido" e valor fora de "ganho" (restrições na tabela), o repositório grava com a etapa na condição do próprio comando, e mudar de etapa limpa o que não vale mais. O formulário aparece na página do lead; o quadro mostra o motivo ou o valor no cartão. O valor aceita "1.500,00", "R$ 1.500" e "1500.50".
- **Textos visíveis fora do arquivo de idioma:** resolvido em 23/10/2026. As mensagens de validação e erro da lógica (leads, importação, conta e login) foram para `ptBR.mensagens`. Os `console.error` continuam em português no código: são registro interno, não aparecem na tela.
- **Ao criar a exportação de leads (futura), neutralizar fórmulas.** Células que começam com `=`, `+`, `-` ou `@` podem ser executadas pelo Excel. Hoje elas são guardadas e exibidas como texto puro (testado), mas uma exportação precisa tratá-las.
- **Base legal dos leads (LGPD), decidida em 23/10/2026 seguindo o padrão do mercado** (Casa dos Dados, Speedio, Econodata), sem consulta a advogado por ora:
  - Leads da base pública da Receita: base legal "legítimo interesse" (art. 7, IX), com dados tornados públicos pela Receita (art. 7, §§ 3 e 4). Uso só para prospecção entre empresas. A base legal fica implícita na origem `busca_cnpj` do lead (não há coluna própria; criar uma se surgir outra base legal).
  - MEIs entram na busca. O CPF que muitas vezes aparece no fim da razão social do MEI é retirado na importação e nunca é exibido.
  - Lista de exclusão: um CNPJ removido a pedido do titular não volta em importações futuras.
  - Antes de ir ao ar (etapa 8): página pública "remover meus dados" e política de privacidade explicando a origem e a finalidade.
  - Risco aceito: seguir o mercado reduz o risco, mas não o elimina. Reavaliar com um advogado quando houver receita ou antes da expansão internacional.
- **Importação sem limite de frequência.** Cada importação aceita até 5.000 linhas, mas nada impede enviar várias seguidas. Antes de publicar, limitar por empresa.
- **Só CSV.** Quem tem a planilha em Excel precisa salvar como CSV UTF-8. Aceitar `.xlsx` pode entrar depois, se a fricção aparecer nos primeiros clientes.
- **Painel de indicadores (etapa 7, 23/10/2026):** `/painel` mostra total de leads e novos em 30 dias, em andamento (Novo a Proposta), taxa de conversão (ganhos sobre ganhos + perdidos; "—" sem nenhum encerrado), valor vendido e ticket médio (só vendas com valor informado, por moeda), leads por etapa, motivos de perda e origem. As contagens são agrupadas no banco pelo repositório de leads (`indicadores`), sempre filtradas pela empresa; as contas ficam em `src/modules/painel/indicadores.ts` (funções puras, testadas). Barras de uma cor só, em tabela de verdade (nome, barra e número escrito), cor validada com o validador de paleta (contraste 3:1 contra o fundo).
  - Limitação conhecida: os números usam a etapa ATUAL de cada lead, em todo o período. Não há filtro por período nem "vendas fechadas em outubro": para isso, usar a data da mudança no histórico de etapas. Fazer quando houver uso real.
- **Campanhas (etapa 7, 23/10/2026):** um modelo só cobre os dois usos pedidos pelo Henrique: lista de trabalho (nome, objetivo, período, responsável) e ação com custo (custo opcional, na moeda da empresa). Tabelas `campanhas` e `campanha_leads` (um lead pode estar em várias), com a empresa nas chaves estrangeiras. Os números não são digitados: leads, contatados (saíram de Novo), ganhos e valor vendido vêm da etapa e do valor de venda dos leads; com custo, aparecem custo por lead e retorno (vendido menos custo). Leads entram pela página do lead, pela busca de empresas (escolhendo a campanha ao adicionar) e em lote pelos filtros da lista (até 1.000 por vez). Permissões: `trabalharComCampanhas` (membro) e `excluirCampanha` (admin). O repositório de campanhas é o único arquivo fora de `src/modules/leads` autorizado a ler a tabela de leads (teste de arquitetura).
  - Simplificações conscientes: o responsável é sempre quem criou (escolher outra pessoa vem com a tela de equipe). Os números usam a etapa atual do lead, não "o que aconteceu durante a campanha": um lead ganho por outro motivo conta como ganho da campanha. Adicionar pelos filtros sem preencher nenhum filtro coloca todos os leads (até 1.000); tirar é um por um.
- **Motivo e valor não são pedidos na hora de mover pelo quadro.** O quadro é um formulário simples (funciona sem JavaScript); o motivo e o valor são preenchidos na página do lead, e o cartão mostra "Sem motivo" ou "Sem valor" como lembrete. Se no uso real ficarem vazios demais, pedir na hora com uma janela.
- **Quadro mostra até 30 leads por coluna.** Com muitos leads numa etapa, o restante fica na lista filtrada. Não há busca dentro do quadro. No celular, uma coluna cheia fica muito comprida (30 cartões, cerca de 6.500 px de altura). Avaliar um limite menor no celular se incomodar no uso real.
- **Teste no navegador de 22/10/2026 (etapas 3 e 4):** feito com Playwright em duas contas de teste. Achados e corrigidos: a lista "Mudar para" voltava à etapa antiga depois de mudar (o React limpa o formulário; resolvido recriando o formulário quando a etapa muda); o quadro do funil fazia a página inteira rolar de lado no celular (rótulos `sr-only` têm posição absoluta e escapam de uma caixa de rolagem sem `relative`; vale para qualquer caixa com `overflow` que contenha esses rótulos); escolher de novo a mesma planilha depois de importar não mostrava o botão de conferir (o navegador não avisa quando o mesmo arquivo é escolhido de novo; o campo agora é esvaziado depois de importar, achado pelos testes de navegador); plural errado ("1 repetidas") e texto montado fora do arquivo de idioma; dica "criar a primeira etiqueta" aparecendo quando a empresa já tinha etiquetas.
- **Testes de navegador (`e2e/`, desde 22/10/2026):** cobrem login (inclusive senha errada), isolamento (inclusive formulário adulterado no navegador), importação da planilha de exemplo e reenvio, funil (mover, histórico, filtro, celular sem rolagem lateral, coluna cheia com "Ver todos"). Confirmado que pegam erro: ao desfazer de propósito a correção da lista de etapas, o teste falhou. Ainda não cobrem: exclusão normal de lead, etiquetas na página própria, limite de tentativas de login.
- **Falha da primeira rodada dos testes de navegador: causa achada e corrigida (23/10/2026).** O preparo acrescentava `_e2e` a um endereço que já era o do banco de testes e criava `prospen_e2e_e2e`, enquanto o servidor usava `prospen_e2e`, que nunca era atualizado. Na primeira rodada o banco nem existia ("Failed query: select 1"); depois de uma migração nova, faltava a coluna. Corrigido em `e2e/ambiente.ts` e provado apagando o banco de testes antes de rodar. A rota `/api/saude` agora registra a causa real do PostgreSQL.
- **Falha intermitente sem causa confirmada:** um teste de `tests/funil.test.ts` falhou numa rodada lenta (32 s em vez de 20 s) e passou em todas as outras. O limite de tempo dos testes subiu de 5 s para 20 s. Se voltar a acontecer, anotar a mensagem.
- **Página de lead inexistente responde com código 200**, não 404. O conteúdo é a página "não encontrada", sem nenhum dado, mas o código fica 200 porque a página já começou a ser enviada quando a consulta termina (efeito do `cacheComponents`). Não é falha de segurança. Revisar na etapa 8.
- **Leads importados de uma vez aparecem fora da ordem da planilha** na lista, porque têm o mesmo horário de criação e o desempate é pelo identificador. A paginação continua estável (testado: 35 leads em duas páginas, sem repetição).
- **Mudança simultânea de etapa não foi testada com duas conexões.** O banco de teste (PGlite) usa uma conexão só. A trava da linha (`for update`) é o comportamento padrão do PostgreSQL, mas o caso de duas pessoas movendo o mesmo lead no mesmo instante só foi verificado pela lógica.
- **Tela de busca (5d, 23/10/2026):** `/painel/busca`. Filtros no endereço da página (estado, cidade, atividade por palavra, "Incluir MEI" desligado por padrão). A atividade digitada vira uma lista de até 50 códigos (tabela `base_cnpj_cnaes`); não se usa `like` no código. Páginas de 50 ordenadas pelo CNPJ, sem contagem total e sem `offset` (a próxima página começa depois do último CNPJ). Ao adicionar, o navegador manda só os CNPJs (validados com Zod, no máximo 50); nome e contato são lidos de novo da base no servidor. Quem já é lead da empresa aparece marcado. Tabelas novas (migração 0007): atividades, cidades por estado, estados carregados e lista de exclusão (`npm run cnpj:excluir`). Tempos medidos com SP real: todas as buscas da tela entre 4 e 400 ms. Registrar SP sem reimportar (`cnpj:registrar`) levou 5 min, por montar as cidades a partir de 8,8 milhões de linhas.
  - Busca por CNPJ exato (campo próprio; com CNPJ os outros filtros são ignorados, mas a lista de exclusão vale). Página do lead mostra o CNPJ e avisa quando o e-mail ou o telefone também está em outros leads da mesma empresa, com link para a lista filtrada.
  - Pontos fracos conhecidos: a ordem por CNPJ não tem significado para o usuário (as empresas mais antigas aparecem primeiro). **Não há busca por nome:** em 8,8 milhões de linhas ela exige um índice de trigramas (`pg_trgm`), que deve ocupar centenas de MB só para SP (estimativa, não medido); decidir junto com a hospedagem. O e-mail mostrado é muitas vezes do contador. Falta a página pública "remover meus dados" (etapa 8).
- **Pontuação dos leads (etapa 6, 23/10/2026):** regras e pesos num único arquivo, `src/modules/pontuacao/regras.ts` (telefone 15, e-mail próprio 25, e-mail com cara de contador 5, aberta há menos de 1 ano 20, de 1 a 3 anos 10, porte 5/15/10, matriz 5, MEI -15; faixas: alta a partir de 55, média de 35 a 54). Calibrado com amostra de SP: celular foi descartado (só 0,4% dos telefones da Receita têm 11 dígitos); 50% dos e-mails são Gmail, Hotmail e similares, que em empresa pequena costumam ser do dono.
  - Na base pública, a pontuação é calculada em SQL no fim da importação (sem os índices, uma instrução só) e guardada em `base_cnpj_estabelecimentos.pontuacao`. A busca ordena por ela, e os índices de busca terminam em `pontuacao desc nulls last, cnpj`. Atenção: o `nulls last` precisa ser igual no índice e no `order by`, senão o PostgreSQL não usa o índice para ordenar (o teste de importação compara os índices recriados com os da migração). A conta em SQL é montada das mesmas constantes, e `tests/pontuacao.test.ts` confere que dá o mesmo número que a do código.
  - No lead, a pontuação não é guardada: é calculada na hora, a partir do contato e de uma cópia dos dados da Receita feita quando o lead vem da busca (colunas `porte`, `natureza_juridica`, `data_abertura`, `matriz`, `cnae_principal`). Lead sem CNPJ só pontua pelo contato (no máximo 40, faixa média).
  - A pontuação da base usa a data da importação para "empresa nova"; a tela recalcula com a data de hoje. Pode haver 1 faixa de diferença perto do aniversário de 1 ou 3 anos, até a próxima importação mensal.
  - Ficou de fora, de propósito: o desconto por contato repetido em outros leads (mudaria a nota de um lead a cada lead novo; a página do lead já avisa). Público-alvo por empresa cliente (atividades e porte preferidos) é o próximo passo natural, depois da pré-venda.
- **Prova de conceito da base de CNPJ com SP (5c, 23/10/2026), medido no computador do Henrique (4 núcleos):**
  - Download do mês 2026-10 completo em `D:\prospen-dados\cnpj` (`npm run cnpj:baixar`, retoma de onde parou).
  - SP: 21,4 milhões de linhas com "SP" lidas, **8.833.178 estabelecimentos ativos**, 8.403.361 empresas, 3 linhas fora do formato, nenhum CNPJ inválido. 7 empresas com estabelecimento ativo não constam no arquivo de Empresas.
  - **MEI (natureza 2135): 4.979.835 estabelecimentos, 56% de SP.** A busca precisa de filtro "sem MEI", senão o MEI domina o resultado. Nenhuma razão social ficou com CPF no fim (retirado na leitura).
  - Contato: 97% têm telefone e 92% têm e-mail, mas boa parte é do contador (ver regra de duplicados).
  - Disco: estabelecimentos 2,97 GB (2,1 GB de dados e o resto índices), empresas 1,07 GB. **SP ocupa cerca de 4 GB.** Projeção para o Brasil, só ativos: 3 a 4 vezes isso, de 12 a 16 GB (estimativa, não medido).
  - Tempo: 131 minutos com o leitor otimizado e os índices mantidos durante a carga. A primeira tentativa (leitor genérico, um arquivo por vez) passou de 2 horas sem chegar a 30%.
  - **Pontuação na carga (23/10/2026):** a primeira versão gravava os estabelecimentos e depois atualizava a pontuação de cada um (UPDATE de 8,8 milhões de linhas); passou de 1h17 sem terminar e foi cancelada. Causa: o PostgreSQL local está com a memória padrão (128 MB de cache, 4 MB por operação, 64 MB para criar índice) e o UPDATE regrava cada linha. Agora a carga vai para uma tabela temporária sem registro de transações (`base_cnpj_estab_carga`, criada e apagada pela própria importação) e passa para a tabela final uma vez, já com a pontuação, numa transação com `work_mem` de 512 MB; os índices são recriados com `maintenance_work_mem` de 1 GB. Bônus: durante a leitura dos arquivos, a busca continua funcionando com os dados antigos. `npm run cnpj:registrar` usa o mesmo caminho para recalcular a pontuação sem reimportar.
  - Recomendação para o computador do Henrique (e para o servidor no futuro): subir `shared_buffers` (por exemplo, 2 GB) no `postgresql.conf` e reiniciar o serviço. Não foi feito: é configuração da máquina.
  - **Gargalo achado: a gravação no banco esperando o disco** (amostras de `pg_stat_activity`), não a leitura. Armadilha: no Windows, `Get-Process` mostra 0 de processador para o PostgreSQL porque ele roda como serviço de outro usuário; isso NÃO quer dizer que está parado. Correções: índices de busca removidos durante a carga e recriados no final (mesmo com falha), remoção sem devolver as linhas e lotes de 3.000. **Medido em 23/10/2026: SP caiu de 131 para 46 minutos** (estabelecimentos e empresas em 41 min, índices em 3 min, cidades no fim). O total "gravados" do resumo agora bate com o banco. Próximo passo, se precisar: gravar com `COPY`.
  - Cada carga lê o país inteiro (os arquivos não vêm por estado), então **importar o Brasil todo de uma vez custa quase o mesmo tempo de leitura que um estado**.
  - Busca (primeira execução, sem cache): cidade + atividade com 50 resultados, 0,6 s; atividade sem MEI com 50 resultados, 0,13 s; contar todos de São Paulo capital, 2,2 s; **contar por início de código de atividade (`like '56%'`), 32 s**. Para a 5d: não mostrar contagem exata de conjuntos grandes, paginar sem `offset` e filtrar atividade por lista de códigos (ou índice próprio para prefixo), nunca `like` sem índice.
  - Achado e corrigido: o total "gravados" do resumo perdia somas com arquivos em paralelo (`total += await ...`). O banco estava certo.
- **Qualidade do contato:** o telefone e o e-mail da base pública nem sempre chegam ao dono. O enriquecimento do Google compensa em parte.
