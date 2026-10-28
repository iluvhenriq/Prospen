# Product

<!-- impeccable:product-schema 1 -->

Registro do que é verdade sobre o PROSPEN, para orientar decisões de produto e de interface. Não descreve o visual (isso está em `docs/arquitetura.md`, seção 7.1). Confirmado com o Henrique em 27/10/2026.

## Platform

web

## Users

- **Usuário principal: o vendedor, no computador.** Uma pessoa ou uma pequena equipe só de vendas, que passa horas seguidas no sistema ligando e mandando mensagem. O trabalho é achar empresas para contatar, decidir a ordem e acompanhar cada negociação até fechar ou perder.
- **Quem compra:** pequenas empresas e equipes comerciais que vendem para outras empresas, como agências, escritórios de contabilidade, fornecedores, prestadores de serviço e representantes.
- O celular precisa funcionar, mas não é o lugar principal de uso.

## Product Purpose

Plataforma de aquisição de leads e gestão de vendas para quem vende para outras empresas. Junta num lugar só:

1. a busca de empresas ativas na base pública de CNPJ da Receita Federal;
2. uma pontuação que diz quem contatar primeiro e por quê;
3. a lista de leads (com importação de planilha);
4. o funil de vendas, as campanhas e o painel de indicadores.

Sucesso é o vendedor gastar o tempo dele conversando com as empresas certas, não montando lista nem alimentando planilha.

## Positioning

O diferencial é a junção, não um recurso isolado: achar a empresa, saber quem vale contatar primeiro (com o motivo de cada ponto), trabalhar só com dados oficiais e limpos, e acompanhar a venda até o fim, sem trocar de ferramenta. As alternativas (Econodata, Speedio, CNPJ.biz, lista comprada em planilha) costumam entregar a lista e parar aí, ou usar dados de origem duvidosa.


**Planos futuros, ainda não construídos** (nunca anunciar como recurso pronto):
- assistente de inteligência artificial dentro da plataforma, para ajudar o vendedor. É o primeiro passo depois que a pré-venda for validada;
- tráfego pago próprio (anúncios feitos pela plataforma), algum dia.

## Operating Context

- Mercado brasileiro, só em português do Brasil por enquanto. O plano é ir para o exterior daqui a cerca de 1 ano: país, moeda, fuso e idioma são da empresa cliente, nunca fixos.
- Fase atual: pré-venda. A página inicial é a apresentação com pré-cadastro. O produto só vai ao ar depois da meta de pré-cadastros.
- Vocabulário do usuário: CNPJ, MEI, razão social, porte, atividade (CNAE), lead, funil, etapa (Novo, Contatado, Em conversa, Proposta, Ganho, Perdido), proposta, motivo da perda.
- Cada empresa cliente tem papéis (dono e outros membros) e só vê os próprios dados.

## Capabilities and Constraints

**Pronto:** login e empresas com papéis; leads com notas, etiquetas e importação de CSV (até 2 MB e 5.000 linhas); contato em um clique (WhatsApp para celular, ligar, e-mail); registro de cada tentativa de contato com próxima ação e a tela "Hoje"; aprendizado com os resultados no painel (taxa de fechamento por prioridade e por origem, motivo de perda por porte, insistência), só a partir de 5 casos por grupo; filtro de empresas abertas nos últimos 90 dias e buscas vigiadas, com as novas no painel; radar no painel com as mudanças da Receita nas empresas dos leads (nova unidade, mudou de cidade ou de atividade, deixou de constar como ativa), a partir do segundo mês importado, também na página do lead; exportação dos leads em CSV (só administrador e dono, até 10.000 por vez); nota ajustada ao cliente ideal de cada empresa (porte que atende, empresas novas ou estabelecidas, se atende MEI) nos leads, com a busca marcando as empresas que combinam; funil com histórico, valor da venda e motivo da perda; busca na base pública (hoje só São Paulo carregado localmente) por estado, cidade, atividade e CNPJ exato, sem MEI por padrão; pontuação de 0 a 100 com motivos; campanhas manuais; painel de indicadores; página "remover meus dados"; política de privacidade (rascunho).

**Fora do produto, de propósito, por enquanto:** Google Ads, Meta Ads, formulários de captação, automação, inteligência artificial, cobrança e planos.

**Limites e regras que a interface precisa respeitar:**
- Busca limitada a 300 páginas por dia por empresa.
- Lead com CNPJ é único pelo CNPJ dentro da empresa. E-mail e telefone são únicos só entre leads sem CNPJ.
- CNPJ pode ter letras (regra da Receita desde 07/2026).
- Falta recuperação de senha e confirmação de e-mail (dependem de provedor de e-mail).

**Em aberto:** busca por nome da empresa; preço e planos; domínio (provável prospen.app) e hospedagem.

## Brand Commitments

- Nome: PROSPEN.
- Verde-musgo é a cor da marca. Sem roxo na interface (decisão de 27/10/2026: roxo é padrão demais).
- Tom: português do Brasil simples, direto e profissional. Sem siglas e termos em inglês quando houver equivalente claro. Sem travessão.
- O visual não pode parecer gerado por inteligência artificial.

## Evidence on Hand

**Existe e pode ser usado:**
- O próprio produto funcionando no computador do Henrique, com as telas reais.
- As regras reais da pontuação (`src/modules/pontuacao/regras.ts`), já usadas no exemplo da página inicial.
- Números da base pública de São Paulo (outubro de 2026): 8,8 milhões de empresas ativas, das quais 56% são MEI. É dado oficial; se for usado em texto público, citar a fonte e o mês.

**Não existe e não pode ser inventado:** clientes, depoimentos, logos de clientes, resultados de campanha, métricas de uso, preço, prazos de lançamento e comparações de desempenho com concorrentes. Estado vazio real é melhor que dado falso.

## Product Principles

1. **Dado real ou nada.** Nenhum lead, número ou resultado inventado, nem em demonstração. Vazio honesto vale mais que exemplo bonito.
2. **Sempre dizer o porquê.** Pontuação sem motivo, número sem origem ou aviso sem saída não servem ao vendedor.
3. **Feito para quem passa o dia nisso.** O vendedor usa por horas: velocidade, leitura rápida de listas e poucos cliques contam mais que efeito visual.
4. **Um lugar só.** Achar, priorizar e acompanhar sem trocar de ferramenta. Recurso novo só entra se não complicar o que já existe.
5. **Respeito a quem está na base.** Só dado oficial, base legal registrada e remoção fácil para qualquer empresa que pedir.

## Accessibility & Inclusion

- Texto e fundo com contraste de pelo menos 4,5:1; bordas de campo e foco, 3:1.
- Tudo usável pelo teclado, com foco visível.
- Movimento reduzido respeitado.
- Campos com 16px no celular, para o iPhone não aproximar a tela.
