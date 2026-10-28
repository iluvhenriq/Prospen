# PROSPEN: guia para o Claude

Este arquivo é lido no início de toda sessão. Mantenha-o curto e atualizado. As decisões completas estão em `docs/arquitetura.md`, o resumo de uso está em `README.md` e quem usa o produto, o diferencial e o que não pode ser inventado estão em `PRODUCT.md`.

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
| 5 | Base pública de CNPJ e busca real de leads | em andamento. 5a testes de navegador: concluída. 5b regra de duplicados por CNPJ (banco e repositório): concluída. 5c prova de conceito com SP: concluída (23/10/2026). SP importado no banco local: 8,8 milhões de ativos, 56% MEI, cerca de 4 GB, 131 min. Números e lições para a busca em `docs/arquitetura.md`. 5d tela de busca (`/painel/busca`): concluída (23/10/2026), testada no navegador e com teste em `e2e/busca.spec.ts`. Depois: busca por CNPJ exato e aviso "contato compartilhado com N leads" na página do lead (23/10/2026). Carga de SP sem índices medida: 46 min (antes 131). Em aberto: busca por nome (exige índice grande, decisão do Henrique) |
| 6 | Pontuação dos leads por regras simples, com dados da base pública (sem Google Places, decisão de 23/10/2026) | concluída (23/10/2026): regras em `src/modules/pontuacao/regras.ts`, pontuação na base (busca ordena pelos melhores, 3 a 358 ms em SP) e no lead (selo e motivos). Testada no navegador |
| 7 | Campanhas manuais (sem integração com anúncios) e painel de indicadores | concluída (23/10/2026), testada no navegador: motivo da perda e valor da venda, painel de indicadores (`/painel`) e campanhas (`/painel/campanhas`: lista de trabalho e ação com custo; números vêm do funil). Henrique ainda vai testar as telas |
| 8 | Revisão final: erros, estados vazios, testes dos fluxos críticos, segurança, celular | em andamento (23/10/2026): segurança revisada, telas revisadas no computador e no celular, testes de navegador novos, limite na importação, página "remover meus dados", política de privacidade (rascunho). Falta o que depende do Henrique: domínio e provedor de e-mail (recuperação de senha e confirmação de e-mail), hospedagem, identificação completa do responsável na política. Código no GitHub (`iluvhenriq/prospen`, privado), branch `master` |
| 9 | Nova identidade e diferenciais | em andamento (27/10/2026): identidade nova, página de pré-venda ("mesa do vendedor"), telas internas, tema escuro, contato em um clique, registro de contato com próxima ação, tela "Hoje", aprendizado com os resultados, recém-abertas com buscas vigiadas e radar de mudanças na Receita (painel e página do lead), exportação de leads em CSV, pontuação ajustada ao cliente ideal e planos com equipe por convite (28/10/2026) concluídos. A busca não usa o cliente ideal na ordem (medido: lento demais sem índice novo, decisão do Henrique). Depois: primeiro assistente de inteligência artificial, só após validar a pré-venda |

Fora do MVP, de propósito: Google Ads, Meta Ads, formulários de captação, automação, inteligência artificial e cobrança automática. Planos existem desde 28/10/2026, com liberação manual. Não implemente antes da hora. Exceção decidida em 27/10/2026: um primeiro assistente de inteligência artificial entra logo depois de a pré-venda ser validada (não antes).

## Stack

TypeScript, Next.js (App Router, versão 16), PostgreSQL, Drizzle ORM, Better Auth, Zod, Tailwind CSS, Vitest. Componentes visuais próprios em `src/components/ui` (sem shadcn). Identidade: verde-musgo e marca-texto amarelo (só destaque), fonte Schibsted Grotesk. Tema claro por padrão e escuro como opção de cada pessoa (variáveis em `globals.css`, `<html data-escuro>`): use as cores com papel (`acao`, `tinta`, `texto`, `superficie`), nunca `text-white` sobre verde. Sem roxo na interface (detalhes e o que evitar em `docs/arquitetura.md`, seção 7.1).

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
| `npm run conta:exportar -- email` | Pedido do titular: dados da conta em JSON (confira a identidade antes) |
| `npm run conta:excluir -- email --confirmar` | Pedido do titular: apaga a conta e as empresas só dela. Sem volta |
| `iniciar-prospen.cmd` (dois cliques) | Abre o PROSPEN como app no PC (versão de produção). Depois de mudar o código, rode `npm run build` |
| `npx tsx scripts/gerar-icones.ts` | Refaz os ícones do app instalável se o ícone mudar |
| `npm run pre-cadastro:listar > arquivo.csv` | Lista do pré-cadastro da pré-venda (dados pessoais: não compartilhe) |
| `npm run pre-cadastro:excluir -- email` | Tira uma pessoa da lista de pré-cadastro |
| `npm run plano:definir -- email-do-dono grande [--fundador]` | Libera o plano depois de conferir o pagamento (sem o plano, só mostra o atual) |

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
- PostgreSQL local com memória ajustada por `ALTER SYSTEM` (veja `docs/arquitetura.md`). Reiniciar o serviço exige administrador; o Claude não consegue.
- O comando `tar` do Git Bash é outro programa e quebra caminhos com "C:". Rode os testes da importação da base pelo PowerShell.
- A fonte vem do pacote `@fontsource-variable/schibsted-grotesk` (via `next/font/local`), não do Google Fonts.
- `npm run dev` recarregando a página sem parar logo depois de um build, ou mudança no `globals.css` que não aparece (o CSS servido fica misturado com a versão antiga): pare o servidor e apague `.next\dev` (reiniciar sozinho não resolve).
- Toda ação do servidor nova precisa começar por `exigirPermissao`, senão `tests/arquitetura.test.ts` falha. Ação pública entra na lista `PUBLICAS` desse teste, com motivo.
- `npm run test:e2e` já usa os 10 cadastros por hora permitidos por endereço (`cadastroPorIp`). Teste de navegador novo que crie conta faz outro falhar com "Muitas tentativas": aproveite a conta de um teste existente (como a exportação, dentro de `e2e/importacao.spec.ts`).
- O PGlite em modo servidor só aceita várias conexões com `maxConnections` maior que 1. Isso é só do ambiente de teste, não do produto.

