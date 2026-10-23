# PROSPEN: guia para o Claude

Este arquivo é lido no início de toda sessão. Mantenha-o curto e atualizado. As decisões completas estão em `docs/arquitetura.md` e o resumo de uso está em `README.md`.

## O que é o projeto

PROSPEN é uma plataforma de aquisição de leads e gestão de marketing para empresas, em construção por Henrique (desenvolvedor autodidata, Brasil). O objetivo é um produto real, vendável e organizado, não uma demonstração. Só português do Brasil por enquanto, com foco internacional daqui a cerca de 1 ano. O projeto só vai ao ar depois da meta de pré-vendas ou pré-cadastros, então hoje tudo roda no computador dele, sem custo de nuvem.

## Como trabalhar com o Henrique

- Responda em português do Brasil, com linguagem simples, direta e profissional. Evite siglas e termos em inglês quando houver equivalente claro.
- Nunca use o travessão. Troque por vírgula, dois pontos ou ponto, conforme a gramática.
- Seja um conselheiro crítico, não um gerador de respostas agradáveis. Aponte riscos, gargalos e problemas, e discorde quando fizer sentido.
- Comece simples e só aprofunde quando ajudar a decidir ou executar. Prefira passos acionáveis, checklists e exemplos.
- Siga a ordem das etapas abaixo sem pedir aprovação a cada uma. Pare e pergunte só quando uma decisão realmente depender dele e não puder ser desfeita facilmente.
- Trabalhe em etapas pequenas. Em cada etapa: explique o objetivo em uma frase, implemente, rode as verificações, corrija e informe os arquivos alterados e como validar.
- Nunca invente dados de leads, integrações funcionando, métricas de campanha ou resultados. Estado vazio real é melhor que dado falso.
- Ao concluir uma etapa, atualize a tabela de etapas do `README.md` e o `docs/arquitetura.md` (decisões e pontos de atenção).

## Estado atual das etapas

| Etapa | Entrega | Situação |
|---|---|---|
| 0 | Projeto limpo, README, arquitetura | concluída |
| 1 | Banco, migrações, identidade visual, componentes base | concluída |
| 2 | Login, empresas, papéis, isolamento de dados | concluída |
| 3 | Leads, importação CSV, notas, etiquetas | concluída, testada no navegador em 22/10/2026 |
| 4 | Funil de vendas (Novo, Contatado, Em conversa, Proposta, Ganho, Perdido), quadro e histórico de mudanças | concluída, testada no navegador em 22/10/2026 |
| 5 | Base pública de CNPJ e busca real de leads | em andamento. 5a testes de navegador: concluída. 5b regra de duplicados por CNPJ (banco e repositório): concluída. 5c prova de conceito com SP: concluída (23/10/2026). SP importado no banco local: 8,8 milhões de ativos, 56% MEI, cerca de 4 GB, 131 min. Números e lições para a busca em `docs/arquitetura.md`. 5d tela de busca (`/painel/busca`): concluída (23/10/2026), testada no navegador e com teste em `e2e/busca.spec.ts`. Depois: busca por CNPJ exato e aviso "contato compartilhado com N leads" na página do lead (23/10/2026). Em aberto: busca por nome (exige índice grande, decisão do Henrique) e medir a carga sem índices com a base real |
| 6 | Enriquecimento com Google Places e pontuação por regras simples | pendente |
| 7 | Campanhas manuais (sem integração com anúncios) e painel de indicadores | pendente. Começa por motivo de perda (Perdido) e valor da venda (Ganho) no funil |
| 8 | Revisão final: erros, estados vazios, testes dos fluxos críticos, segurança, celular | pendente |

Fora do MVP, de propósito: Google Ads, Meta Ads, formulários de captação, automação, inteligência artificial, cobrança e planos. Não implemente antes da hora.

## Stack

TypeScript, Next.js (App Router, versão 16), PostgreSQL, Drizzle ORM, Better Auth, Zod, Tailwind CSS, Vitest. Componentes visuais próprios em `src/components/ui` (sem shadcn). Identidade: verde-musgo e roxo, só tema claro.

## Comandos (PowerShell, na pasta do projeto)

| Comando | Para que serve |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em http://localhost:3000 |
| `npm run lint` | Estilo e erros comuns |
| `npx next typegen` e depois `npx tsc --noEmit` | Checagem de tipos (o typegen vem antes) |
| `npm test` | Testes automáticos (migrações rodam em PostgreSQL em memória, PGlite) |
| `npm run test:e2e` | Testes no navegador (pasta `e2e`). Recria o banco `prospen_e2e`, faz build e sobe na porta 3100 com o Chrome instalado |
| `npm run build` | Versão de produção |
| `npm run db:gerar` | Gera migração depois de mudar `src/db/schema`. Revise o SQL gerado |
| `npm run db:migrar` | Aplica migrações. Pode rodar várias vezes |
| `npm run db:criar` | Cria o banco da `DATABASE_URL` |
| `npm run auth:segredo` | Gera o `AUTH_SECRET` |
| `npm run cnpj:baixar` | Baixa a base pública de CNPJ do mês para `D:\prospen-dados\cnpj` (retoma de onde parou) |
| `npm run cnpj:importar -- 2026-10 SP` | Carrega um estado no banco (apaga e refaz). Lê o país inteiro, leva horas |
| `npm run cnpj:registrar -- 2026-10 SP` | Registra atividades e cidades de um estado já carregado, sem importar de novo |
| `npm run cnpj:excluir -- CNPJ` | Pedido do titular (LGPD): tira o CNPJ da busca para sempre |

