# Arquitetura da PROSPEN

Documento vivo. Registra as decisões do projeto e o motivo de cada uma. Última atualização: etapa 3 (22/10/2026).

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
| Google Places | Enriquecimento sob demanda | Pago por consulta. Os termos limitam o armazenamento, então guarda-se o mínimo permitido. |
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

## 7. Banco de dados

- **Desenvolvimento:** PostgreSQL instalado no computador, sem Docker. O banco em nuvem gratuito tem limite de espaço pequeno demais para a base de CNPJ.
- **Produção:** banco em nuvem, contratado só quando o projeto for publicado.
- Esquema (`src/db/schema`) e migrações (`src/db/migrations`) versionados no Git. A conexão fica em `src/db/client.ts`, é criada só no primeiro uso (o build não exige o banco) e é reaproveitada entre recarregamentos.
- Fluxo de mudança: alterar o esquema, rodar `npm run db:gerar`, revisar o SQL gerado, rodar `npm run db:migrar`.
- A migração `0000_extensoes` instala duas extensões para a busca de empresas (etapa 5): `unaccent` (ignora acentos) e `pg_trgm` (busca por parte do nome, tolerando erro de digitação).
- **Teste das migrações:** o teste automático aplica as migrações reais em um PostgreSQL de teste em memória (PGlite). Uma migração quebrada falha ali, antes de chegar ao seu banco.
- **Tabelas criadas até agora (4 migrações):** as do login (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`, nomes do Better Auth), `organizacao_config` (país, moeda, fuso horário e idioma de cada empresa, criada automaticamente com o padrão do Brasil), `leads`, `etiquetas`, `lead_etiquetas` (liga lead e etiqueta), `notas` e `importacoes` (histórico). As demais tabelas do modelo entram junto da etapa que as usa.
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

## 9. Pontos de atenção

- **Avisos do `npm audit` (9: 5 altos e 4 moderados):** todos vêm de ferramentas de desenvolvimento, nenhum de código da aplicação. Os 5 altos são da cadeia do `eslint-config-next` e não aparecem na checagem de produção (`npm audit --omit=dev`, que mostra 0 altos e 0 críticos). Os 4 moderados são de uma versão antiga do `esbuild` dentro do `drizzle-kit`. Eles aparecem também na checagem de produção, porque o `drizzle-kit` é uma dependência opcional do adaptador do login, mas é só uma ferramenta de linha de comando (gerar migrações) e não roda no servidor. O problema descrito só afeta quem usa o servidor de desenvolvimento do esbuild, que o projeto não usa. A correção sugerida (`npm audit fix --force`) rebaixaria o `eslint-config-next` e o `drizzle-kit` para versões antigas e **não deve ser aplicada**. Reavaliar a cada atualização das ferramentas.
- **Sem recuperação de senha e sem verificação de e-mail ainda.** Ambas exigem enviar e-mail. **Obrigatório antes de abrir para clientes:** contratar um provedor de e-mail, ligar `requireEmailVerification` em `src/lib/auth-config.ts` e criar a recuperação de senha. Hoje, quem esquece a senha perde o acesso, e qualquer um pode se cadastrar com o e-mail de outra pessoa.
- **O limite de tentativas vive na memória do servidor** (`src/lib/limite-tentativas.ts`). Reinicia quando o servidor reinicia e cada servidor conta separado. Serve para um servidor só. Antes de publicar com mais de um servidor, mover a contagem para o banco.
- **O limite por endereço depende do cabeçalho `x-forwarded-for`**, que quem chama pode falsificar se o servidor não estiver atrás de um proxy confiável. O limite por e-mail não depende disso e continua valendo. Ao escolher a hospedagem, confirmar quem preenche esse cabeçalho.
- **O login também responde por HTTP** (`/api/auth/...`). Esse caminho tem a proteção própria do Better Auth, que só fica ativa em produção, e não passa pelos limites acima.
- **A regra de "um e-mail ou telefone por empresa" vai atrapalhar a etapa 5.** Na base pública de CNPJ, o telefone e o e-mail muitas vezes são do contador, então várias empresas diferentes compartilham o mesmo contato. Com a regra atual, só a primeira delas poderia virar lead. Antes da etapa 5, definir uma regra própria para leads vindos da busca (por exemplo, identificar o lead pelo CNPJ e permitir contato repetido).
- **Ao criar a exportação de leads (futura), neutralizar fórmulas.** Células que começam com `=`, `+`, `-` ou `@` podem ser executadas pelo Excel. Hoje elas são guardadas e exibidas como texto puro (testado), mas uma exportação precisa tratá-las.
- **Falta registrar a base legal de cada lead** (LGPD). Hoje só existe a origem (manual, importação etc.). Antes de abrir para clientes, definir com um advogado o que registrar e criar a exclusão a pedido do titular.
- **Importação sem limite de frequência.** Cada importação aceita até 5.000 linhas, mas nada impede enviar várias seguidas. Antes de publicar, limitar por empresa.
- **Só CSV.** Quem tem a planilha em Excel precisa salvar como CSV UTF-8. Aceitar `.xlsx` pode entrar depois, se a fricção aparecer nos primeiros clientes.
- **Volume da base de CNPJ:** é a etapa de maior risco técnico. A prova de conceito vem logo depois da etapa 1.
- **Qualidade do contato:** o telefone e o e-mail da base pública nem sempre chegam ao dono. O enriquecimento do Google compensa em parte.
