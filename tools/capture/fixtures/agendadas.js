/*
 * Rotas só da tela Mensagens Agendadas (agendadas.html): a lista de agendamentos
 * pendentes, respostas rápidas, filas, busca de contatos. Formatos lidos de
 * src/public/js/agendadas.ts e do backend (scheduled-messages.model.ts,
 * quick-replies.model.ts, queues.model.ts).
 *
 * A lista do app só traz o que ainda vai sair (status pending/processing): enviadas e
 * canceladas não aparecem nesta tela. Os agendamentos são das conversas e contatos de
 * comum.js; dois deles são de clientes sem conversa aberta (o agendamento abre uma).
 *
 * Também expõe __mockAgendadas.capturarEstados(): a captura chama essa função para guardar
 * como <template> o que só existe depois de um clique (sugestões de contato, anexos no
 * modal, resumo da recorrência, menu do usuário).
 */
(function () {
  const mock = window.__mock;
  const { contatos, conversas, usuarios, instancias, filas, tags } = mock.dados;

  const agora = new Date(mock.agora);
  /**
   * Dia `dias` a partir de hoje, na hora "HH:MM". "daqui-a-pouco" é a próxima meia hora
   * cheia depois de uma hora a partir de agora (o protótipo usa a mesma regra).
   */
  function em(dias, hora) {
    if (hora === 'daqui-a-pouco') {
      const d = new Date(agora.getTime() + 3_600_000);
      d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
      return d;
    }
    const d = new Date(agora);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dias);
    const [h, m] = hora.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d;
  }
  const contato = (id) => contatos.find((c) => c.id === id);
  const usuario = (id) => usuarios.find((u) => u.user_id === id);
  const fila = (nome) => filas.find((f) => f.name === nome);
  const instancia = (nome) => instancias.find((i) => i.name === nome);

  // Anexos de exemplo, um de cada tipo (a tela pinta cada tipo de uma cor).
  const anexo = (id, type, name, size_label) => ({ id, type, name, size_label, url: `https://arquivos.exemplo.com.br/${name}`, metadata: {} });

  /*
   * [id, conversa (ou contato sem conversa), responsável, fila, instância, dias, hora,
   *  título, tipo, mensagem, anexos, recorrência]
   * Categoria e tag não são gravadas pelo modal (o app manda vazio): a tela deduz a
   * categoria pelo texto e usa a primeira tag do contato.
   */
  const BASE = [
    // Ainda hoje, daqui a pouco (o filtro "Hoje" nunca fica vazio): hora calculada abaixo.
    ['ag-00', 'c2', 'usr-ana', 'Vendas', 'comercial', 0, 'daqui-a-pouco', 'Display novo', 'texto',
      'Oi! Confirmando: o display novo chega hoje à tarde e a montagem fica para amanhã cedo, combinado?', [], null],
    ['ag-01', 'c1', 'usr-ana', 'Vendas', 'comercial', 1, '09:00', 'Pedido quinzenal', 'texto',
      'Oi Mariana! Passando para lembrar do pedido quinzenal de achocolatado. Posso lançar as mesmas 40 caixas?', [],
      { enabled: true, frequency: 'semanal', days: ['Ter'], hour: '09:00', repetitions: 8, occurrence_index: 1 }],
    ['ag-02', 'c3', 'usr-ana', 'Vendas', 'posvenda', 1, '14:00', 'Vencimento do boleto 2231', 'texto',
      'Pedro, o boleto do pedido 2231 vence amanhã. Qualquer dúvida sobre o pagamento é só me chamar.', [], null],
    ['ag-03', 'c13', 'usr-ana', 'Geral', 'posvenda', 1, '16:30', 'Agradecimento pós-entrega', 'audio',
      '', [anexo('anx-1', 'audio', 'Agradecimento_Camila.ogg', '312 KB')], null],
    ['ag-04', 'c8', 'usr-ana', 'Vendas', 'comercial', 2, '08:15', 'Nota fiscal do pedido', 'documento',
      'Bom dia! A nota do pedido de 12 caixas de biscoito sortido já foi emitida. Segue em anexo.', [anexo('anx-2', 'document', 'NF_Pedido_2240.pdf', '186 KB')], null],
    ['ag-05', 'c5', 'usr-ana', 'Vendas', 'comercial', 2, '10:30', 'Retorno da proposta', 'texto',
      'Juliana, conseguiu falar com seu sócio? O desconto de 5% à vista para pedidos acima de 30 caixas vale até sexta.', [], null],
    ['ag-06', 'c9', 'usr-bruno', 'Vendas', 'comercial', 3, '10:00', 'Visita em Osasco', 'texto',
      'Fernanda, confirmando a visita do Bruno na sua loja em Osasco na quinta às 15h. Ele leva os mostruários!', [], null],
    ['ag-07', 'c12', 'usr-bruno', 'Vendas', 'comercial', 4, '08:30', 'Validade da proposta trimestral', 'texto',
      'Bom dia! Lembrete: a proposta trimestral de 200 caixas vale até segunda. Posso confirmar o pedido?', [], null],
    ['ag-08', 'c14', 'usr-carla', 'Vendas', 'comercial', 5, '09:00', 'Fatura do contrato trimestral', 'texto',
      'Olá! Lembrete de pagamento: a fatura de outubro do contrato trimestral vence no dia 15.', [],
      { enabled: true, frequency: 'mensal', days: [], day_of_month: 10, hour: '09:00', repetitions: 3, occurrence_index: 1 }],
    ['ag-09', 'ct-11', 'usr-ana', 'Vendas', 'comercial', 6, '10:00', 'Lançamento linha integral', 'video',
      'Ricardo, faz tempo que não conversamos! Chegou a linha de biscoitos integrais com oferta de lançamento. Dá uma olhada no vídeo.', [anexo('anx-3', 'video', 'Linha_Integral.mp4', '4,2 MB')], null],
    ['ag-10', 'c10', 'usr-carla', 'Vendas', 'comercial', 7, '08:00', 'Pedido da semana', 'texto',
      'Bom dia! Já posso lançar o pedido da semana? Mesmas quantidades da semana passada?', [],
      { enabled: true, frequency: 'semanal', days: ['Seg'], hour: '08:00', repetitions: 12, occurrence_index: 1 }],
    ['ag-11', 'ct-16', 'usr-bruno', 'Vendas', 'comercial', 8, '15:00', 'Reativação de cliente', 'texto',
      'Olá! Temos uma oferta especial de reativação: frete grátis no primeiro pedido acima de R$ 800. Vamos conversar?', [], null],
    ['ag-12', 'c6', 'usr-ana', 'Vendas', 'posvenda', 26, '09:00', 'Catálogo de novembro', 'imagem',
      'Bom dia! Segue o catálogo de novembro com os lançamentos de fim de ano.', [anexo('anx-4', 'image', 'Vitrine_Novembro.jpg', '820 KB'), anexo('anx-5', 'document', 'Catalogo_Novembro.pdf', '2,3 MB')], null],
    ['ag-13', 'c11', 'usr-carla', 'Geral', 'posvenda', null, '09:00', 'Feliz Ano Novo', 'texto',
      'Feliz Ano Novo, Patrícia! Obrigada pela parceria neste ano. Que o próximo venha com ótimas vendas!', [], null],
  ];

  const agendamentos = BASE.map(([id, ref, resp, nomeFila, nomeInst, dias, hora, titulo, tipo, mensagem, anexos, recorrencia]) => {
    const conversa = conversas.find((c) => c.id === ref);
    const ct = conversa ? contato(conversa.contact_id) : contato(ref);
    const u = usuario(resp);
    const f = fila(nomeFila);
    const inst = instancia(nomeInst);
    // O de Ano Novo é sempre 2 de janeiro do ano que vem.
    const quando = dias === null ? new Date(agora.getFullYear() + 1, 0, 2, 9, 0, 0, 0) : em(dias, hora);
    const tagsDoContato = [...ct.tags].sort((a, b) => a.name.localeCompare(b.name));
    return {
      id,
      chat_id: conversa ? conversa.id : `chat-${ct.id}`,
      account_id: 'acc-demo',
      content: mensagem,
      scheduled_at: quando.toISOString(),
      status: 'pending',
      instance_id: inst.id,
      created_at: mock.dias(3),
      contact_name: ct.name,
      contact_phone: ct.phone_number,
      instance_name: inst.name,
      effective_instance_id: inst.id,
      channel: 'whatsapp',
      assigned_user_name: u.display_name,
      queue_id: f.id,
      queue_name: f.name,
      queue_instance_id: null,
      queue_status: 'accepted',
      contact_tags: tagsDoContato.map((t) => ({ id: t.id, name: t.name, color: t.color })),
      metadata: {
        title: titulo,
        type: tipo,
        tag: '',
        category: '',
        fila: f.name,
        marker: u.display_name,
        fila_id: f.id,
        marker_id: u.user_id,
        attachments: anexos,
        contactName: ct.name,
        contactPhone: ct.phone_number,
      },
      recurrence_rule: recorrencia,
    };
  });
  mock.dados.agendamentos = agendamentos;

  // Respostas rápidas (a mesma tabela de preços que a Ana manda na conversa da Mariana).
  const categorias = [
    { id: 'qrc-vendas', slug: 'vendas', label: 'Vendas', emoji: '💰', color: '#16a34a', position: 1, is_system: false },
    { id: 'qrc-cobranca', slug: 'cobranca', label: 'Cobrança', emoji: '🧾', color: '#f59e0b', position: 2, is_system: false },
    { id: 'qrc-posvenda', slug: 'pos-venda', label: 'Pós-venda', emoji: '🤝', color: '#2563eb', position: 3, is_system: false },
  ];
  const resposta = (id, title, content, cat, attachments = []) => {
    const c = categorias.find((x) => x.id === cat);
    return {
      id, title, content, position: Number(id.slice(-1)), category_id: c.id, category_slug: c.slug,
      category_label: c.label, category_emoji: c.emoji, category_color: c.color, category: c.slug, attachments,
    };
  };
  const respostas = [
    resposta('qr-1', 'Tabela de preços', 'Segue a tabela de preços atualizada. Qualquer dúvida, estou à disposição!', 'qrc-vendas',
      [anexo('anx-qr-1', 'document', 'Tabela_Precos_Outubro.pdf', '471 KB')]),
    resposta('qr-2', 'Pedido mínimo', 'O pedido mínimo é de R$ 500,00, com frete grátis para a capital acima de R$ 1.200,00.', 'qrc-vendas'),
    resposta('qr-3', 'Prazo de entrega', 'Para a capital a entrega é em até 2 dias úteis; interior e litoral, até 4 dias úteis.', 'qrc-vendas'),
    resposta('qr-4', 'Lembrete de boleto', 'Olá! Passando para lembrar que o boleto vence amanhã. Precisando da segunda via, é só me avisar.', 'qrc-cobranca'),
    resposta('qr-5', 'Pagamento recebido', 'Recebemos o seu pagamento. Muito obrigada!', 'qrc-cobranca'),
    resposta('qr-6', 'Como foi a entrega?', 'Tudo certo com a entrega? Se puder, avalie nosso atendimento de 1 a 5 ⭐', 'qrc-posvenda'),
  ];

  mock.rota('GET', '/api/scheduled-messages', () => agendamentos);
  // O backend devolve a lista pura (comum.js embrulha em { data }, que esta tela não lê).
  mock.rota('GET', '/api/contacts/tags', () => tags);
  mock.rota('GET', '/api/quick-replies/categories', () => categorias);
  mock.rota('GET', '/api/quick-replies', () => respostas);
  mock.rota('GET', '/api/chats/transfer-options', () => ({
    success: true,
    data: {
      queues: filas.map((f) => ({ id: f.id, name: f.name, color: f.color, kind: f.kind, instance_id: null, instance_name: null, instance_label: null })),
      users: usuarios,
    },
  }));
  // Mesma resposta de comum.js, registrada de novo aqui: lá a rota genérica
  // /api/chats/:id é registrada depois e responde 404 para "filter-options" (sem isso o
  // seletor de instância do modal fica vazio).
  mock.rota('GET', '/api/chats/filter-options', () => ({ success: true, data: { queues: filas, users: usuarios, instances: instancias } }));
  mock.rota('GET', '/api/contacts/search', ({ busca }) => {
    const termo = (busca.get('q') || '').toLowerCase();
    const limite = Number(busca.get('limit') || 12);
    return contatos
      .filter((c) => c.name.toLowerCase().includes(termo) || c.phone_number.includes(termo))
      .slice(0, limite)
      .map((c) => ({ id: c.id, name: c.name, phone_number: c.phone_number }));
  });
  // Igual às outras telas: nenhuma tarefa nova atribuída (o selo da barra fica escondido).
  mock.rota('GET', '/api/tasks/assignments/unseen', () => ({ count: 0 }));
  mock.rota('GET', '/api/channels/meta/connection-alerts', () => ({ success: true, alerts: [] }));

  // --- estados para o protótipo ----------------------------------------------------------
  /*
   * Guarda em <div id="mockup-estados" hidden> o que só existe depois de um clique:
   *   sugestoes-contato / sugestoes-vazio   lista do campo "Número ou contato"
   *   anexos-modal                          anexos de um agendamento aberto para editar
   *   resumo-recorrencia                    resumo da recorrência avançada
   *   quick-vazio                           lista vazia das respostas rápidas
   *   menu-usuario                          conteúdo do menu do avatar
   * O modal de respostas rápidas é criado pelo app no primeiro clique e fica no DOM
   * (escondido) depois de fechado. No fim, tudo volta a ficar fechado.
   *
   *   node tools/capture/capture.mjs agendadas "/agendadas.html" 7000 \
   *     "js:window.__mockAgendadas.capturarEstados()"
   */
  async function capturarEstados() {
    const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const $ = (sel) => document.querySelector(sel);
    const caixa = document.createElement('div');
    caixa.id = 'mockup-estados';
    caixa.hidden = true;
    const guardar = (nome, el) => {
      const tpl = document.createElement('template');
      tpl.dataset.estado = nome;
      tpl.innerHTML = el ? el.innerHTML : '';
      caixa.appendChild(tpl);
    };
    const digitar = async (sel, texto, ms = 700) => {
      const campo = $(sel);
      campo.value = texto;
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      await esperar(ms);
    };

    // Novo agendamento: sugestões do campo de contato e respostas rápidas.
    $('#agendadas-open-modal-btn').click();
    await esperar(300);
    await digitar('#agendar-contact', 'ma');
    guardar('sugestoes-contato', $('#agendar-contact-suggestions'));
    await digitar('#agendar-contact', 'zzz');
    guardar('sugestoes-vazio', $('#agendar-contact-suggestions'));
    await digitar('#agendar-contact', '', 300);
    $('#agendar-quick-toggle').click();
    await esperar(400);
    await digitar('#ag-quick-modal-search', 'zzz', 300);
    guardar('quick-vazio', $('#ag-quick-modal-list'));
    await digitar('#ag-quick-modal-search', '', 300);
    $('[data-ag-quick-close]').click();
    $('#agendadas-modal-close').click();
    await esperar(300);

    // Edição de um agendamento com anexos e de um recorrente.
    $('[data-action="edit"][data-id="ag-12"]').click();
    await esperar(300);
    guardar('anexos-modal', $('#agendar-attachments'));
    $('#agendadas-modal-close').click();
    $('[data-action="edit"][data-id="ag-01"]').click();
    await esperar(300);
    guardar('resumo-recorrencia', $('#agendar-rec-summary'));
    $('#agendadas-modal-close').click();
    await esperar(300);

    // Menu do avatar (flutuante nesta tela).
    $('[data-user-btn]')?.click();
    await esperar(300);
    guardar('menu-usuario', $('[data-user-popover]'));
    $('[data-user-btn]')?.click();
    await esperar(300);

    document.body.appendChild(caixa);
    return caixa.children.length;
  }

  window.__mockAgendadas = { capturarEstados };
})();
