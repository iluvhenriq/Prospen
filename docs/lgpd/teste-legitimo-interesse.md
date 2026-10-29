# Teste de legítimo interesse: base pública de CNPJ

Rascunho de 23/10/2026, a revisar com advogado. Segue as três fases do Guia Orientativo da ANPD sobre legítimo interesse (2024). Exigido pela LGPD, art. 10, e pode ser pedido pela ANPD (art. 10, § 3º).

**Controlador:** responsável indicado em `src/lib/responsavel.ts` (hoje: Henrique, contato.henriqdev@gmail.com).
**Tratamento avaliado:** importar os dados abertos do CNPJ da Receita Federal, guardar as empresas ativas, calcular uma pontuação e mostrá-las na busca do PROSPEN para empresas clientes, que podem salvá-las como leads.
**Por que há dado pessoal:** a maior parte da base é de pessoa jurídica (não é dado pessoal), mas o microempreendedor individual (MEI, 56% dos ativos de SP) é uma pessoa natural, e o nome, o telefone e o e-mail do cadastro podem identificar pessoas.

## Fase 1: finalidade legítima

- **Interesse:** do PROSPEN (oferecer o serviço) e das empresas clientes (encontrar outras empresas como clientes). Atividade econômica lícita (livre iniciativa, Constituição, art. 170).
- **Situação concreta:** prospecção entre empresas, com dados que a Receita publica justamente para dar transparência sobre quem são as empresas ativas.
- **Finalidade compatível com a publicação (art. 7º, § 7º):** os dados são publicados para identificar empresas e permitir relações comerciais com elas. Usá-los para achar fornecedores e clientes é compatível com isso.
- **Não é:** venda da base, uso para crédito, cobrança, marketing para consumidor final ou decisões sobre pessoas.

## Fase 2: necessidade

- **Só o necessário:** só empresas ativas; sem o quadro de sócios; CPF retirado do nome do MEI na importação e nunca exibido (`src/integrations/receita-cnpj/leitura.ts`).
- **Sem alternativa menos invasiva para o mesmo fim:** pedir consentimento a milhões de empresas antes de existir qualquer contato é inviável, e a base já é pública.
- **MEI fica de fora por padrão** na busca: só aparece se o cliente marcar "Incluir MEI".
- **Pontuação** usa só dados do cadastro (telefone, e-mail, idade da empresa, porte, matriz, MEI). Nada de dado sensível, nada de fonte externa.

## Fase 3: balanceamento e salvaguardas

- **Expectativa do titular:** quem abre uma empresa sabe que o cadastro é público e que empresas recebem contatos comerciais. A expectativa é menor para o MEI, por isso as salvaguardas extras abaixo.
- **Impacto possível:** receber contatos comerciais indesejados. Não há efeito sobre crédito, emprego ou direitos.
- **Salvaguardas em funcionamento:**
  - Página pública "remover meus dados" (`/remover-meus-dados`), sem login, com efeito imediato e permanente (a lista de exclusão é aplicada em toda busca e ao salvar lead, inclusive depois de novas cargas da base).
  - Política de privacidade pública explicando origem, finalidade, base legal e a pontuação (art. 20).
  - Termos de uso que proíbem spam sem descadastro, contato com quem pediu para não ser contatado, revenda e extração em massa da base.
  - O cliente que salva um lead vira controlador dele e assume as obrigações de controlador (termos, seção 4).
  - Isolamento entre empresas clientes no banco e nos repositórios (testado).
  - Limite de 300 páginas da busca (15 mil empresas) por dia por empresa cliente, contra a extração em massa que os termos proíbem.
- **Salvaguarda pendente:** confirmação de e-mail no cadastro (depende de provedor de e-mail), para dificultar contas falsas.

## Conclusão

O legítimo interesse é adequado para este tratamento, desde que as salvaguardas acima continuem funcionando. Reavaliar quando: a base passar a incluir outro dado (sócios, por exemplo), surgir outra finalidade, a ANPD publicar orientação específica sobre dados públicos de CNPJ, ou houver reclamação relevante de titulares.
