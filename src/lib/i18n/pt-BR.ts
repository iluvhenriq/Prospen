// Todos os textos visíveis ao usuário ficam em arquivos de idioma.
// Hoje só existe português do Brasil. Para adicionar outro idioma no futuro,
// crie um arquivo irmão com as mesmas chaves, sem mexer nas telas.

// "1 repetida", "2 repetidas": número formatado com a palavra no singular ou plural.
function quantidade(total: number, singular: string, plural: string): string {
  return `${total.toLocaleString("pt-BR")} ${total === 1 ? singular : plural}`;
}

export const ptBR = {
  app: {
    nome: "PROSPEN",
    descricao: "Plataforma de aquisição de leads e gestão de marketing.",
  },
  inicio: {
    status: "Em construção",
    detalhe: "As funcionalidades chegam por etapas. Já é possível criar uma conta e a sua empresa.",
  },
  // Página de apresentação e pré-cadastro (pré-venda, 24/10/2026). Só o que o
  // produto faz de verdade: sem números inventados nem depoimentos. Preços
  // desde 28/10/2026 (seção de planos, textos em `planos.pagina`).
  preVenda: {
    tituloDaAba: "PROSPEN: saiba para quem ligar primeiro",
    menu: { comoFunciona: "Como funciona", perguntas: "Perguntas", entrar: "Entrar" },
    titulo: "Saiba para quem ligar primeiro.",
    subtitulo:
      "O PROSPEN busca empresas ativas na base oficial da Receita Federal e mostra quais valem o seu contato primeiro, com nota de 0 a 100 e o motivo de cada ponto. Depois, acompanha cada negociação até fechar.",
    chamada: "Fazer pré-cadastro",
    chamadaApoio: "Pré-venda aberta, sem custo e sem compromisso. Avisamos quando abrir.",
    // Com o app aberto (sem MODO_PRE_VENDA), a chamada leva para criar a conta.
    chamadaAberto: "Criar conta grátis",
    chamadaApoioAberto: (limite: number) =>
      `Teste com ${limite} empresas por mês, sem cartão. Para salvar mais, assine um plano.`,
    // Demonstração da abertura: a tela de busca com nomes ocultos. Cada linha é
    // um perfil, não uma empresa; os pontos saem de src/modules/pontuacao/regras.ts.
    demonstracao: {
      rotulo: "Demonstração da busca do PROSPEN",
      tituloLista: "Busca de empresas",
      filtros: "SP, São Paulo, Restaurantes e similares, sem MEI",
      ordem: "Da maior prioridade para a menor",
      empresaOculta: "Empresa com nome oculto",
      linha: (pontos: number, faixa: string) => `${pontos} pontos, ${faixa}`,
      // Selo curto, para caber na linha no celular.
      faixasCurtas: { alta: "Alta", media: "Média", baixa: "Baixa" },
      tituloConta: "Conta da nota",
      deCem: "de 100",
      dica: "Clique numa empresa da lista para ver a conta da nota.",
      legenda: "Ilustração: nomes ocultos, pontos calculados pelas regras reais do PROSPEN.",
    },
    // Número real da base de SP (importação de outubro de 2026).
    tamanhoDaBase: {
      numero: "8,8 milhões",
      titulo: "de empresas ativas só em São Paulo.",
      texto: "Ninguém liga para todas. O PROSPEN ordena a lista para você começar pelas que valem o contato e deixar o resto para depois.",
      fonte: "Base pública de CNPJ da Receita Federal, outubro de 2026.",
    },
    comoFunciona: {
      titulo: "Do cadastro da Receita ao contrato assinado",
      passos: [
        {
          titulo: "Busque",
          texto: "Filtre empresas ativas por estado, cidade e atividade. As mais promissoras aparecem primeiro.",
          itens: [
            "Base pública de CNPJ, com telefone e e-mail do cadastro da Receita.",
            "Pontuação de 0 a 100 com o motivo de cada ponto.",
            "Microempreendedores ficam de fora, a menos que você queira.",
          ],
        },
        {
          titulo: "Salve como lead",
          texto: "Marque as que interessam e elas entram na sua lista, sem duplicar. Ou importe a planilha que você já tem.",
          itens: [
            "Importação de CSV, conferida linha por linha antes de gravar.",
            "Aviso quando o mesmo contato aparece em vários leads.",
          ],
        },
        {
          titulo: "Acompanhe até fechar",
          texto: "Mova cada lead pelo funil, anote as conversas e veja quanto vendeu e por que perdeu.",
          itens: [
            "Funil de Novo a Ganho ou Perdido, com histórico e valor da venda.",
            "Campanhas com custo e retorno calculados pelo próprio funil.",
            "Painel com conversão, valor vendido e motivos de perda.",
          ],
        },
      ],
    },
    // Comparação com a lista comprada: só o que o PROSPEN faz hoje.
    comparacao: {
      titulo: "O que muda em relação à planilha comprada",
      colunas: { planilha: "Planilha comprada", prospen: "Com o PROSPEN" },
      linhas: [
        {
          tema: "De onde vêm os dados",
          planilha: "Origem que ninguém explica",
          prospen: "Base oficial da Receita Federal, só empresas ativas",
        },
        {
          tema: "Por onde começar",
          planilha: "Todas as linhas parecem iguais",
          prospen: "Nota de 0 a 100, com o motivo de cada ponto",
        },
        {
          tema: "Contatos repetidos",
          planilha: "Você confere à mão",
          prospen: "O mesmo CNPJ não entra duas vezes",
        },
        {
          tema: "Depois do primeiro contato",
          planilha: "Outra ferramenta, ou nenhuma",
          prospen: "Funil, campanhas e painel no mesmo lugar",
        },
        {
          tema: "Empresa que pede para sair",
          planilha: "Continua na lista",
          prospen: "Sai da busca na hora, pela página pública de remoção",
        },
      ],
    },
    paraQuem: {
      titulo: "Para quem é",
      texto:
        "Pequenas empresas e equipes comerciais que vendem para outras empresas: agências, escritórios de contabilidade, fornecedores, prestadores de serviço e representantes.",
    },
    responsavel: {
      titulo: "Dados de forma responsável",
      itens: [
        "Fonte oficial: dados abertos da Receita Federal, só empresas ativas.",
        "Sem listas compradas e sem copiar dados de redes sociais ou mapas.",
        "Qualquer empresa pode sair da busca na hora, pela página pública de remoção.",
        "Os dados de cada cliente ficam separados e nunca aparecem para outro.",
      ],
    },
    perguntas: {
      titulo: "Perguntas frequentes",
      itens: [
        {
          pergunta: "Quanto custa?",
          resposta: "Três planos: Pequeno (R$ 97 por mês), Médio (R$ 177) e Grande (R$ 197), na seção de planos acima. Os 20 primeiros clientes são fundadores e ficam com o preço travado. O pré-cadastro não tem custo nem compromisso.",
        },
        {
          pergunta: "Quando abre?",
          resposta: "Ainda sem data definida. Quem fizer o pré-cadastro recebe o aviso primeiro.",
        },
        {
          pergunta: "Quais estados a busca cobre?",
          resposta: "Começamos por São Paulo: são 8,8 milhões de empresas ativas na base da Receita de outubro de 2026, das quais 56% são MEI (que ficam de fora, a menos que você queira). Os outros estados entram aos poucos. A Receita publica uma nova versão da base todo mês, e o PROSPEN é atualizado a partir dessas publicações.",
        },
        {
          pergunta: "O telefone e o e-mail são do dono da empresa?",
          resposta: "Nem sempre. Eles vêm do cadastro na Receita, e muitas vezes são do escritório de contabilidade. O PROSPEN avisa quando o mesmo contato aparece em vários leads seus e dá menos prioridade a e-mails com cara de contador.",
        },
        {
          pergunta: "Posso usar a minha lista de contatos?",
          resposta: "Sim. Você importa uma planilha CSV e os seus contatos entram no mesmo funil das empresas da busca.",
        },
        {
          pergunta: "Isso está de acordo com a LGPD?",
          resposta: "A busca usa dados que a Receita torna públicos, com base no legítimo interesse para prospecção entre empresas, e qualquer empresa pode sair dela. Quem salva um lead passa a responder pelo uso que faz dele, como explicam os termos de uso.",
        },
      ],
    },
    formulario: {
      titulo: "Faça o seu pré-cadastro",
      texto: "Deixe o seu contato e avisamos quando o PROSPEN abrir, com as condições da pré-venda.",
      nome: "Seu nome",
      email: "E-mail",
      empresa: "Empresa (opcional)",
      // Perguntas opcionais (27/10/2026). Mesma ordem das listas do banco
      // (src/db/schema/pre-cadastros.ts); um teste confere.
      segmento: "O que a sua empresa vende? (opcional)",
      segmentoNenhum: "Prefiro não dizer",
      segmentos: {
        agencia: "Marketing, sites ou publicidade (agência)",
        contabilidade: "Contabilidade",
        fornecedor: "Produtos para outras empresas (fornecedor ou indústria)",
        servicos: "Serviços para outras empresas",
        representante: "Representação comercial",
        outro: "Outra coisa",
      },
      interessesTitulo: "O que mais ajudaria a sua venda? (opcional)",
      interessesAviso: "Ainda estamos decidindo o que construir. Nada desta lista está pronto.",
      interesses: {
        sinais: "Avisos de oportunidade: empresa que abriu nova unidade, mudou de endereço ou de atividade",
        necessidades: "Empresas que precisam do que eu vendo, com a evidência (ex.: site fora do ar)",
        mapa: "Mapa do mercado: onde há empresas do meu segmento que ainda não prospectei",
        perfil: "Achar empresas parecidas com os meus melhores clientes",
        dossie: "Resumo pronto de cada empresa antes da ligação",
      },
      botao: "Fazer pré-cadastro",
      nomeObrigatorio: "Informe o seu nome.",
      nomeLongo: "Use no máximo 80 caracteres.",
      emailInvalido: "Confira o e-mail.",
      empresaLonga: "Use no máximo 120 caracteres.",
      muitosEnvios: "Recebemos muitos envios em pouco tempo. Tente de novo mais tarde.",
      falhou: "Não foi possível registrar agora. Tente de novo em instantes.",
      pronto: "Pronto, você está na lista. Vamos avisar por e-mail quando o PROSPEN abrir.",
      // "Usamos seus dados só para ... Para sair da lista, escreva para EMAIL. Veja a POLÍTICA."
      avisoInicio:
        "Usamos o seu nome e e-mail só para avisar sobre a abertura e as condições da pré-venda, e as respostas opcionais só para decidir o que construir. Para sair da lista, escreva para",
      avisoFim: "Veja a",
    },
    rodape: {
      contato: "Contato:",
      direitos: "© PROSPEN",
    },
  },
  navegacao: {
    entrar: "Entrar",
    criarConta: "Criar conta",
    sair: "Sair",
    irParaConteudo: "Ir para o conteúdo",
  },
  acesso: {
    campos: {
      nome: "Seu nome",
      email: "E-mail",
      senha: "Senha",
      empresa: "Nome da empresa",
    },
    entrar: {
      titulo: "Entrar",
      descricao: "Acesse a sua conta da PROSPEN.",
      botao: "Entrar",
      semConta: "Ainda não tem conta?",
      linkCadastro: "Criar conta",
      esqueci: "Esqueci minha senha",
      senhaTrocada: "Senha trocada. Entre com a senha nova.",
      jaConfirmado: "Seu e-mail já está confirmado. Entre com a sua senha.",
    },
    cadastro: {
      titulo: "Criar conta",
      descricao: "Leva menos de um minuto.",
      botao: "Criar conta",
      ajudaSenha: "Use pelo menos 8 caracteres.",
      temConta: "Já tem conta?",
      linkEntrar: "Entrar",
      enviado: (email: string) =>
        `Enviamos um link para ${email}. Abra o e-mail e clique no link para entrar. Não chegou? Confira o spam ou entre com a sua senha para receber outro.`,
    },
    // Link do e-mail de confirmação: um botão, não a entrada automática, porque
    // alguns provedores de e-mail abrem os links sozinhos para conferir.
    confirmar: {
      titulo: "Confirmar e-mail",
      descricao: "Falta um clique para entrar no PROSPEN.",
      botao: "Confirmar e entrar",
      semLink: "Link incompleto. Abra de novo o link que chegou no seu e-mail.",
      invalido: "Este link venceu ou não vale mais. Entre com a sua senha e enviamos outro.",
    },
    esqueci: {
      titulo: "Esqueci minha senha",
      descricao: "Informe o e-mail da conta. Enviamos um link para criar uma senha nova.",
      botao: "Enviar link",
      enviado: "Se existir uma conta com este e-mail, o link chega em instantes e vale por 1 hora. Confira também o spam.",
      voltar: "Voltar para entrar",
    },
    novaSenha: {
      titulo: "Criar senha nova",
      descricao: "Escolha a senha nova da sua conta. Quem estiver com a conta aberta em outro aparelho vai precisar entrar de novo.",
      campo: "Senha nova",
      botao: "Salvar senha nova",
      semLink: "Link incompleto. Abra de novo o link que chegou no seu e-mail.",
      invalido: "Este link venceu ou já foi usado. Peça outro.",
      pedirOutro: "Pedir outro link",
    },
    organizacao: {
      titulo: "Qual é o nome da sua empresa?",
      descricao: "Seus leads e campanhas ficam guardados nela, separados de qualquer outra empresa.",
      botao: "Continuar",
      saudacao: (nome: string) => `Olá, ${nome}.`,
      exemplo: "Ex.: Barbearia Central",
      temConvite: "Recebeu um convite para a equipe de uma empresa? Não crie outra: abra o link do convite.",
    },
    limiteTentativas: (minutos: number) =>
      `Muitas tentativas. Tente de novo em ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
  },
  // E-mails da conta (src/modules/contas/emails.ts). Texto simples, sem imagem.
  // As validades seguem VALIDADE_CONFIRMACAO_S e VALIDADE_NOVA_SENHA_S (auth-config.ts).
  emails: {
    assinatura: "Equipe PROSPEN",
    confirmacao: {
      assunto: "Confirme seu e-mail no PROSPEN",
      linhas: (nome: string, link: string) => [
        `Olá, ${nome}.`,
        "",
        "Para entrar no PROSPEN, confirme o seu e-mail abrindo o link abaixo:",
        link,
        "",
        "O link vale por 24 horas.",
        "Se você não criou uma conta no PROSPEN, ignore este e-mail.",
      ],
    },
    novaSenha: {
      assunto: "Senha nova no PROSPEN",
      linhas: (nome: string, link: string) => [
        `Olá, ${nome}.`,
        "",
        "Para criar uma senha nova, abra o link abaixo:",
        link,
        "",
        "O link vale por 1 hora e só pode ser usado uma vez.",
        "Se você não pediu, ignore este e-mail: a sua senha continua a mesma.",
      ],
    },
    contaExistente: {
      assunto: "Tentaram criar uma conta com o seu e-mail",
      linhas: (nome: string, entrar: string, esqueci: string) => [
        `Olá, ${nome}.`,
        "",
        "Alguém tentou criar uma conta no PROSPEN com o seu e-mail, mas você já tem uma.",
        `Para entrar: ${entrar}`,
        `Esqueceu a senha? ${esqueci}`,
        "",
        "Se não foi você, pode ignorar: nada mudou na sua conta.",
      ],
    },
  },
  painel: {
    titulo: "Painel",
    saudacao: (nome: string) => `Olá, ${nome}`,
    empresa: (nome: string) => `Empresa: ${nome}`,
    leads: "Leads",
    leadsVazioTitulo: "Você ainda não tem leads",
    leadsVazioDescricao:
      "Busque empresas na base pública, cadastre um lead ou importe uma planilha para começar a montar a sua lista.",
    leadsTotal: (total: number) =>
      total === 1 ? "1 lead cadastrado" : `${total} leads cadastrados`,
    verLeads: "Ver leads",
    verFunil: "Ver funil",
    indicadores: {
      total: "Leads",
      novos: (dias: number) => `Novos nos últimos ${dias} dias`,
      emAndamento: "Em andamento",
      emAndamentoAjuda: "De Novo até Proposta",
      conversao: "Taxa de conversão",
      conversaoAjuda: (ganhos: number, encerrados: number) =>
        `${quantidade(ganhos, "ganho", "ganhos")} de ${quantidade(encerrados, "encerrado", "encerrados")}`,
      conversaoSemDados: "Ainda não há leads em Ganho ou Perdido.",
      vendido: "Valor vendido",
      vendidoAjuda: (vendas: number) => quantidade(vendas, "venda com valor", "vendas com valor"),
      ticketMedio: (valor: string) => `Ticket médio: ${valor}`,
      vendidoSemDados: "Nenhuma venda com valor informado.",
      ganhosSemValor: (total: number) =>
        `${quantidade(total, "lead em Ganho está", "leads em Ganho estão")} sem valor. Preencha na página do lead.`,
      funilTitulo: "Leads por etapa",
      funilDescricao: "Onde cada lead está agora.",
      motivosTitulo: "Por que os negócios foram perdidos",
      motivosVazio: "Nenhum lead em Perdido ainda.",
      origensTitulo: "De onde vieram os leads",
      tabela: { item: "Item", quantidade: "Quantidade" },
      nota: "Os números consideram a etapa atual de cada lead, em todo o período.",
    },
    // Empresas novas nas buscas vigiadas (etapa 9e).
    novidades: {
      titulo: "Empresas novas nas suas buscas",
      descricao: (dias: number) => `Abertas nos últimos ${dias} dias, que ainda não são seus leads. Atualiza a cada nova base da Receita.`,
      descricaoDaBusca: (atividade: string, local: string) => (atividade ? `${atividade}, em ${local}` : `Todas as atividades, em ${local}`),
      novas: (total: number, maisQue: boolean) =>
        maisQue ? `${total} ou mais` : total === 1 ? "1 nova" : total === 0 ? "nenhuma nova" : `${total} novas`,
      ver: "Ver empresas",
      parar: "Parar de vigiar",
      paraRotulo: (descricao: string) => `Parar de vigiar ${descricao}`,
      estadoFora: "Estado fora da base carregada",
      vazio: "Vigie uma busca (botão na tela Buscar empresas) e o painel avisa quando abrirem empresas novas nela.",
      buscar: "Buscar empresas",
    },
    // Radar (27/10/2026): mudanças da Receita nas empresas dos leads.
    radar: {
      titulo: "Mudanças nas empresas dos seus leads",
      descricao: "Comparando a base nova da Receita com a anterior. Bom motivo para retomar o contato.",
      vazio: "Nenhuma mudança nas empresas dos seus leads. O radar compara cada nova base mensal da Receita com a anterior.",
      semCnpj: "O radar acompanha os leads com CNPJ. Adicione empresas pela busca e as mudanças delas aparecem aqui.",
      tipos: {
        nova_unidade: (depois: string | null) => (depois ? `Abriu uma nova unidade em ${depois}` : "Abriu uma nova unidade"),
        mudou_cidade: (antes: string | null, depois: string | null) =>
          antes && depois ? `Mudou de ${antes} para ${depois}` : "Mudou de cidade",
        mudou_atividade: (antes: string | null, depois: string | null) =>
          antes && depois ? `Mudou a atividade principal: de "${antes}" para "${depois}"` : "Mudou a atividade principal",
        deixou_ativa: () => "Deixou de constar como ativa na Receita",
      },
      verUnidade: "Ver unidade nova",
      mes: (mes: string) => `Base de ${mes.slice(5, 7)}/${mes.slice(0, 4)}`,
      mostrando: (mostradas: number, total: number) => `Mostrando as ${mostradas} mais recentes de ${total}.`,
      doLeadTitulo: "Mudanças na Receita",
      doLeadDescricao: "O que mudou nesta empresa entre uma base mensal da Receita e outra.",
    },
    // O que os negócios encerrados ensinam (etapa 9d). Sem conclusão com pouco dado.
    aprendizado: {
      titulo: "O que os seus resultados ensinam",
      descricao: "Tirado dos seus negócios encerrados (ganhos e perdidos). Cada conclusão mostra quantos casos tem por trás.",
      poucoDado: (encerrados: number, faltam: number) =>
        `Os aprendizados aparecem a partir de 5 negócios encerrados. Hoje são ${encerrados}; ${faltam === 1 ? "falta 1" : `faltam ${faltam}`}. Marque Ganho ou Perdido no funil conforme as negociações terminarem.`,
      semConclusao: "Ainda não há casos suficientes em nenhum grupo para tirar conclusão. Continue registrando os resultados.",
      nota: (alta: number, baixa: number) =>
        `Leads de prioridade alta fecharam ${alta}% dos negócios; os de prioridade baixa, ${baixa}%.`,
      notaSepara: "A nota está separando bem quem compra.",
      notaNaoSepara: "A nota ainda não separa bem quem compra para você. Vale revisar os critérios com os seus resultados.",
      origem: (origem: string, taxa: number) => `Os leads de ${origem} são os que mais fecham: ${taxa}%.`,
      motivoPorPorte: (porte: string, motivo: string, vezes: number, perdas: number) =>
        `Com ${porte}, o motivo de perda mais comum é ${motivo} (${vezes} de ${perdas} perdas).`,
      insistencia: (poucas: number, total: number) =>
        `${poucas} de ${total} perdas por falta de resposta tiveram uma tentativa de contato ou nenhuma. Insistir mais pode recuperar parte delas.`,
      tentativasNosGanhos: (media: string) => `Os negócios ganhos levaram, em média, ${media} tentativas de contato.`,
      portes: { "01": "microempresas", "03": "empresas de pequeno porte", "05": "empresas de porte maior" } as Record<string, string>,
      porPrioridade: "Fechamento por prioridade",
      porOrigem: "Fechamento por origem",
      colunas: { grupo: "Grupo", ganhos: "Ganhos", perdidos: "Perdidos", taxa: "Fecha" },
      poucosCasos: "poucos casos",
    },
  },
  menu: {
    principal: "Menu principal",
    painel: "Painel",
    hoje: "Hoje",
    leads: "Leads",
    funil: "Funil",
    busca: "Buscar empresas",
    // No celular, para caber o menu inteiro numa linha.
    buscaCurto: "Buscar",
    campanhas: "Campanhas",
    // Grupo da coluna da esquerda com os atalhos do que fazer.
    acoes: "Ações rápidas",
  },
  // Registro de contatos e próxima ação (27/10/2026).
  contatos: {
    titulo: "Contatos",
    descricao: "Registre cada tentativa. Quem está em Novo passa para Contatado.",
    canal: "Por onde",
    canais: { ligacao: "Ligação", whatsapp: "WhatsApp", email: "E-mail", visita: "Visita" },
    resultado: "O que aconteceu",
    resultados: {
      conversou: "Conversou",
      nao_atendeu: "Não atendeu",
      pediu_retorno: "Pediu retorno",
      pediu_proposta: "Pediu proposta",
      sem_interesse: "Sem interesse",
      contato_errado: "Contato errado",
    },
    proximaOpcional: "Próxima ação (opcional)",
    registrar: "Registrar contato",
    registrado: "Contato registrado.",
    registradoEMovido: "Contato registrado. O lead passou para Contatado.",
    historico: "Tentativas",
    vazio: "Nenhum contato registrado ainda.",
    linha: (canal: string, resultado: string) => `${canal}: ${resultado.toLocaleLowerCase("pt-BR")}`,
    por: (nome: string) => `por ${nome}`,
    tentativas: (total: number) => (total === 1 ? "1 tentativa" : `${total} tentativas`),
    ultima: (data: string) => `última em ${data}`,
    // Próxima ação
    proxima: "Próxima ação",
    proximaDescricao: "O que fazer com este lead e quando. Aparece na tela Hoje.",
    proximaData: "Quando",
    proximaTexto: "O que fazer",
    proximaTextoExemplo: "Ex.: ligar para falar com o dono",
    proximaSemData: "Nenhuma próxima ação marcada.",
    salvarProxima: "Salvar próxima ação",
    removerProxima: "Remover",
    proximaSalva: "Próxima ação salva.",
    proximaRemovida: "Próxima ação removida.",
    proximaEm: (data: string) => `Próxima ação: ${data}`,
    proximaCurta: (data: string) => `Próx.: ${data}`,
  },
  // Tela "Hoje": quem contatar no dia, atrasados primeiro.
  hoje: {
    titulo: "Hoje",
    descricao: "Leads com próxima ação até hoje. Os atrasados vêm primeiro.",
    atrasados: "Atrasados",
    doDia: "Para hoje",
    atrasadoHa: (dias: number) => (dias === 1 ? "atrasado há 1 dia" : `atrasado há ${dias} dias`),
    total: (total: number) => (total === 1 ? "1 lead" : `${total} leads`),
    mostrandoParte: (mostrados: number, total: number) => `Mostrando os ${mostrados} primeiros de ${total}.`,
    vazioTitulo: "Nada marcado para hoje",
    vazioDescricao: "Marque a próxima ação na página de cada lead, ou ao registrar um contato, e ela aparece aqui no dia certo.",
    verLeads: "Ver leads",
    // Ao lado do número em destaque, no painel.
    paraContatar: (total: number) => (total === 1 ? "lead para contatar hoje" : "leads para contatar hoje"),
    abrir: "Abrir a lista de hoje",
  },
  // Botões de contato em um clique (WhatsApp só aparece para celular).
  contato: {
    whatsapp: "WhatsApp",
    ligar: "Ligar",
    email: "E-mail",
    whatsappDe: (nome: string) => `Abrir conversa no WhatsApp com ${nome}`,
    ligarPara: (nome: string) => `Ligar para ${nome}`,
    emailPara: (nome: string) => `Escrever e-mail para ${nome}`,
  },
  // Tema da tela (claro, escuro ou igual ao sistema), escolha de cada pessoa.
  tema: {
    rotulo: "Tema da tela",
    opcoes: { claro: "Claro", escuro: "Escuro", sistema: "Sistema" },
    atual: (tema: string) => `Tema: ${tema}`,
    trocar: (atual: string, proximo: string) => `Trocar o tema (agora ${atual}, próximo ${proximo})`,
  },
  busca: {
    titulo: "Buscar empresas",
    descricao:
      "Empresas ativas da base pública de CNPJ da Receita Federal. Escolha o estado, filtre e adicione as que interessam como leads.",
    semBaseTitulo: "A base pública ainda não foi carregada",
    semBaseDescricao:
      "Nenhum estado da base de CNPJ foi importado neste ambiente. Quem administra o sistema carrega com npm run cnpj:importar.",
    filtros: {
      estado: "Estado",
      escolhaEstado: "Escolha o estado",
      cidade: "Cidade",
      todasCidades: "Todas as cidades",
      cidadeDepoisDoEstado: "Escolha o estado e clique em Buscar para ver as cidades.",
      atividade: "Atividade",
      atividadePlaceholder: "Ex.: padaria, oficina mecânica, contabilidade",
      cnpj: "Ou busque um CNPJ",
      cnpjPlaceholder: "00.000.000/0000-00",
      cnpjAjuda: "Com CNPJ, os outros filtros são ignorados.",
      incluirMei: "Incluir MEI",
      incluirMeiAjuda: "Microempreendedores individuais são mais da metade da base. Ficam de fora a menos que você marque.",
      buscar: "Buscar",
      limpar: "Limpar",
    },
    cnpjInvalido: (texto: string) => `"${texto}" não é um CNPJ válido. Confira os números.`,
    cnpjNaoEncontradoTitulo: "CNPJ não encontrado",
    cnpjNaoEncontradoDescricao:
      "Ele não está entre as empresas ativas dos estados carregados. Pode estar baixado, ser de outro estado ou ter pedido para sair da base.",
    escolhaEstadoTitulo: "Escolha um estado para começar",
    escolhaEstadoDescricao: "Depois, se quiser, filtre por cidade e atividade. Ou busque direto por um CNPJ.",
    atividadeNaoEncontrada: (texto: string) => `Nenhuma atividade encontrada para "${texto}". Tente outra palavra.`,
    atividadesUsadas: (total: number) =>
      total === 1 ? "Buscando em 1 atividade:" : `Buscando em ${total} atividades:`,
    atividadesNoLimite: "Muitas atividades casaram. Use uma palavra mais específica para refinar.",
    limiteDiario: (horas: number) =>
      `Sua empresa chegou ao limite de páginas de busca de hoje. Ele libera em ${horas} ${horas === 1 ? "hora" : "horas"}. Os leads que você já salvou continuam disponíveis.`,
    semResultadoTitulo: "Nenhuma empresa encontrada",
    semResultadoDescricao: "Tente outra cidade, outra atividade ou inclua MEIs.",
    mostrando: (total: number) => quantidade(total, "empresa nesta página", "empresas nesta página"),
    proxima: "Próximas empresas",
    voltarAoInicio: "Voltar ao início da lista",
    colunas: {
      marcar: (nome: string) => `Marcar ${nome}`,
      marcarTodas: "Marcar todas as empresas desta página",
      // Cabeçalho da tabela de resultados (só aparece em tela larga).
      nota: "Nota",
      empresa: "Empresa",
      atividade: "Atividade e local",
      contato: "Contato e motivos",
    },
    jaEhLead: "Já é lead",
    // Filtro das recém-abertas e buscas vigiadas (etapa 9e).
    recentes: (dias: number) => `Só abertas nos últimos ${dias} dias`,
    recentesAjuda: "Empresa nova ainda está montando os fornecedores: é a hora de chegar.",
    vigiar: {
      botao: "Vigiar esta busca",
      explicacao: "O painel avisa quando abrirem empresas novas com estes filtros.",
      vigiando: "Você vigia esta busca. As empresas novas aparecem no painel.",
      parar: "Parar de vigiar",
      feito: "Busca vigiada. As empresas novas aparecem no painel.",
      repetida: "Esta busca já é vigiada.",
      limite: (maximo: number) => `Você já vigia ${maximo} buscas, o máximo. Pare de vigiar uma no painel para vigiar outra.`,
      precisaFoco: "Escolha uma cidade ou uma atividade para vigiar.",
      falhou: "Não foi possível vigiar agora. Tente de novo.",
    },
    mei: "MEI",
    semContato: "Sem telefone nem e-mail",
    abertaEm: (ano: string) => `Aberta em ${ano}`,
    adicionar: {
      botao: "Adicionar marcadas como leads",
      enviando: "Adicionando...",
      nenhumMarcado: "Marque ao menos uma empresa.",
      resultado: (adicionados: number, pulados: number) =>
        [
          adicionados === 0 ? "Nenhum lead novo." : `${quantidade(adicionados, "lead adicionado", "leads adicionados")}.`,
          pulados > 0 ? `${quantidade(pulados, "já existia", "já existiam")} ou saiu da base.` : "",
        ]
          .filter(Boolean)
          .join(" "),
      verLeads: "Ver leads",
    },
    origemDosDados: (mes: string) =>
      `Fonte: dados abertos do CNPJ, Receita Federal, publicação de ${mes}. Uso para prospecção entre empresas.`,
  },
  leads: {
    titulo: "Leads",
    // Cabeçalho da tabela de leads (só aparece em tela larga).
    colunas: { nota: "Nota", lead: "Lead", contato: "Contato", etapa: "Etapa", origem: "Origem e etiquetas" },
    novo: "Novo lead",
    importar: "Importar planilha",
    etiquetas: "Etiquetas",
    voltarParaLista: "Voltar para a lista",
    busca: {
      rotulo: "Buscar",
      placeholder: "Nome, empresa, e-mail ou telefone",
      origem: "Origem",
      todasOrigens: "Todas as origens",
      etapa: "Etapa",
      todasEtapas: "Todas as etapas",
      etiqueta: "Etiqueta",
      todasEtiquetas: "Todas as etiquetas",
      filtrar: "Filtrar",
      limpar: "Limpar filtros",
    },
    origens: {
      manual: "Cadastro manual",
      importacao: "Importação",
      busca_cnpj: "Busca de empresas",
      google: "Google",
    },
    total: (total: number) =>
      total === 1 ? "1 lead" : `${total.toLocaleString("pt-BR")} leads`,
    // Exportação em CSV (28/10/2026). Separador ";" e vírgula decimal: o Excel em português abre direto.
    exportar: {
      botao: "Exportar CSV",
      rotulo: (filtrado: boolean) => (filtrado ? "Exportar os leads filtrados em CSV" : "Exportar todos os leads em CSV"),
      nomeArquivo: (data: string) => `leads-prospen-${data}.csv`,
      limite: (limite: number) => `Exporta até ${limite.toLocaleString("pt-BR")} leads por vez.`,
      semPermissao: "Só administradores e donos da empresa podem exportar leads.",
      colunas: {
        nome: "Nome",
        empresa: "Empresa",
        cnpj: "CNPJ",
        email: "E-mail",
        telefone: "Telefone",
        pais: "País",
        origem: "Origem",
        etapa: "Etapa",
        etiquetas: "Etiquetas",
        proximaAcaoEm: "Próxima ação em",
        proximaAcao: "Próxima ação",
        valorVenda: "Valor da venda",
        moeda: "Moeda",
        motivoPerda: "Motivo da perda",
        criadoEm: "Criado em",
      },
    },
    semNome: "Sem nome",
    vazioTitulo: "Você ainda não tem leads",
    vazioDescricao:
      "Cadastre um lead à mão ou importe uma planilha CSV com os contatos que você já tem.",
    vazioFiltroTitulo: "Nenhum lead encontrado",
    vazioFiltroDescricao: "Nenhum lead combina com a busca. Tente outras palavras ou limpe os filtros.",
    paginacao: {
      anterior: "Anterior",
      proxima: "Próxima",
      pagina: (atual: number, total: number) => `Página ${atual} de ${total}`,
    },
    formulario: {
      nome: "Nome",
      empresa: "Empresa",
      email: "E-mail",
      telefone: "Telefone",
      pais: "País",
      ajudaNome: "Nome da pessoa ou da empresa que você quer atender.",
      ajudaTelefone: "Com DDD, por exemplo (11) 99999-0000.",
      criar: "Cadastrar lead",
      salvar: "Salvar alterações",
      salvo: "Alterações salvas.",
      falhou: "Não foi possível salvar. Tente novamente em instantes.",
      verExistente: (nome: string) => `Ver o lead já cadastrado: ${nome}`,
      duplicado: {
        email: "Já existe um lead com este e-mail.",
        telefone: "Já existe um lead com este telefone.",
        cnpj: "Já existe um lead com este CNPJ.",
      },
    },
    novoPagina: {
      titulo: "Novo lead",
      descricao: "Cadastre um contato à mão. Para vários de uma vez, use a importação de planilha.",
    },
    detalhe: {
      cnpj: (cnpj: string) => `CNPJ ${cnpj}`,
      contatoCompartilhado: (campo: "email" | "telefone", total: number) =>
        `${campo === "email" ? "Este e-mail" : "Este telefone"} também está em ${quantidade(total, "outro lead", "outros leads")}. Pode ser do contador, não do dono.`,
      verCompartilhados: "Ver quais",
      dados: "Dados do lead",
      origem: "Origem",
      criadoEm: (data: string) => `Cadastrado em ${data}`,
      excluirTitulo: "Excluir este lead",
      excluirAviso:
        "O lead, as notas e as etiquetas dele serão apagados. Esta ação não pode ser desfeita.",
      excluirBotao: "Excluir lead definitivamente",
    },
    etiquetasDoLead: {
      titulo: "Etiquetas",
      nenhuma: "Nenhuma etiqueta neste lead.",
      escolher: "Escolher etiqueta",
      escolherOpcao: "Escolha uma etiqueta",
      ouCriar: "Ou crie uma nova",
      nova: "Nome da nova etiqueta",
      adicionar: "Adicionar",
      remover: (nome: string) => `Remover a etiqueta ${nome}`,
      semOpcoes: "Digite um nome para criar a primeira etiqueta.",
    },
    notas: {
      titulo: "Notas",
      nenhuma: "Nenhuma nota ainda. Anote aqui o que foi combinado com o lead.",
      campo: "Nova nota",
      placeholder: "Ex.: Pediu orçamento para a próxima semana.",
      adicionar: "Adicionar nota",
      excluir: "Excluir nota",
      autorDesconhecido: "Pessoa removida",
      por: (autor: string, data: string) => `${autor}, ${data}`,
    },
    etiquetasPagina: {
      titulo: "Etiquetas",
      descricao:
        "Use etiquetas para agrupar leads do seu jeito, como Quente, Retornar ou Cliente antigo.",
      nova: "Nova etiqueta",
      nome: "Nome",
      cor: "Cor",
      criar: "Criar etiqueta",
      vazioTitulo: "Nenhuma etiqueta ainda",
      vazioDescricao: "Crie a primeira acima, ou direto na página de um lead.",
      totalLeads: (total: number) => (total === 1 ? "1 lead" : `${total} leads`),
      excluir: "Excluir",
      excluirAviso: "Ela será removida de todos os leads.",
      excluirConfirmar: "Excluir etiqueta",
      soAdmin: "Apenas administradores e donos podem excluir etiquetas.",
      criada: "Etiqueta criada.",
      jaExiste: "Já existe uma etiqueta com este nome.",
      cores: {
        neutra: "Cinza",
        roxo: "Roxo",
        musgo: "Verde-musgo",
        aviso: "Amarelo",
        erro: "Vermelho",
      },
    },
    importacao: {
      titulo: "Importar planilha",
      descricao:
        "Envie um arquivo CSV com os seus contatos. Nada é gravado antes de você conferir o resultado.",
      arquivo: "Arquivo CSV",
      ajudaArquivo: "Até 2 MB e 5.000 linhas. Veja abaixo como preparar a planilha.",
      analisar: "Conferir planilha",
      analisando: "Conferindo",
      importar: (total: number) =>
        total === 1 ? "Importar 1 lead" : `Importar ${total.toLocaleString("pt-BR")} leads`,
      importando: "Importando",
      escolhaArquivo: "Escolha um arquivo CSV.",
      arquivoGrande: "O arquivo é grande demais. O limite é 2 MB. Divida a planilha em partes.",
      muitasSeguidas: (minutos: number) =>
        `Muitas planilhas enviadas em pouco tempo pela sua empresa. Tente de novo em ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
      resultadoTitulo: "Resultado da conferência",
      aImportar: "Serão importados",
      importados: "Importados",
      duplicadas: "Já existem ou se repetem",
      rejeitadas: "Com problema",
      total: (total: number) => `${total.toLocaleString("pt-BR")} linhas lidas`,
      colunasTitulo: "Colunas reconhecidas",
      colunaNome: "Nome",
      colunaEmpresa: "Empresa",
      colunaEmail: "E-mail",
      colunaTelefone: "Telefone",
      naoEncontrada: "não encontrada",
      nomeDaEmpresa: "O nome dos leads vem da coluna de empresa.",
      ignoradas: (lista: string) => `Colunas ignoradas: ${lista}.`,
      ocorrenciasTitulo: "Linhas com problema",
      linha: "Linha",
      tipo: "Situação",
      motivo: "Motivo",
      tipoRejeitada: "Com problema",
      tipoDuplicada: "Repetida",
      omitidas: (total: number) =>
        `Mais ${total.toLocaleString("pt-BR")} linhas com problema não estão listadas aqui.`,
      nadaParaImportar: "Nenhuma linha pode ser importada. Corrija a planilha e confira de novo.",
      concluidaTitulo: "Importação concluída",
      concluida: (aceitas: number) =>
        aceitas === 1 ? "1 lead foi adicionado à sua lista." : `${aceitas.toLocaleString("pt-BR")} leads foram adicionados à sua lista.`,
      deFora: (duplicadas: number, rejeitadas: number) =>
        `${quantidade(duplicadas, "repetida", "repetidas")} e ${rejeitadas.toLocaleString("pt-BR")} com problema ficaram de fora.`,
      verLeads: "Ver os leads",
      importarOutra: "Importar outra planilha",
      comoPrepararTitulo: "Como preparar a planilha",
      comoPreparar: [
        "A primeira linha precisa ter os títulos das colunas.",
        "O sistema reconhece estes títulos: Nome, Empresa (ou Razão social, Nome fantasia), E-mail e Telefone (ou Celular, WhatsApp).",
        "Só a coluna de nome é obrigatória. Se não houver, o nome vem da coluna de empresa.",
        "No Excel, use Arquivo, Salvar como, CSV UTF-8. Arquivos .xlsx não são aceitos.",
        "Contatos que já existem na sua lista, ou que se repetem na planilha, são pulados. Você pode enviar a mesma planilha de novo sem criar duplicados.",
      ],
      historicoTitulo: "Importações anteriores",
      historicoVazio: "Você ainda não importou nenhuma planilha.",
      historicoResumo: (aceitas: number, duplicadas: number, rejeitadas: number) =>
        `${quantidade(aceitas, "importado", "importados")}, ${quantidade(duplicadas, "repetido", "repetidos")}, ${rejeitadas.toLocaleString("pt-BR")} com problema`,
      verProblemas: "Ver linhas com problema",
      falhou: "Não foi possível importar a planilha. Tente novamente em instantes.",
    },
  },
  funil: {
    titulo: "Funil de vendas",
    descricao:
      "Acompanhe em que ponto da venda está cada lead. Mova o lead quando a conversa avançar.",
    etapas: {
      novo: "Novo",
      contatado: "Contatado",
      em_conversa: "Em conversa",
      proposta: "Proposta",
      ganho: "Ganho",
      perdido: "Perdido",
    },
    total: (total: number) =>
      total === 1 ? "1 lead no funil" : `${total.toLocaleString("pt-BR")} leads no funil`,
    vazioTitulo: "O funil está vazio",
    vazioDescricao:
      "Todo lead novo entra na etapa Novo. Comece buscando empresas, cadastrando ou importando os seus contatos.",
    colunaVazia: "Nenhum lead nesta etapa.",
    totalColuna: (total: number) => (total === 1 ? "1 lead" : `${total.toLocaleString("pt-BR")} leads`),
    verTodos: (total: number) => `Ver todos os ${total.toLocaleString("pt-BR")} na lista`,
    desde: (data: string) => `Nesta etapa desde ${data}`,
    moverRotulo: (nome: string) => `Mover ${nome} para`,
    mover: "Mover",
    cartaoTitulo: "Funil",
    etapaAtual: "Etapa atual",
    mudarPara: "Mudar para",
    salvarEtapa: "Mudar etapa",
    historicoTitulo: "Histórico de etapas",
    historicoVazio: "Este lead ainda não mudou de etapa.",
    entrada: (data: string) => `Entrou no funil em ${data}`,
    mudanca: (de: string, para: string) => `De ${de} para ${para}`,
    por: (autor: string, data: string) => `${autor}, ${data}`,
    autorDesconhecido: "Pessoa removida",
    rolagem: "Arraste para o lado para ver as outras etapas.",
    resultado: {
      motivoRotulo: "Motivo da perda",
      motivoNaoInformado: "Sem motivo",
      motivos: {
        preco: "Preço",
        concorrente: "Fechou com concorrente",
        sem_resposta: "Parou de responder",
        sem_interesse: "Sem interesse",
        sem_orcamento: "Sem orçamento",
        momento: "Não é o momento",
        outro: "Outro motivo",
      },
      motivoAjuda: "Detalhes podem ir numa nota.",
      valorRotulo: "Valor da venda",
      valorAjuda: (moeda: string) => `Em ${moeda}. Exemplo: 1.500,00`,
      valorNaoInformado: "Sem valor",
      salvar: "Salvar",
      salvo: "Salvo.",
      motivoInvalido: "Escolha um motivo da lista.",
      valorInvalido: "Informe um valor como 1.500,00.",
      etapaMudou: "O lead mudou de etapa enquanto isso. Atualize a página.",
    },
  },
  papeis: {
    owner: "Dono",
    admin: "Administrador",
    member: "Membro",
  },
  erro: {
    titulo: "Algo deu errado",
    descricao: "Não foi possível carregar esta página. Tente novamente em instantes.",
    tentarNovamente: "Tentar de novo",
  },
  campanhas: {
    titulo: "Campanhas",
    descricao:
      "Agrupe leads numa lista de trabalho (por exemplo, ligar para as padarias de Campinas) ou numa ação com custo. Os resultados vêm do funil de cada lead.",
    nova: "Nova campanha",
    vazioTitulo: "Nenhuma campanha ainda",
    vazioDescricao: "Crie uma campanha e coloque nela os leads que vai trabalhar.",
    situacoes: { ativa: "Ativa", encerrada: "Encerrada" },
    encerrar: "Encerrar campanha",
    reabrir: "Reabrir campanha",
    campos: {
      nome: "Nome",
      nomePlaceholder: "Ex.: Padarias de Campinas, novembro",
      objetivo: "Objetivo",
      objetivoAjuda: "Opcional. O que se quer alcançar.",
      inicio: "Início",
      fim: "Fim",
      custo: "Custo",
      custoAjuda: (moeda: string) => `Opcional, em ${moeda}. Ex.: 500,00. Serve para calcular o custo por lead e o retorno.`,
    },
    criar: "Criar campanha",
    salvar: "Salvar alterações",
    salva: "Campanha salva.",
    editar: "Editar dados",
    naoEncontrada: "Campanha não encontrada.",
    voltar: "Voltar para as campanhas",
    periodo: (inicio: string | null, fim: string | null) =>
      inicio && fim ? `De ${inicio} a ${fim}` : inicio ? `Desde ${inicio}` : fim ? `Até ${fim}` : "Sem período definido",
    numeros: {
      leads: "Leads",
      contatados: "Contatados",
      contatadosAjuda: "Saíram de Novo",
      ganhos: "Ganhos",
      vendido: "Valor vendido",
      custo: "Custo",
      custoPorLead: "Custo por lead",
      retorno: "Retorno",
      retornoAjuda: "Valor vendido menos o custo",
      semCusto: "Sem custo informado",
      percentual: (parte: number, total: number) => (total > 0 ? `${Math.round((parte / total) * 100)}%` : "—"),
    },
    leadsTitulo: "Leads da campanha",
    leadsVazio: "Nenhum lead nesta campanha ainda. Adicione pelos filtros abaixo, pela busca de empresas ou pela página de cada lead.",
    leadsLimite: (total: number) => `Mostrando os ${total} adicionados mais recentemente.`,
    remover: (nome: string) => `Tirar ${nome} da campanha`,
    removerCurto: "Tirar",
    adicionarTitulo: "Adicionar leads pelos filtros",
    adicionarDescricao: (maximo: number) =>
      `Todos os leads que passam nos filtros entram na campanha (até ${maximo.toLocaleString("pt-BR")} por vez). Quem já está é pulado.`,
    adicionarBotao: "Adicionar à campanha",
    adicionados: (entraram: number, jaEstavam: number, noLimite: boolean) =>
      [
        entraram === 0 ? "Nenhum lead novo na campanha." : `${quantidade(entraram, "lead entrou", "leads entraram")} na campanha.`,
        jaEstavam > 0 ? `${quantidade(jaEstavam, "já estava", "já estavam")}.` : "",
        noLimite ? "Chegou ao limite de uma vez: use filtros mais específicos para o resto." : "",
      ]
        .filter(Boolean)
        .join(" "),
    excluirTitulo: "Excluir campanha",
    excluirAviso: "A campanha e a lista dos leads dela serão apagadas. Os leads continuam na sua lista.",
    excluirBotao: "Excluir campanha",
    doLeadTitulo: "Campanhas",
    doLeadVazio: "Este lead não está em nenhuma campanha.",
    doLeadAdicionar: "Colocar na campanha",
    doLeadEscolha: "Escolha uma campanha",
    doLeadSemAtivas: "Não há campanha ativa disponível.",
    escolhaUma: "Escolha uma campanha.",
    naBusca: "Colocar também na campanha",
    naBuscaNenhuma: "Nenhuma",
  },
  pontuacao: {
    titulo: "Prioridade",
    faixas: { alta: "Prioridade alta", media: "Prioridade média", baixa: "Prioridade baixa" },
    pontos: (pontos: number) => `${pontos} de 100 pontos`,
    deCem: "de 100",
    motivos: {
      telefone: "tem telefone",
      emailProprio: "e-mail próprio",
      emailContador: "e-mail parece do contador",
      empresaNova: "aberta há menos de 1 ano",
      empresaRecente: "aberta há 1 a 3 anos",
      porteMicro: "microempresa",
      portePequena: "empresa de pequeno porte",
      porteDemais: "empresa de porte maior",
      matriz: "matriz",
      mei: "MEI",
      porteNoPerfil: "porte que você atende",
      porteForaDoPerfil: "porte que você não atende",
      empresaEstabelecida: "aberta há mais de 3 anos",
    },
    ajustada: "Ajustada ao seu cliente ideal.",
    geral: "Nota geral, igual para todas as empresas.",
    ajustar: "Ajustar ao seu cliente ideal",
    semMotivos: "sem telefone, e-mail ou dados da Receita",
    semDadosDaReceita: "Leads sem CNPJ só pontuam pelo contato.",
    ordemDaBusca: "Ordenadas da maior prioridade para a menor.",
  },
  // Cliente ideal da empresa (etapa 9f, 28/10/2026): ajusta a nota dos leads.
  clienteIdeal: {
    titulo: "Seu cliente ideal",
    descricao:
      "Diga para quem você vende e a nota dos seus leads passa a seguir o seu negócio. A busca continua na ordem geral e marca as empresas que combinam com você.",
    portes: "Porte das empresas que você atende",
    portesAjuda: "Nenhum marcado: qualquer porte.",
    nomesPortes: { "01": "Microempresa", "03": "Empresa de pequeno porte", "05": "Médias e grandes (demais portes)" },
    idade: "Você prefere empresas",
    idades: {
      novas: "Novas (abertas há menos de 3 anos)",
      estabelecidas: "Estabelecidas (abertas há mais de 3 anos)",
      tanto_faz: "Tanto faz",
    },
    mei: "Atendo MEI (microempreendedor individual)",
    meiAjuda: "Desmarcado, MEI perde pontos.",
    salvar: "Salvar cliente ideal",
    salvo: "Salvo. A nota dos seus leads já foi ajustada.",
    invalido: "Confira as opções e tente de novo.",
    voltar: "Voltar para a nota geral",
    voltarAjuda: "Apaga o cliente ideal. A nota volta a ser a geral, igual para todas as empresas.",
    semPermissao: "Só administradores e donos da empresa mudam o cliente ideal. A nota abaixo já segue o que foi definido.",
    comoFica: "Como a nota fica",
    exemplo: "Exemplo: empresa de pequeno porte, aberta há 5 anos, com telefone e e-mail próprio.",
    atual: "Hoje a nota segue",
    perfilGeral: "a regra geral",
    resumo: (partes: string[]) => partes.join("; "),
    combina: "Combina com seu cliente ideal",
    marcadasNaBusca: "As empresas que combinam com o seu cliente ideal aparecem marcadas. A ordem é a da nota geral.",
    // A nota geral dá pontos a empresas novas: quem prefere estabelecidas vê poucas marcas nas primeiras páginas.
    contraOrdemGeral:
      "A ordem geral favorece empresas abertas há pouco. As estabelecidas que combinam com você costumam aparecer nas páginas seguintes.",
    semPerfilNaBusca: "Diga qual é o seu cliente ideal e a busca marca as empresas que combinam com você.",
    naBusca: "Seu cliente ideal",
    definir: "Definir",
    mudar: "Mudar",
  },
  // Planos (decisão de 28/10/2026). Regras e preços em src/modules/planos/planos.ts.
  planos: {
    nomes: { pequeno: "Pequeno", medio: "Médio", grande: "Grande" },
    recursos: {
      exportarCsv: "Exportar leads em CSV",
      buscasVigiadas: "Buscas vigiadas",
      radar: "Radar de mudanças na Receita",
      clienteIdeal: "Nota pelo seu cliente ideal",
      aprendizado: "Aprendizado com os resultados",
    },
    // "Buscas vigiadas fazem parte do plano Médio em diante."
    bloqueado: (recurso: string, plano: string, ultimo: boolean) =>
      ultimo ? `${recurso}: só no plano ${plano}.` : `${recurso}: a partir do plano ${plano}.`,
    seuPlano: (plano: string) => `Seu plano: ${plano}`,
    fundador: "Fundador, preço travado",
    usoDoMes: (usadas: number, limite: number | null) =>
      limite === null
        ? `${quantidade(usadas, "empresa salva", "empresas salvas")} como lead este mês, sem limite mensal.`
        : `${usadas.toLocaleString("pt-BR")} de ${limite.toLocaleString("pt-BR")} empresas salvas como lead este mês.`,
    foraDoLimite: (fora: number, limite: number, semPagamento: boolean) =>
      semPagamento
        ? `${quantidade(fora, "empresa ficou", "empresas ficaram")} de fora: até o plano ser liberado, a conta salva ${limite.toLocaleString("pt-BR")} por mês.`
        : `${quantidade(fora, "empresa ficou", "empresas ficaram")} de fora: o seu plano salva até ${limite.toLocaleString("pt-BR")} por mês. O limite volta no dia 1º.`,
    limiteDoMesAtingido: (limite: number, semPagamento: boolean) =>
      semPagamento
        ? `Você já salvou as ${limite.toLocaleString("pt-BR")} empresas deste mês. Para salvar mais, assine um plano: depois do pagamento ele é liberado.`
        : `Você já salvou ${limite.toLocaleString("pt-BR")} empresas este mês, o limite do seu plano. Volta no dia 1º.`,
    // Pagamento manual por Pix (src/lib/vendas.ts).
    comoAssinar: {
      titulo: "Como assinar",
      link: "Ver como assinar",
      passos: (precos: string, chave: string, email: string, emailDaConta: string) => [
        `Escolha o plano: ${precos} por mês.`,
        `Faça um Pix do valor para a chave ${chave} (e-mail).`,
        `Mande o comprovante para ${email}, dizendo o plano e o e-mail da sua conta (${emailDaConta}).`,
        "O plano é liberado assim que o pagamento for conferido. A cobrança é mensal: no mês seguinte, é só repetir.",
      ],
      botao: "Mandar o comprovante por e-mail",
      assunto: "Comprovante do PROSPEN",
      corpo: (emailDaConta: string) => `E-mail da minha conta no PROSPEN: ${emailDaConta}\nPlano escolhido: \n\n(anexe aqui o comprovante do Pix)`,
    },
    semPagamento: (limite: number) =>
      `Plano ainda não liberado: até a confirmação do pagamento, a conta salva ${limite.toLocaleString("pt-BR")} empresas por mês.`,
    usuariosDoPlano: (membros: number, limite: number) =>
      `${membros} de ${quantidade(limite, "usuário", "usuários")} do seu plano.`,
    // Página inicial
    pagina: {
      titulo: "Planos",
      subtitulo: "Busca na base de São Paulo em todos os planos. Os outros estados entram aos poucos.",
      porMes: "/mês",
      melhorCustoBeneficio: "Melhor custo-benefício",
      naoIncluso: "(não incluso)",
      usuarios: (n: number) => quantidade(n, "usuário", "usuários"),
      empresasPorMes: (n: number | null) =>
        n === null ? "Empresas salvas como lead sem limite mensal" : `Até ${n.toLocaleString("pt-BR")} empresas salvas como lead por mês`,
      todos: "Busca, nota de 0 a 100 com motivos, funil, tela \"Hoje\" e contato em um clique",
      fundadores: (vagas: number) =>
        `Os ${vagas} primeiros clientes são fundadores: o preço fica travado enquanto a assinatura durar.`,
      vagasRestantes: (restam: number, total: number) =>
        restam === 0
          ? `As ${total} vagas de fundador acabaram.`
          : `Restam ${restam} de ${total} vagas de fundador: o preço fica travado enquanto a assinatura durar.`,
      chamada: "Quero uma vaga de fundador",
      limiteDiario: "Todos os planos têm um limite diário de páginas de busca, contra uso automatizado.",
    },
  },
  // Equipe e convites
  equipe: {
    titulo: "Equipe",
    descricao: "Quem usa o PROSPEN na sua empresa.",
    voce: "você",
    convidar: "Convidar pessoa",
    convidarAjuda: "Gere o link e envie você mesmo, por WhatsApp ou e-mail. A pessoa precisa entrar com este mesmo e-mail.",
    email: "E-mail da pessoa",
    gerarLink: "Gerar link de convite",
    convitesPendentes: "Convites esperando resposta",
    copiar: "Copiar link",
    copiado: "Link copiado",
    expiraEm: (data: string) => `Vale até ${data}`,
    cancelar: "Cancelar convite",
    remover: "Remover da equipe",
    linkGerado: "Convite criado. Copie o link abaixo e envie para a pessoa.",
    emailInvalido: "Confira o e-mail.",
    jaEhMembro: "Esta pessoa já está na equipe.",
    jaConvidada: "Já existe um convite para este e-mail. Use o link da lista.",
    limite: (limite: number, proximo: string | null) =>
      proximo
        ? `O seu plano tem ${quantidade(limite, "usuário", "usuários")}, contando os convites. Para mais, mude para o plano ${proximo}.`
        : `O seu plano tem ${quantidade(limite, "usuário", "usuários")}, contando os convites.`,
    falhou: "Não foi possível agora. Tente de novo.",
    naoPodeRemoverDono: "O dono não pode ser removido.",
    semPermissao: "Só administradores e donos da empresa convidam e removem pessoas.",
    // Página do convite
    convite: {
      titulo: "Convite para o PROSPEN",
      para: (empresa: string) => `Você recebeu um convite para a equipe da empresa ${empresa}.`,
      paraEmail: (email: string) => `O convite é para o e-mail ${email}.`,
      aceitar: "Aceitar e entrar",
      entrarPrimeiro: "Entre ou crie a sua conta com este e-mail para aceitar.",
      entrar: "Já tenho conta",
      criarConta: "Criar conta",
      outroEmail: (email: string) =>
        `A conta aberta agora é de outro e-mail. Saia e entre com ${email} para aceitar este convite.`,
      jaTemEmpresa: "A sua conta já faz parte de uma empresa no PROSPEN. Por enquanto, cada conta participa de uma empresa só.",
      invalido: "Este convite não existe, já foi usado ou expirou. Peça um novo link a quem enviou.",
      cheio: "A equipe desta empresa já está completa no plano dela. Avise quem enviou o convite.",
    },
  },
  // Mensagens de validação e de erro geradas na lógica (servidor), que a
  // pessoa lê na tela ou no resumo da importação.
  mensagens: {
    lead: {
      nomeObrigatorio: "Informe o nome do lead.",
      nomeLongo: (maximo: number) => `O nome pode ter no máximo ${maximo} caracteres.`,
      empresaLonga: (maximo: number) => `O nome da empresa pode ter no máximo ${maximo} caracteres.`,
      emailInvalido: "Informe um e-mail válido.",
      paisInvalido: "Informe o país com duas letras, como BR.",
      telefoneComDdd: "Informe o telefone com DDD.",
      telefoneInvalido: "Informe um telefone válido.",
    },
    etiqueta: {
      nomeObrigatorio: "Informe o nome da etiqueta.",
      nomeLongo: (maximo: number) => `O nome pode ter no máximo ${maximo} caracteres.`,
      escolhaOuCrie: "Escolha uma etiqueta ou digite o nome de uma nova.",
    },
    nota: {
      vazia: "Escreva a nota antes de adicionar.",
      longa: (maximo: number) => `A nota pode ter no máximo ${maximo} caracteres.`,
    },
    importacao: {
      arquivoVazio: "O arquivo está vazio.",
      arquivoGrande: (megabytes: number) =>
        `O arquivo é grande demais. O limite é ${megabytes} MB. Divida a planilha em partes.`,
      naoEhCsv:
        "Este arquivo não é um CSV. Se for uma planilha do Excel, use Arquivo, Salvar como, CSV UTF-8, e envie o arquivo salvo.",
      semDados: "O arquivo não tem nenhum dado.",
      soTitulos: "A planilha tem só a linha de títulos, sem nenhum lead abaixo dela.",
      linhasDemais: (total: number, limite: number) =>
        `A planilha tem ${total.toLocaleString("pt-BR")} linhas. O limite é ${limite.toLocaleString("pt-BR")} por importação. Divida em partes.`,
      emailJaCadastrado: "E-mail já cadastrado.",
      telefoneJaCadastrado: "Telefone já cadastrado.",
      semColunaDeContato: "A planilha não tem coluna de e-mail nem de telefone. Os leads serão criados sem contato.",
      aspasSemFechar: "O arquivo tem aspas sem fechar. Confira se o CSV foi salvo corretamente.",
      semColunaDeNome:
        "Não encontrei a coluna com o nome dos leads. Na primeira linha da planilha, use um destes títulos: Nome, Empresa, Razão social ou Nome fantasia.",
      emailRepetido: (linha: number) => `E-mail repetido da linha ${linha}.`,
      telefoneRepetido: (linha: number) => `Telefone repetido da linha ${linha}.`,
    },
    campanha: {
      nomeObrigatorio: "Dê um nome à campanha.",
      nomeLongo: (maximo: number) => `O nome pode ter no máximo ${maximo} caracteres.`,
      objetivoLongo: (maximo: number) => `O objetivo pode ter no máximo ${maximo} caracteres.`,
      dataInvalida: "Informe uma data válida.",
      fimAntesDoInicio: "O fim não pode ser antes do início.",
      custoInvalido: "Informe um valor como 500,00.",
    },
    contato: {
      canalInvalido: "Escolha por onde foi o contato.",
      resultadoInvalido: "Escolha o que aconteceu.",
      dataInvalida: "Informe uma data válida.",
      textoSemData: "Escolha a data da próxima ação.",
      textoLongo: (maximo: number) => `Use no máximo ${maximo} caracteres.`,
    },
    conta: {
      informeEmail: "Informe seu e-mail.",
      emailInvalido: "Informe um e-mail válido.",
      emailLongo: "Este e-mail é longo demais.",
      informeNome: "Informe seu nome.",
      nomeLongo: (maximo: number) => `O nome pode ter no máximo ${maximo} caracteres.`,
      informeSenhaNova: "Informe uma senha.",
      senhaCurta: (minimo: number) => `A senha precisa ter pelo menos ${minimo} caracteres.`,
      senhaLonga: (maximo: number) => `A senha pode ter no máximo ${maximo} caracteres.`,
      informeSenha: "Informe sua senha.",
      informeEmpresa: "Informe o nome da empresa.",
      // Erros do login. Nunca revelam se o e-mail existe.
      contaJaExiste: "Já existe uma conta com este e-mail. Tente entrar.",
      emailOuSenhaIncorretos: "E-mail ou senha incorretos.",
      senhaCurtaDemais: "A senha é curta demais.",
      senhaLongaDemais: "A senha é longa demais.",
      emailNaoConfirmado: "Confirme seu e-mail antes de entrar. Enviamos um link novo para ele.",
      identificadorDeEmpresaEmUso: "Já existe uma empresa com este identificador. Tente de novo.",
      jaTemEmpresa: "Sua conta já tem uma empresa.",
      muitasTentativas: "Muitas tentativas. Aguarde um instante e tente de novo.",
      generica: "Algo deu errado. Tente novamente em instantes.",
    },
  },
  remocao: {
    link: "Remover meus dados",
    titulo: "Remover os dados da sua empresa",
    descricao:
      "O PROSPEN mostra empresas ativas da base pública de CNPJ da Receita Federal, para que outras empresas encontrem possíveis clientes. Se você é responsável por uma empresa e não quer que ela apareça, peça a remoção aqui.",
    comoFunciona: "Como funciona",
    itens: [
      "A remoção é imediata: o CNPJ deixa de aparecer na busca para todos os usuários.",
      "Ele não volta quando a base da Receita for atualizada.",
      "Empresas que já tinham salvo seus dados antes do pedido continuam com eles. Para isso, fale com a empresa que entrou em contato com você.",
      "Não pedimos nem guardamos nome, e-mail ou documento de quem faz o pedido. Guardamos só o CNPJ e a data.",
    ],
    cnpj: "CNPJ da empresa",
    cnpjAjuda: "Com ou sem pontuação. Vale também para CNPJ com letras.",
    confirmacao: "Confirmo que sou responsável por esta empresa ou tenho autorização para pedir a remoção.",
    botao: "Remover da busca",
    cnpjInvalido: "Confira o CNPJ. Os dígitos verificadores não batem.",
    confirmacaoObrigatoria: "Marque a confirmação para continuar.",
    muitosPedidos: "Recebemos muitos pedidos em pouco tempo. Tente de novo mais tarde.",
    falhou: "Não foi possível registrar o pedido agora. Tente de novo em instantes.",
    pronto: (cnpj: string) =>
      `Pronto. O CNPJ ${cnpj} não aparece mais na busca do PROSPEN e não volta nas próximas atualizações.`,
    fonte: "Fonte dos dados: dados abertos do CNPJ, Receita Federal. Uso para prospecção entre empresas.",
  },
  privacidade: {
    link: "Política de privacidade",
    titulo: "Política de privacidade",
    atualizadaEm: "Última atualização: 28 de outubro de 2026.",
    introducao:
      "Esta política explica quais dados pessoais o PROSPEN trata, para quê, com qual base na Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018) e como você exerce os seus direitos.",
    responsavelTitulo: "Quem é o responsável",
    responsavel: (nome: string) =>
      `O responsável pelo tratamento dos dados (controlador) é ${nome}, que também atua como encarregado pelo tratamento de dados pessoais (art. 41 da LGPD). Para qualquer assunto sobre privacidade, inclusive os pedidos de titulares, escreva para:`,
    secoes: [
      {
        titulo: "Dados de quem usa o PROSPEN",
        paragrafos: [
          "Ao criar uma conta, guardamos o seu nome, o seu e-mail e a sua senha. A senha é guardada protegida, nunca em texto puro. Guardamos também o nome da sua empresa, as configurações dela (país, moeda, fuso horário e idioma), o plano contratado e quantas empresas da busca ela salvou no mês.",
          "Quando alguém da sua empresa convida uma pessoa para a equipe, guardamos o e-mail convidado, quem convidou e a validade do convite (7 dias). O e-mail é usado só para conferir que quem aceita o convite é a pessoa convidada.",
          "Usamos esses dados para dar acesso à conta e prestar o serviço contratado. Base legal: execução de contrato e de procedimentos preliminares a ele (art. 7º, V, da LGPD).",
          "Para proteger as contas contra tentativas de adivinhar senhas, contamos por pouco tempo as tentativas de entrada por e-mail e por endereço de internet (IP). Essa contagem fica só na memória do servidor e some em até uma hora. Base legal: legítimo interesse na segurança do serviço (art. 7º, IX).",
          "Guardamos por 6 meses, em sigilo, a data, a hora e o endereço IP de cada entrada na conta, como exige o Marco Civil da Internet (Lei 12.965/2014, art. 15). Esses registros só são entregues a terceiros com ordem judicial e são apagados depois do prazo, mesmo que a conta tenha sido excluída antes. Base legal: cumprimento de obrigação legal (art. 7º, II).",
          "Usamos apenas o cookie necessário para manter você conectado. Não usamos cookies de publicidade nem ferramentas de rastreamento.",
        ],
      },
      {
        titulo: "Pré-cadastro da pré-venda",
        paragrafos: [
          "Quem faz o pré-cadastro na página inicial nos informa o nome, o e-mail e, se quiser, o nome da empresa. Usamos esses dados só para avisar sobre a abertura do PROSPEN e enviar as condições da pré-venda. Base legal: procedimentos preliminares a um contrato, a pedido da própria pessoa (art. 7º, V).",
          "O formulário também tem duas perguntas opcionais: o que a empresa vende e quais recursos mais ajudariam. Usamos essas respostas só para decidir o que construir, olhando o total de respostas, e nunca para outra finalidade.",
          "Guardamos o pré-cadastro até 12 meses depois da abertura ou até a pessoa pedir para sair da lista, pelo e-mail de privacidade, o que vier primeiro.",
        ],
      },
      {
        titulo: "Leads que a sua empresa cadastra",
        paragrafos: [
          "Os contatos que a sua empresa cadastra à mão, importa de planilha ou adiciona a partir da busca, com as notas, etiquetas, etapas do funil e campanhas, pertencem à sua empresa. Para esses dados, a sua empresa é a controladora e o PROSPEN trata os dados em nome dela (operador), só para prestar o serviço.",
          "Os dados de uma empresa cliente nunca aparecem para outra. Do histórico de importação guardamos só um resumo, nunca o conteúdo da planilha.",
          "Quem receber contato de uma empresa cliente do PROSPEN e quiser exercer os seus direitos sobre esses dados deve procurar essa empresa. Se precisar, ajudamos a encaminhar o pedido.",
        ],
      },
      {
        titulo: "Empresas da base pública de CNPJ",
        paragrafos: [
          "A busca de empresas usa os dados abertos do CNPJ, publicados pela Receita Federal: razão social, nome fantasia, situação, atividade econômica, porte, natureza jurídica, data de abertura, endereço e o telefone e o e-mail informados no cadastro. Mostramos só empresas ativas.",
          "Finalidade: permitir que empresas encontrem outras empresas como possíveis clientes (prospecção entre empresas). Base legal: legítimo interesse (art. 7º, IX), sobre dados tornados públicos pela própria Receita (art. 7º, §§ 3º, 4º e 7º), com finalidade compatível com a da publicação: dar transparência sobre quem são as empresas ativas do país.",
          "No caso do microempreendedor individual (MEI), os dados da empresa também são dados pessoais do empreendedor. Por isso, tudo nesta política vale também para eles.",
          "Não usamos os dados dos sócios. No caso do microempreendedor individual (MEI), retiramos o CPF que muitas vezes aparece no nome da empresa, e ele nunca é exibido.",
          "Para ordenar os resultados, cada empresa recebe uma pontuação automática de 0 a 100, calculada só com dados do cadastro na Receita: se tem telefone, se tem e-mail (e se ele parece ser de escritório de contabilidade), há quanto tempo foi aberta, o porte, se é matriz e se é MEI. A pontuação só define a ordem em que as empresas aparecem para os clientes do PROSPEN. Ela não é usada para crédito, não recusa nada a ninguém e não usa dados sensíveis. Você pode pedir a explicação dos critérios ou a revisão pelo e-mail de privacidade (art. 20).",
          "Quem for responsável por uma empresa pode tirá-la da busca a qualquer momento, sem criar conta, na página \"Remover meus dados\". A remoção é imediata e vale também para as próximas atualizações da base.",
        ],
      },
      {
        titulo: "Com quem os dados são compartilhados",
        paragrafos: [
          "Não vendemos nem alugamos dados pessoais. Os dados ficam em servidores de provedores de infraestrutura contratados para hospedar o serviço, que só os tratam para esse fim. Também podemos fornecer dados quando a lei ou uma autoridade competente exigir.",
          "Preferimos provedores com servidores no Brasil. Se algum provedor guardar dados fora do país, a transferência seguirá as regras da LGPD (arts. 33 a 36) e da ANPD, e esta política dirá qual é o provedor e o país.",
        ],
      },
      {
        titulo: "Por quanto tempo guardamos",
        paragrafos: [
          "Os dados da conta e da empresa ficam guardados enquanto a conta existir. Quando a empresa é excluída, os dados dela (leads, notas, etiquetas, funil, campanhas e importações) são apagados junto. Para excluir a sua conta ou a sua empresa, escreva para o e-mail de privacidade.",
          "Os registros de acesso à conta (data, hora e IP) ficam 6 meses e depois são apagados automaticamente.",
          "A lista de CNPJs que pediram para sair da base pública é guardada sem prazo, porque é ela que garante que esses CNPJs não voltem. Ela tem só o CNPJ e a data do pedido.",
          "Podemos guardar dados por mais tempo quando a lei exigir.",
        ],
      },
      {
        titulo: "Como protegemos os dados",
        paragrafos: [
          "Senhas guardadas protegidas, acesso sempre conferido no servidor, separação dos dados de cada empresa cliente em todas as consultas e limites contra tentativas repetidas de acesso. Nenhuma medida elimina todo risco; se houver um incidente de segurança que possa causar dano relevante, avisaremos os titulares afetados e a Autoridade Nacional de Proteção de Dados (ANPD) em até 3 dias úteis, como manda a Resolução CD/ANPD nº 15/2024.",
        ],
      },
      {
        titulo: "Os seus direitos",
        paragrafos: [
          "Pela LGPD (art. 18), você pode pedir: confirmação de que tratamos seus dados, acesso a eles, correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade, informação sobre com quem compartilhamos, e se opor a um tratamento feito por legítimo interesse.",
          "Escreva para o e-mail de privacidade. Confirmamos o recebimento assim que lermos o pedido e respondemos de forma completa em até 15 dias. Se não ficar satisfeito, você também pode reclamar à ANPD.",
        ],
      },
      {
        titulo: "Crianças e adolescentes",
        paragrafos: ["O PROSPEN é um serviço para empresas e não se destina a menores de 18 anos."],
      },
      {
        titulo: "Mudanças nesta política",
        paragrafos: [
          "Quando esta política mudar, a data no topo é atualizada. Mudanças importantes serão avisadas a quem tem conta.",
        ],
      },
    ],
  },
  termos: {
    link: "Termos de uso",
    titulo: "Termos de uso",
    atualizadaEm: "Última atualização: 23 de outubro de 2026.",
    introducao:
      "Estes termos regulam o uso do PROSPEN, plataforma de busca de empresas e gestão comercial para empresas. Ao criar uma conta, você aceita estes termos em nome da empresa que representa e confirma que leu a política de privacidade.",
    // Aceite no cadastro: "Ao criar a conta, você aceita os [termos] e leu a [política]."
    aceiteInicio: "Ao criar a conta, você aceita os",
    aceiteMeio: "e confirma que leu a",
    secoes: [
      {
        titulo: "1. Quem pode usar",
        paragrafos: [
          "O PROSPEN é um serviço para uso profissional. Para criar uma conta, você precisa ter pelo menos 18 anos, informar dados verdadeiros e ter autorização para agir em nome da empresa cadastrada.",
          "Você é responsável por guardar a sua senha e pelo que for feito com a sua conta. Se perceber uso indevido, avise pelo e-mail de privacidade.",
        ],
      },
      {
        titulo: "2. O serviço",
        paragrafos: [
          "O PROSPEN permite buscar empresas ativas na base pública de CNPJ da Receita Federal, cadastrar e importar leads, acompanhar o funil de vendas e organizar campanhas.",
          "O serviço está em fase inicial (pré-venda). Funcionalidades podem mudar, e não garantimos que ele fique disponível sem interrupções. Avisaremos com antecedência mudanças que tirem funcionalidades que você usa.",
          "As condições comerciais (preço, forma de pagamento e período) são informadas antes da contratação e fazem parte destes termos.",
        ],
      },
      {
        titulo: "3. Uso permitido e proibido",
        paragrafos: [
          "O PROSPEN serve para prospecção entre empresas e gestão comercial legítima. É proibido: enviar mensagens em massa sem oferecer uma forma simples de a pessoa pedir para não receber mais; continuar contatando quem pediu para não ser contatado; revender, publicar ou repassar a terceiros os dados da base pública; extrair dados em massa por robôs ou meios automáticos; usar os dados para golpes, fraudes, assédio, discriminação, cobrança ou decisões de crédito sobre pessoas; e tentar acessar dados de outras empresas ou contornar os limites do sistema.",
          "Podemos suspender ou encerrar a conta que descumprir estas regras, avisando o motivo, sem prejuízo de outras medidas legais.",
        ],
      },
      {
        titulo: "4. Proteção de dados: o que é responsabilidade de cada um",
        paragrafos: [
          "Leads da sua empresa: quando a sua empresa cadastra, importa ou salva um lead (inclusive a partir da busca), ela passa a ser a controladora desses dados pela LGPD. Cabe a ela ter base legal para o uso, informar os titulares quando a lei exigir, respeitar pedidos de não contato e atender os pedidos dos titulares.",
          "O papel do PROSPEN sobre esses leads é o de operador (LGPD, art. 39): tratamos os dados só para prestar o serviço, conforme as instruções que a sua empresa dá ao usar o sistema; mantemos medidas de segurança; avisamos a sua empresa sem demora sobre incidentes que afetem os dados dela; ajudamos a atender os pedidos dos titulares; e não usamos esses dados para nenhuma outra finalidade.",
          "Usamos provedores de infraestrutura (hospedagem e banco de dados) para operar o serviço. Eles só tratam os dados para esse fim e estão citados na política de privacidade quando contratados.",
          "Base pública de CNPJ: o PROSPEN é o controlador da base que oferece na busca. Quando alguém pede para sair dela, a empresa some da busca de todos os clientes. Leads que a sua empresa já salvou continuam com ela, e o pedido de não contato que chegar a ela deve ser respeitado.",
        ],
      },
      {
        titulo: "5. Dados da base pública",
        paragrafos: [
          "Os dados da busca vêm dos dados abertos da Receita Federal, como foram publicados. Eles podem estar desatualizados ou incompletos, e o telefone e o e-mail muitas vezes são do escritório de contabilidade da empresa. A pontuação é uma ordem de prioridade feita por regras simples, não uma promessa de resultado.",
        ],
      },
      {
        titulo: "6. Seus dados e o fim da conta",
        paragrafos: [
          "Os leads, notas, etiquetas, campanhas e demais dados que a sua empresa cadastra são dela. Você pode pedir o encerramento da conta a qualquer momento pelo e-mail de privacidade. Ao excluir a empresa, os dados dela são apagados, exceto o que a lei mandar guardar (como os registros de acesso, por 6 meses).",
          "O software, a marca e a organização da plataforma são do PROSPEN.",
        ],
      },
      {
        titulo: "7. Responsabilidades",
        paragrafos: [
          "Respondemos pelos danos que causarmos por descumprir estes termos ou a lei. Não respondemos pelo uso que a sua empresa faz dos dados, pelas mensagens que ela envia nem pelos resultados comerciais das campanhas.",
        ],
      },
      {
        titulo: "8. Mudanças nestes termos",
        paragrafos: [
          "Quando estes termos mudarem, a data no topo é atualizada e as mudanças importantes são avisadas a quem tem conta antes de valer. Se não concordar, você pode encerrar a conta.",
        ],
      },
      {
        titulo: "9. Lei aplicável e contato",
        paragrafos: [
          "Estes termos seguem a lei brasileira. Dúvidas e pedidos: pelo e-mail de privacidade, no fim desta página.",
        ],
      },
    ],
  },
  naoEncontrado: {
    titulo: "Página não encontrada",
    descricao: "O endereço não existe ou foi movido.",
    voltar: "Voltar ao início",
    // Dentro do painel (lead ou campanha que não existe). Não diz se o item
    // existe em outra empresa: a resposta é a mesma nos dois casos.
    painelTitulo: "Não encontramos este item",
    painelDescricao: "O lead ou a campanha não existe, foi excluído ou o endereço está incompleto.",
    verLeads: "Ver leads",
    verCampanhas: "Ver campanhas",
  },
} as const;

export type Textos = typeof ptBR;
