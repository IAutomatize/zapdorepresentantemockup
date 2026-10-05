/*
 * Mock da API para a captura. Roda ANTES de qualquer script do app e troca o fetch por
 * respostas fixas, para o chats.js real renderizar a tela sem backend.
 *
 * Dados 100% fictícios: este repositório é público. Nunca colar aqui nome, telefone ou
 * conversa de cliente real.
 *
 * Toda rota sem fixture responde um objeto vazio e fica registrada em
 * window.__mockNaoAtendidas, que o capture.mjs imprime no fim.
 */
(function () {
  const agora = Date.now();
  const min = (m) => new Date(agora - m * 60_000).toISOString();

  // Token com cara de JWT e validade longa: o app só decodifica o payload para ler `exp`.
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'usr-demo', account_id: 'acc-demo', exp: 4102444800 })}.mock`;

  const ME = {
    id: 'acc-demo',
    account_id: 'acc-demo',
    user_id: 'usr-demo',
    email: 'ana@exemplo.com.br',
    role: 'owner',
    plan: 'office',
    is_collaborator: false,
    display_name: 'Ana Souza',
    company_name: 'Representações Exemplo',
    email_confirmed: true,
    email_confirmation_required: false,
    feature_permissions: [],
  };
  localStorage.setItem('access_token', token);
  localStorage.setItem('user', JSON.stringify(ME));

  const INSTANCIAS = [
    { id: 'inst-comercial', name: 'comercial', label: 'Comercial', color: '#16a34a', channel: 'whatsapp', status: 'CONNECTED' },
    { id: 'inst-suporte', name: 'suporte', label: 'Pós-venda', color: '#2563eb', channel: 'whatsapp', status: 'CONNECTED' },
  ];
  const FILAS = [
    { id: 'fila-geral', name: 'Geral', color: '#64748b', kind: 'general', instance_id: null },
    { id: 'fila-vendas', name: 'Vendas', color: '#f59e0b', kind: 'custom', instance_id: null },
  ];
  const USUARIOS = [
    { user_id: 'usr-demo', membership_id: 'mem-demo', name: 'Ana Souza', display_name: 'Ana Souza', email: 'ana@exemplo.com.br', role: 'owner' },
    { user_id: 'usr-bruno', membership_id: 'mem-bruno', name: 'Bruno Lima', display_name: 'Bruno Lima', email: 'bruno@exemplo.com.br', role: 'member' },
  ];

  const politicaLivre = { mode: 'free_text', window_open: true, window_expires_at: null, reason_code: null, template_required: false };

  function conversa(id, nome, fone, ultima, minutos, extra) {
    const inst = (extra && extra.inst) || INSTANCIAS[0];
    const fila = (extra && extra.fila) || FILAS[1];
    return Object.assign({
      id,
      channel: 'whatsapp',
      instance_id: inst.id,
      instance_name: inst.name,
      instance_display_label: inst.label,
      instance_color: inst.color,
      remote_identity: fone,
      contact_id: `ct-${id}`,
      contact_name: nome,
      contact_phone: fone,
      contact_avatar: null,
      last_message: ultima,
      last_message_time: min(minutos),
      unread_count: 0,
      is_favorite: false,
      is_group: false,
      queue_id: fila.id,
      queue_name: fila.name,
      queue_color: fila.color,
      queue_status: 'accepted',
      queue_entered_at: min(minutos + 30),
      ai_bucket: null,
      assigned_user_id: 'usr-demo',
      assigned_user_name: 'Ana Souza',
      messaging_policy: politicaLivre,
      metadata: {},
    }, extra && extra.campos);
  }

  const CONVERSAS = [
    conversa('c1', 'Mariana Costa', '5511990000101', 'Perfeito, pode mandar o pedido de 40 caixas 👍', 2),
    conversa('c2', 'Mercado Bom Preço', '5511990000102', 'Vocês têm o display novo em estoque?', 14, { campos: { unread_count: 1 } }),
    conversa('c3', 'Pedro Almeida', '5511990000103', 'Recebi o boleto, obrigado!', 47, { inst: INSTANCIAS[1] }),
    conversa('c4', 'Distribuidora Litoral', '5511990000104', 'Qual o prazo de entrega para Santos?', 95, { campos: { is_favorite: true } }),
    conversa('c5', 'Juliana Ribeiro', '5511990000105', 'Vou ver com meu sócio e te retorno', 180),
    conversa('c6', 'Empório Central', '5511990000106', 'Catalogo_Outubro.pdf', 260, { inst: INSTANCIAS[1] }),
    conversa('c7', 'Carlos Mendes', '5511990000107', 'Bom dia! Tudo certo para quinta?', 1440),
    conversa('c8', 'Padaria Estrela', '5511990000108', 'Fechado. Aguardo a nota.', 2900),
  ];

  let seq = 0;
  function msg(chat, quem, texto, minutos, extra) {
    seq += 1;
    const saida = quem === 'eu';
    return Object.assign({
      id: `m-${chat}-${seq}`,
      chat_id: chat,
      content: texto,
      sender_type: saida ? 'user' : 'contact',
      sender_id: saida ? 'usr-demo' : `ct-${chat}`,
      sent_at: min(minutos),
      message_type: 'text',
      status: saida ? 'read' : 'received',
      channel: 'whatsapp',
      direction: saida ? 'outgoing' : 'incoming',
      external_id: `EXT${seq}`,
      media_url: null,
      media_info: null,
    }, extra);
  }

  const MENSAGENS = {
    c1: [
      msg('c1', 'ela', 'Oi Ana, bom dia! Tudo bem?', 64),
      msg('c1', 'eu', 'Bom dia, Mariana! Tudo ótimo, e com você?', 62),
      msg('c1', 'ela', 'Tudo certo! Queria saber se a tabela de outubro já saiu', 60),
      msg('c1', 'eu', 'Saiu sim! Te mando agora 👇', 58),
      msg('c1', 'eu', 'Tabela_Precos_Outubro.pdf', 57, {
        message_type: 'document',
        media_info: { fileName: 'Tabela_Precos_Outubro.pdf', mimetype: 'application/pdf', fileLength: 482133, pageCount: 6 },
      }),
      msg('c1', 'ela', 'Obrigada! Os preços do achocolatado mudaram?', 30),
      msg('c1', 'eu', 'Ficaram iguais. Só a linha de biscoitos teve reajuste de 4%.', 28),
      msg('c1', 'ela', 'Ótimo. Então quero repetir o último pedido', 5),
      msg('c1', 'ela', 'Perfeito, pode mandar o pedido de 40 caixas 👍', 2),
    ],
  };
  for (const c of CONVERSAS) {
    if (!MENSAGENS[c.id]) {
      MENSAGENS[c.id] = [msg(c.id, 'ela', c.last_message, (Date.now() - Date.parse(c.last_message_time)) / 60_000)];
    }
  }

  const CONTATOS = Object.fromEntries(CONVERSAS.map((c) => [c.contact_id, {
    id: c.contact_id,
    name: c.contact_name,
    phone_number: c.contact_phone,
    email: null,
    profile_picture_url: null,
    tags: c.id === 'c1' ? [{ id: 'tag-cliente', name: 'Cliente ativo', color: '#16a34a' }] : [],
    custom_fields: {},
    birthday: null,
    observations: [],
    created_at: min(60 * 24 * 90),
  }]));

  const TAGS = [
    { id: 'tag-cliente', name: 'Cliente ativo', color: '#16a34a' },
    { id: 'tag-orcamento', name: 'Orçamento', color: '#f59e0b' },
    { id: 'tag-vip', name: 'VIP', color: '#7c3aed' },
  ];

  const COLUNAS = [
    { id: 'col-novo', name: 'Novo contato', color: '#64748b', is_default: true, position: 0 },
    { id: 'col-negociacao', name: 'Em negociação', color: '#f59e0b', is_default: false, position: 1 },
    { id: 'col-pedido', name: 'Pedido enviado', color: '#16a34a', is_default: false, position: 2 },
  ];
  const CARDS = CONVERSAS.map((c, i) => ({
    contact_id: c.contact_id,
    chat_id: c.id,
    column_id: COLUNAS[i % COLUNAS.length].id,
  }));
  CARDS[0].column_id = 'col-negociacao';

  const json = (corpo, status = 200) => new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

  // Stream SSE que abre, avisa "connected" e fica aberto para sempre.
  const streamAberto = () => new Response(new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n'));
    },
  }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });

  function responder(caminho, metodo, busca) {
    let m;
    if (caminho === '/me') return json(ME);
    if (/\/stream$/.test(caminho)) return streamAberto();

    if (caminho === '/api/chats' && metodo === 'GET') {
      // Só a aba "Em aberto" tem conversas; grupos, filas e chatbot ficam vazios.
      const aba = busca.get('listFilter') || 'all';
      const lista = aba === 'all' ? CONVERSAS : [];
      return json({ success: true, chats: lista, total: lista.length });
    }
    if (caminho === '/api/kanban/columns') return json(COLUNAS);
    if (caminho === '/api/kanban/board') return json({ columns: COLUNAS, contacts: CARDS });
    if (caminho === '/api/chats/filter-options') {
      return json({ success: true, data: { queues: FILAS, users: USUARIOS, instances: INSTANCIAS } });
    }
    if ((m = caminho.match(/^\/api\/chats\/([^/]+)\/messages$/)) && metodo === 'GET') {
      return json({ success: true, messages: MENSAGENS[m[1]] || [] });
    }
    if ((m = caminho.match(/^\/api\/chats\/([^/]+)$/)) && metodo === 'GET') {
      const c = CONVERSAS.find((x) => x.id === m[1]);
      return c ? json(c) : json({ error: 'nao_encontrado' }, 404);
    }
    if ((m = caminho.match(/^\/api\/contacts\/([^/]+)$/)) && metodo === 'GET' && CONTATOS[m[1]]) {
      return json({ success: true, data: CONTATOS[m[1]], contact: CONTATOS[m[1]] });
    }
    if (caminho === '/api/contacts/tags' || caminho === '/api/tags') return json({ success: true, data: TAGS, tags: TAGS });
    if (caminho === '/api/memberships') return json({ success: true, data: USUARIOS, memberships: USUARIOS });
    if (caminho === '/api/billing/access') return json({ situacao: 'ativa', liberado: true });
    return null;
  }

  window.__mockNaoAtendidas = [];
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async function (entrada, opcoes) {
    const url = new URL(typeof entrada === 'string' ? entrada : entrada.url, location.origin);
    const metodo = String((opcoes && opcoes.method) || (entrada && entrada.method) || 'GET').toUpperCase();
    const ehApi = url.origin === location.origin && (url.pathname.startsWith('/api/') || url.pathname === '/me' || url.pathname === '/logout');
    if (!ehApi) return fetchOriginal(entrada, opcoes);

    const resposta = responder(url.pathname, metodo, url.searchParams);
    if (resposta) return resposta;
    window.__mockNaoAtendidas.push(`${metodo} ${url.pathname}`);
    return json(metodo === 'GET' ? { success: true, data: [] } : { success: true });
  };
})();