## Pendências e riscos conhecidos

- Sem recuperação de senha e sem verificação de e-mail (dependem de provedor de e-mail). **Obrigatório antes de abrir para clientes.**
- **Pré-venda (24/10/2026):** a página inicial é a apresentação com pré-cadastro. Textos só com o que o produto faz (nada de números, depoimentos ou preço). Para publicar só a pré-venda: `MODO_PRE_VENDA=1` antes do build. Domínio provável: prospen.app (o `.app` exige HTTPS).
- **Conformidade (23/10/2026):** o PROSPEN se trata como alto risco (Resolução CD/ANPD nº 2/2022): encarregado indicado, prazos normais. Documentos em `docs/lgpd/`; mudou o tratamento de dados, atualize o documento na mesma mudança. Registros de acesso: 6 meses (Marco Civil). Pedidos de titulares: `npm run conta:exportar` e `npm run conta:excluir`. Busca limitada a 300 páginas por dia por empresa.
- **LGPD (decidido em 23/10/2026, padrão de mercado):** leads da base pública usam "legítimo interesse" e guardam origem e base legal. MEIs entram, mas o CPF no fim da razão social é retirado na importação. CNPJ removido a pedido entra numa lista de exclusão e não volta. Página "remover meus dados" pronta (`/remover-meus-dados`, automática, com limites contra abuso). Política de privacidade em `/privacidade` (rascunho). Sem CPF e sem nome completo do responsável, mesmo com vendas: risco aceito pelo Henrique em 24/10/2026, já informado dos riscos (nota fiscal, imposto, decreto do comércio eletrônico). Não insista; reavaliar só a partir de abril de 2027. Faltam provedor de hospedagem e revisão de advogado. Detalhes em `docs/arquitetura.md`.
- O limite de tentativas de login vive na memória do servidor. Com mais de um servidor, mover para o banco. O limite por endereço depende do cabeçalho `x-forwarded-for`.
- **Regra de duplicados (decidida em 22/10/2026, no banco e no repositório desde 23/10):** lead com CNPJ é único pelo CNPJ dentro da empresa. E-mail e telefone são únicos só entre leads sem CNPJ (manual e planilha). O CNPJ pode ser alfanumérico (regra da Receita desde 07/2026): use `src/modules/leads/cnpj.ts`, nunca "14 números". A página do lead avisa quando o e-mail ou telefone está em outros leads da empresa.
- Mensagens de validação e erro geradas na lógica ficam em `ptBR.mensagens` (movidas em 23/10/2026). Não escreva texto visível solto em `src/modules`.
- Exportação de leads em CSV (28/10/2026, `/painel/leads/exportar`, só administrador e dono, até 10.000 por vez): células que começam com `=`, `+`, `-` ou `@` saem com apóstrofo (`celulaSegura` em `src/modules/leads/exportacao.ts`). Toda rota (`route.ts`) dentro de `/painel` também começa por `exigirPermissao` (cobrado em `tests/arquitetura.test.ts`).
- Limites de login e de importação (20 planilhas e 60 conferências por hora por empresa) vivem na memória do servidor.
- Importação só aceita CSV, até 2 MB e 5.000 linhas.
- **Planos (28/10/2026):** regras e preços em `src/modules/planos/planos.ts`. Recurso novo que for de um plano só: entra em `RECURSOS`, é conferido na ação ou rota (`temRecurso`) e a tela mostra `AvisoDoPlano`. Empresa sem plano gravado fica no Pequeno (`PLANO_PADRAO`): **teste grátis ou bloqueio até pagar ainda é decisão do Henrique**. O limite mensal é um contador (`uso_mensal`), não a contagem de leads: apagar lead não devolve vaga. O limite de usuários vale no login (`membershipLimit` em `auth-config.ts`). Testes de navegador que usam recurso pago chamam `definirPlano` (`e2e/apoio.ts`).
- **Convite sem e-mail de confirmação:** quem tiver o link E criar conta com o e-mail convidado entra na equipe. Enquanto não houver provedor de e-mail, o link só deve ir para a pessoa certa. Ao ligar o e-mail, ativar `requireEmailVerificationOnInvitation`.

## Ambiente do Henrique

Windows, VS Code e PowerShell. Node 24, npm 11, Git e PostgreSQL instalados, sem Docker. Disco D com bastante espaço, planejado para os arquivos pesados da base de CNPJ (etapa 5). Use comandos do PowerShell, não do Linux.