Antes de dizer que uma etapa está pronta, rode lint, tipos, testes, build e `npm run test:e2e`. Teste também no navegador o que for tela nova (Playwright MCP) e, quando o fluxo for crítico, acrescente um teste em `e2e/`. Diga com clareza o que NÃO foi testado.

## Regras de arquitetura (não quebre)

1. **Camadas:** interface (`src/app`, `src/components`) chama lógica (`src/modules`), que chama dados (`src/db`) e serviços externos (`src/integrations`). Nunca o contrário. Tela não fala com o banco.
2. **Isolamento por empresa:** toda tabela de cliente tem `organizacao_id`. O acesso é por um repositório amarrado a UMA empresa, e cada consulta carrega o filtro dentro do SQL. Não crie função que receba a empresa como parâmetro de uma operação. Tabelas filhas usam chave estrangeira composta (registro e empresa juntos). Todo repositório novo precisa de teste de isolamento, e `tests/arquitetura.test.ts` deve continuar passando.
3. **Empresa e papel nunca vêm do navegador.** Descubra pelo banco, em `src/modules/organizacoes/contexto.ts`. Toda ação do servidor começa por `exigirPermissao` e valida a entrada com Zod no servidor. Esconder botão não é segurança. Permissões ficam em `PAPEL_MINIMO`, em `src/modules/organizacoes/membros.ts`.
4. **Textos visíveis** ficam em `src/lib/i18n/pt-BR.ts`, nunca soltos nas telas.
5. **Segredos** só no servidor, em `.env.local` (nunca no Git). O `.env.example` mostra só os nomes.
6. **Internacional desde já:** país, moeda, fuso e idioma são da empresa (`organizacao_config`), nunca fixos no código. Lead tem campo `pais`.
7. **Dados pessoais:** o histórico de importação guarda só resumo, nunca o conteúdo da planilha. Não registre dados pessoais em logs.

## Cuidados específicos desta versão do Next.js

- Leia `AGENTS.md` e consulte `node_modules/next/dist/docs/` antes de usar APIs do Next.js: esta versão tem mudanças que você não conhece.
- `cacheComponents` está ligado: ler cookies ou cabeçalhos só dentro de `<Suspense>`. Páginas privadas ficam em `/painel`.
- O arquivo `src/proxy.ts` (antigo middleware) é só uma checagem otimista do cookie. A segurança real é `contexto.ts`.
- Envio de arquivo por ação do servidor: limite subido para 3 MB em `next.config.ts` (padrão é 1 MB).

## Armadilhas já encontradas

- Senha do PostgreSQL com símbolos (`@ # / :`) precisa ser codificada na `DATABASE_URL` (`@` vira `%40`).
- No PowerShell, se o `npm` for bloqueado: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- Não rode `npm audit fix --force`: rebaixaria `eslint-config-next` e `drizzle-kit` para versões antigas. Os avisos atuais são de ferramentas de desenvolvimento (veja `docs/arquitetura.md`).
- Acentos quebrados na saída dos scripts ("concluÃ­do") no Windows PowerShell 5.1: é só a exibição. Corrige com `[Console]::OutputEncoding = [Text.Encoding]::UTF8` (pode ir no perfil do PowerShell).
- Fontes vêm do pacote `geist`, não do Google Fonts.
- O PGlite em modo servidor só aceita várias conexões com `maxConnections` maior que 1. Isso é só do ambiente de teste, não do produto.

## Pendências e riscos conhecidos

- Sem recuperação de senha e sem verificação de e-mail (dependem de provedor de e-mail). **Obrigatório antes de abrir para clientes.**
- **LGPD (decidido em 23/10/2026, padrão de mercado):** leads da base pública usam "legítimo interesse" e guardam origem e base legal. MEIs entram, mas o CPF no fim da razão social é retirado na importação. CNPJ removido a pedido entra numa lista de exclusão e não volta. Página "remover meus dados" e política de privacidade antes de ir ao ar. Detalhes em `docs/arquitetura.md`.
- O limite de tentativas de login vive na memória do servidor. Com mais de um servidor, mover para o banco. O limite por endereço depende do cabeçalho `x-forwarded-for`.
- **Regra de duplicados (decidida em 22/10/2026, no banco e no repositório desde 23/10):** lead com CNPJ é único pelo CNPJ dentro da empresa. E-mail e telefone são únicos só entre leads sem CNPJ (manual e planilha). O CNPJ pode ser alfanumérico (regra da Receita desde 07/2026): use `src/modules/leads/cnpj.ts`, nunca "14 números". A página do lead avisa quando o e-mail ou telefone está em outros leads da empresa.
- Ainda há textos visíveis escritos na lógica (motivos de linha recusada em `src/modules/leads/importacao.ts` e `csv.ts`, mensagens em `acoes.ts`), fora do `pt-BR.ts`. Mover antes da etapa 8.
- Ao criar exportação de leads, neutralizar células que começam com `=`, `+`, `-` ou `@`.
- Importação sem limite de frequência por empresa.
- Importação só aceita CSV, até 2 MB e 5.000 linhas.

## Ambiente do Henrique

Windows, VS Code e PowerShell. Node 24, npm 11, Git e PostgreSQL instalados, sem Docker. Disco D com bastante espaço, planejado para os arquivos pesados da base de CNPJ (etapa 5). Use comandos do PowerShell, não do Linux.
