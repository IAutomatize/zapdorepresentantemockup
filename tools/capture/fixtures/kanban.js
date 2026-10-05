/*
 * Rotas só da tela do Kanban (kanban.html) e do mini-chat que abre por cima dela
 * (kanban-chat-float). Um card por CONVERSA: as 14 conversas do comum.js, nas colunas
 * definidas lá (colunaPorConversa).
 *
 * O board do comum.js devolve só { id, chat_id, contact_id, column_id }; o kanban.ts lê a
 * projeção completa do backend (kanban.model.ts → cardsBaseQuery), então a rota é
 * sobrescrita aqui com os mesmos campos.
 */
(function () {
  const mock = window.__mock;
  const { min, agora } = mock;
  const { filas, tags, contatos, conversas, colunas } = mock.dados;

  /** ISO de daqui a `d` dias, na hora `h:m` local. */
  function futuro(d, h, m = 0) {
    const data = new Date(agora + d * 86_400_000);
    data.setHours(h, m, 0, 0);
    return data.toISOString();
  }

  // --- histórico das conversas (o mesmo texto do chats.html) --------------------------
  // [quem, texto, minutos antes da última mensagem]; quem = 'ela' | 'eu' | 'doc-ela' | 'doc-eu'
  const roteiro = {
    c1: [
      ['ela', 'Oi Ana, bom dia! Tudo bem?', 62],
      ['eu', 'Bom dia, Mariana! Tudo ótimo, e com você?', 60],
      ['ela', 'Tudo certo! Queria saber se a tabela de outubro já saiu', 58],
      ['eu', 'Saiu sim! Te mando agora 👇', 56],
      ['doc-eu', 'Tabela_Precos_Outubro.pdf', 55],
      ['ela', 'Obrigada! Os preços do achocolatado mudaram?', 28],
      ['eu', 'Ficaram iguais. Só a linha de biscoitos teve reajuste de 4%.', 26],
      ['ela', 'Ótimo. Então quero repetir o último pedido', 3],
      ['ela', 'Perfeito, pode mandar o pedido de 40 caixas 👍', 0],
    ],
    c2: [['ela', 'Boa tarde! Aqui é o Roberto, do Mercado Bom Preço', 3], ['ela', 'Vocês têm o display novo em estoque?', 0]],
    c3: [['eu', 'Pedro, segue o boleto do pedido 2231, vencimento dia 15.', 7], ['ela', 'Recebi o boleto, obrigado!', 0]],
    c4: [['eu', 'Oi! O pedido de vocês foi faturado hoje cedo.', 19], ['ela', 'Qual o prazo de entrega para Santos?', 0]],
    c5: [['eu', 'Juliana, consegui 5% de desconto à vista para o pedido acima de 30 caixas.', 12], ['ela', 'Vou ver com meu sócio e te retorno', 0]],
    c6: [['ela', 'Bom dia! Pode me mandar o catálogo novo?', 14], ['eu', 'Claro! Acabei de pedir para o pessoal do marketing.', 9], ['doc-ela', 'Catalogo_Outubro.pdf', 0]],
    c7: [['ela', 'Bom dia! Tudo certo para quinta?', 0]],
    c8: [['eu', 'Pedido confirmado: 12 caixas de biscoito sortido. A nota sai na segunda.', 5], ['ela', 'Fechado. Aguardo a nota.', 0]],
    c9: [['ela', 'Oi! Vi o anúncio de vocês no Instagram', 4], ['ela', 'Tenho uma loja em Osasco', 3], ['ela', 'Pode me passar a tabela de atacado?', 0]],
    c10: [['eu', 'Bom dia! Já posso lançar o pedido da semana?', 40], ['ela', 'Pode sim, mesmas quantidades da semana passada', 15], ['ela', 'Segue o pedido da semana em anexo', 0]],
    c11: [['eu', 'Patrícia, chegou tudo certinho?', 25], ['ela', 'Chegou sim!', 2], ['ela', 'Amei os produtos novos!', 0]],
    c12: [['eu', 'Segue a proposta para o pedido trimestral.', 60], ['ela', 'Recebi a proposta.', 5], ['ela', 'Consegue fazer 8% no volume de 200 caixas?', 0]],
    c13: [['eu', 'Camila, seu pedido saiu para entrega hoje.', 30], ['ela', 'Obrigada pelo atendimento 😊', 0]],
    c14: [['eu', 'Conversei com a diretoria: dá para manter o preço por 3 meses.', 45], ['ela', 'Vamos fechar o contrato trimestral', 0]],
  };

  let seq = 0;
  const mensagens = {};
  for (const c of conversas) {
    const ultima = Date.parse(c.last_message_time);
    const responsavel = c.assigned_user_name;
    mensagens[c.id] = (roteiro[c.id] || []).map(([quem, texto, antes]) => {
      seq += 1;
      const saida = quem === 'eu' || quem === 'doc-eu';
      const documento = quem.startsWith('doc-');
      return {
        id: `m-${c.id}-${seq}`,
        chat_id: c.id,
        // Mensagem enviada com assinatura ligada: o mini-chat mostra o nome acima do texto.
        content: saida && !documento ? `${responsavel}:\n${texto}` : texto,
        sender_type: saida ? 'user' : 'contact',
        sent_at: new Date(ultima - antes * 60_000).toISOString(),
        message_type: documento ? 'document' : 'text',
        status: saida ? 'read' : 'received',
        direction: saida ? 'outgoing' : 'incoming',
        external_id: `EXT${seq}`,
        media_url: null,
        media_info: documento ? { fileName: texto, mimetype: 'application/pdf', fileLength: 482133, pageCount: 6 } : null,
      };
    });
  }

  // --- observações e agendamentos -----------------------------------------------------
  const observacoes = {
    'ct-01': [['Cliente VIP: costuma repetir o pedido do mês anterior.', 20]],
    'ct-04': [['Pagamento sempre no boleto 28 dias.', 40], ['Entrega em Santos só às terças e quintas.', 6]],
    'ct-14': [['Pediu 8% no volume de 200 caixas. Aguardando aprovação da fábrica.', 1]],
    'ct-22': [['Falar com o setor de compras antes das 11h.', 30], ['Contrato trimestral: enviar a minuta até sexta.', 2]],
  };
  const obsDe = (contatoId) => (observacoes[contatoId] || []).map(([text, d]) => ({ text, created_at: mock.dias(d) }));

  const agendadas = [
    ['ag-1', 'c3', 'Pedro, lembrete: o boleto do pedido 2231 vence amanhã.', futuro(2, 9)],
    ['ag-2', 'c5', 'Oi Juliana! Conseguiu conversar com seu sócio sobre o pedido?', futuro(1, 10)],
    ['ag-3', 'c14', 'Bom dia! Segue a minuta do contrato trimestral para revisão.', futuro(1, 8, 30)],
    ['ag-4', 'c14', 'Lembrete: reunião de fechamento do contrato na quinta às 15h.', futuro(3, 9)],
    ['ag-5', 'c11', 'Patrícia, os lançamentos de novembro chegaram! Quer que eu separe uma amostra?', futuro(7, 14)],
  ].map(([id, chat, content, quando]) => ({ id, chat_id: chat, content, scheduled_at: quando, status: 'pending' }));

  // --- cards (projeção do cardsBaseQuery) -------------------------------------------------
  const colunaPorConversa = Object.fromEntries(mock.dados.cards.map((c) => [c.chat_id, c.column_id]));
  const cards = conversas.map((c, i) => {
    const ct = contatos.find((x) => x.id === c.contact_id);
    const lista = mensagens[c.id];
    const ultima = lista[lista.length - 1];
    const entradas = lista.filter((m) => m.sender_type === 'contact');
    const obs = obsDe(ct.id);
    return {
      id: `kp-${c.id}`,
      position_id: `kp-${c.id}`,
      account_id: 'acc-demo',
      contact_id: ct.id,
      chat_id: c.id,
      column_id: colunaPorConversa[c.id],
      position: i + 1,
      notes: obs.length ? obs[obs.length - 1].text : null,
      created_at: c.created_at,
      updated_at: c.last_message_time,
      name: ct.name,
      phone_number: ct.phone_number,
      email: ct.email,
      profile_picture_url: null,
      tags: ct.tags.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      assigned_user_id: c.assigned_user_id,
      assigned_user_name: c.assigned_user_name,
      queue_id: c.queue_id,
      queue_name: c.queue_name,
      queue_color: c.queue_color,
      instance_id: c.instance_id,
      instance_name: c.instance_name,
      instance_display_label: c.instance_display_label,
      instance_color: c.instance_color,
      ai_bucket: null,
      last_message_content: ultima.content,
      last_message_type: ultima.message_type,
      last_message_sender_type: ultima.sender_type,
      last_message_sent_at: ultima.sent_at,
      last_incoming_message_at: entradas.length ? entradas[entradas.length - 1].sent_at : null,
      scheduled_count: agendadas.filter((a) => a.chat_id === c.id).length,
    };
  });
  // Mesma ordem do backend: por coluna, o card com a mensagem mais recente primeiro.
  cards.sort((a, b) => a.column_id.localeCompare(b.column_id) || Date.parse(b.last_message_sent_at) - Date.parse(a.last_message_sent_at));
  mock.dados.cardsKanban = cards;

  // --- respostas rápidas ----------------------------------------------------------------
  const categoriasRapidas = [
    { id: 'qr-vendas', name: 'Vendas', emoji: '💰', color: '#16a34a' },
    { id: 'qr-cobranca', name: 'Cobrança', emoji: '🧾', color: '#f59e0b' },
    { id: 'qr-posvenda', name: 'Pós-venda', emoji: '📦', color: '#2563eb' },
  ];
  const respostasRapidas = [
    ['qr-1', 'Tabela de preços', 'Segue a tabela de preços atualizada de outubro. Qualquer dúvida, estou à disposição!', 'qr-vendas'],
    ['qr-2', 'Prazo de entrega', 'Para a capital o prazo é de 2 dias úteis; interior e litoral, de 3 a 5 dias úteis.', 'qr-vendas'],
    ['qr-3', 'Pedido mínimo', 'O pedido mínimo é de 10 caixas, e dá para misturar os sabores.', 'qr-vendas'],
    ['qr-4', 'Segunda via de boleto', 'Olá! Identificamos um boleto em aberto. Posso te mandar a segunda via?', 'qr-cobranca'],
    ['qr-5', 'Pedido faturado', 'Seu pedido foi faturado hoje e já segue para entrega. Obrigado pela preferência!', 'qr-posvenda'],
  ].map(([id, title, content, cat]) => ({
    id, title, content, category_id: cat,
    category_name: categoriasRapidas.find((c) => c.id === cat).name, attachments: [],
  }));

  // --- rotas --------------------------------------------------------------------------
  mock.rota('GET', '/api/kanban/board', () => ({ columns: colunas, contacts: cards }));
  mock.rota('GET', /^\/api\/kanban\/columns\/([^/]+)\/contacts$/, ({ params: [id] }) => cards.filter((c) => c.column_id === id));
  mock.rota('GET', '/api/kanban/tags', () => tags);
  mock.rota('GET', '/api/queues', () => ({
    success: true,
    data: filas.map((f) => ({ ...f, instance_name: null, instance_label: null })),
  }));
  mock.rota('POST', '/api/kanban/move-contact', () => ({ success: true }));

  // O backend devolve o contato "cru" (contacts.controller → res.json(contact)); o comum.js
  // embrulha em { success, data }, que o mini-chat não lê.
  mock.rota('GET', /^\/api\/contacts\/([^/]+)$/, ({ params: [id] }) => contatos.find((x) => x.id === id));
  mock.rota('GET', /^\/api\/contacts\/([^/]+)\/observations$/, ({ params: [id] }) => ({ observations: obsDe(id) }));
  mock.rota('GET', '/api/scheduled-messages', ({ busca }) => agendadas.filter((a) => a.chat_id === busca.get('chat_id')));

  mock.rota('GET', /^\/api\/chats\/([^/]+)\/messages$/, ({ params: [id] }) => ({ success: true, messages: mensagens[id] || [] }));
  mock.rota('PATCH', /^\/api\/chats\/([^/]+)\/read$/, () => ({ success: true }));
  mock.rota('GET', '/api/quick-replies/categories', () => categoriasRapidas);
  mock.rota('GET', '/api/quick-replies', () => respostasRapidas);

  // Barra lateral: sem tarefa nova atribuída (igual às outras telas) e sem alerta de canal.
  mock.rota('GET', '/api/tasks/assignments/unseen', () => ({ count: 0 }));
  mock.rota('GET', '/api/channels/meta/connection-alerts', () => ({ alerts: [] }));
})();
