/*
 * Universo fictício compartilhado por todas as páginas. Repositório público: nada aqui
 * pode ser de cliente real. Telefones seguem o padrão 55119900001NN.
 *
 * Fica em __mock.dados para as fixtures das páginas reaproveitarem (e não inventarem
 * outro contato com o mesmo nome):
 *   me, usuarios, instancias, filas, tags, contatos, conversas, colunas, cards
 */
(function () {
  const mock = window.__mock;
  const { min, dias } = mock;

  // --- conta e sessão -------------------------------------------------------------
  const me = {
    id: 'acc-demo',
    account_id: 'acc-demo',
    user_id: 'usr-ana',
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
  // Token com cara de JWT e validade longa: o app só decodifica o payload para ler `exp`.
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  localStorage.setItem('access_token', `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: me.user_id, account_id: me.account_id, exp: 4102444800 })}.mock`);
  localStorage.setItem('user', JSON.stringify(me));
  localStorage.setItem('theme', 'light');

  const usuarios = [
    { user_id: 'usr-ana', membership_id: 'mem-ana', name: 'Ana Souza', display_name: 'Ana Souza', email: 'ana@exemplo.com.br', role: 'owner', status: 'active' },
    { user_id: 'usr-carla', membership_id: 'mem-carla', name: 'Carla Dias', display_name: 'Carla Dias', email: 'carla@exemplo.com.br', role: 'admin', status: 'active' },
    { user_id: 'usr-bruno', membership_id: 'mem-bruno', name: 'Bruno Lima', display_name: 'Bruno Lima', email: 'bruno@exemplo.com.br', role: 'member', status: 'active' },
  ];

  const instancias = [
    { id: 'inst-comercial', name: 'comercial', label: 'Comercial', color: '#16a34a', channel: 'whatsapp', status: 'CONNECTED', phone_number: '5511990000001' },
    { id: 'inst-posvenda', name: 'posvenda', label: 'Pós-venda', color: '#2563eb', channel: 'whatsapp', status: 'CONNECTED', phone_number: '5511990000002' },
  ];

  const filas = [
    { id: 'fila-geral', name: 'Geral', color: '#64748b', kind: 'general', instance_id: null },
    { id: 'fila-vendas', name: 'Vendas', color: '#f59e0b', kind: 'custom', instance_id: null },
  ];

  const tags = [
    { id: 'tag-cliente', name: 'Cliente ativo', color: '#16a34a' },
    { id: 'tag-orcamento', name: 'Orçamento', color: '#f59e0b' },
    { id: 'tag-vip', name: 'VIP', color: '#7c3aed' },
    { id: 'tag-atacado', name: 'Atacado', color: '#0ea5e9' },
    { id: 'tag-reativar', name: 'Reativar', color: '#ef4444' },
  ];

  // --- contatos ---------------------------------------------------------------------
  // [id, nome, sufixo do telefone, email, cidade, uf, tags, dias desde o cadastro, aniversário]
  const baseContatos = [
    ['ct-01', 'Mariana Costa', '01', 'mariana.costa@exemplo.com.br', 'São Paulo', 'SP', ['tag-cliente', 'tag-vip'], 210, '1988-03-14'],
    ['ct-02', 'Mercado Bom Preço', '02', 'compras@bompreco.exemplo.com.br', 'Guarulhos', 'SP', ['tag-orcamento'], 12, null],
    ['ct-03', 'Pedro Almeida', '03', null, 'Campinas', 'SP', ['tag-cliente'], 160, '1979-10-09'],
    ['ct-04', 'Distribuidora Litoral', '04', 'pedidos@litoral.exemplo.com.br', 'Santos', 'SP', ['tag-atacado', 'tag-cliente'], 340, null],
    ['ct-05', 'Juliana Ribeiro', '05', 'juliana.ribeiro@exemplo.com.br', 'São Paulo', 'SP', ['tag-orcamento'], 6, '1992-07-21'],
    ['ct-06', 'Empório Central', '06', 'contato@emporio.exemplo.com.br', 'Jundiaí', 'SP', ['tag-cliente'], 95, null],
    ['ct-07', 'Carlos Mendes', '07', null, 'Sorocaba', 'SP', [], 44, '1985-10-06'],
    ['ct-08', 'Padaria Estrela', '08', null, 'São Paulo', 'SP', ['tag-cliente'], 270, null],
    ['ct-09', 'Fernanda Oliveira', '09', 'fernanda.o@exemplo.com.br', 'Osasco', 'SP', ['tag-orcamento'], 3, '1990-12-02'],
    ['ct-10', 'Supermercado Avenida', '10', 'compras@avenida.exemplo.com.br', 'Santo André', 'SP', ['tag-atacado'], 180, null],
    ['ct-11', 'Ricardo Santos', '11', null, 'São Bernardo do Campo', 'SP', ['tag-reativar'], 400, '1975-05-30'],
    ['ct-12', 'Loja da Esquina', '12', null, 'São Paulo', 'SP', [], 21, null],
    ['ct-13', 'Patrícia Gomes', '13', 'patricia.gomes@exemplo.com.br', 'Campinas', 'SP', ['tag-vip', 'tag-cliente'], 300, '1983-10-07'],
    ['ct-14', 'Atacadão do Vale', '14', 'pedidos@atacadaovale.exemplo.com.br', 'São José dos Campos', 'SP', ['tag-atacado'], 75, null],
    ['ct-15', 'Lucas Ferreira', '15', null, 'Mogi das Cruzes', 'SP', [], 9, '1995-01-17'],
    ['ct-16', 'Mercearia São José', '16', null, 'Taubaté', 'SP', ['tag-reativar'], 520, null],
    ['ct-17', 'Camila Rocha', '17', 'camila.rocha@exemplo.com.br', 'São Paulo', 'SP', ['tag-cliente'], 130, '1991-09-12'],
    ['ct-18', 'Hortifruti Verde Vida', '18', null, 'Barueri', 'SP', ['tag-orcamento'], 15, null],
    ['ct-19', 'Thiago Martins', '19', null, 'Piracicaba', 'SP', [], 60, '1987-02-25'],
    ['ct-20', 'Conveniência 24h Centro', '20', null, 'São Paulo', 'SP', ['tag-cliente'], 230, null],
    ['ct-21', 'Beatriz Lima', '21', 'beatriz.lima@exemplo.com.br', 'Ribeirão Preto', 'SP', ['tag-vip'], 410, '1993-11-03'],
    ['ct-22', 'Rede Econômica', '22', 'compras@economica.exemplo.com.br', 'Campinas', 'SP', ['tag-atacado', 'tag-cliente'], 600, null],
    ['ct-23', 'Gustavo Pereira', '23', null, 'Santos', 'SP', [], 33, '1980-08-08'],
    ['ct-24', 'Café Aroma', '24', 'cafe.aroma@exemplo.com.br', 'São Paulo', 'SP', ['tag-orcamento'], 2, null],
  ];
  const contatos = baseContatos.map(([id, nome, sufixo, email, cidade, uf, tagIds, criado, aniversario]) => ({
    id,
    name: nome,
    phone_number: `55119900001${sufixo}`,
    email,
    city: cidade,
    state: uf,
    tags: tagIds.map((t) => tags.find((x) => x.id === t)),
    tag_ids: tagIds,
    birthday: aniversario,
    profile_picture_url: null,
    custom_fields: {},
    created_at: dias(criado),
    updated_at: dias(Math.min(criado, 2)),
  }));

  // --- conversas ------------------------------------------------------------------------
  const politicaLivre = { mode: 'free_text', window_open: true, window_expires_at: null, reason_code: null, template_required: false };
  const [comercial, posvenda] = instancias;
  const vendas = filas[1];

  // [id, contato, última mensagem, minutos atrás, não lidas, instância, favorita, responsável]
  const baseConversas = [
    ['c1', 'ct-01', 'Perfeito, pode mandar o pedido de 40 caixas 👍', 2, 0, comercial, false, 'usr-ana'],
    ['c2', 'ct-02', 'Vocês têm o display novo em estoque?', 14, 1, comercial, false, 'usr-ana'],
    ['c3', 'ct-03', 'Recebi o boleto, obrigado!', 47, 0, posvenda, false, 'usr-ana'],
    ['c4', 'ct-04', 'Qual o prazo de entrega para Santos?', 95, 0, comercial, true, 'usr-ana'],
    ['c5', 'ct-05', 'Vou ver com meu sócio e te retorno', 180, 0, comercial, false, 'usr-ana'],
    ['c6', 'ct-06', 'Catalogo_Outubro.pdf', 260, 0, posvenda, false, 'usr-ana'],
    ['c7', 'ct-07', 'Bom dia! Tudo certo para quinta?', 1440, 0, comercial, false, 'usr-ana'],
    ['c8', 'ct-08', 'Fechado. Aguardo a nota.', 2900, 0, comercial, false, 'usr-ana'],
    ['c9', 'ct-09', 'Pode me passar a tabela de atacado?', 25, 3, comercial, false, 'usr-bruno'],
    ['c10', 'ct-10', 'Segue o pedido da semana em anexo', 70, 0, comercial, false, 'usr-carla'],
    ['c11', 'ct-13', 'Amei os produtos novos!', 130, 0, posvenda, true, 'usr-carla'],
    ['c12', 'ct-14', 'Consegue fazer 8% no volume de 200 caixas?', 300, 2, comercial, false, 'usr-bruno'],
    ['c13', 'ct-17', 'Obrigada pelo atendimento 😊', 1500, 0, posvenda, false, 'usr-ana'],
    ['c14', 'ct-22', 'Vamos fechar o contrato trimestral', 3100, 0, comercial, false, 'usr-carla'],
  ];
  const conversas = baseConversas.map(([id, contatoId, ultima, minutos, naoLidas, inst, favorita, resp]) => {
    const ct = contatos.find((c) => c.id === contatoId);
    const usuario = usuarios.find((u) => u.user_id === resp);
    return {
      id,
      channel: 'whatsapp',
      instance_id: inst.id,
      instance_name: inst.name,
      instance_display_label: inst.label,
      instance_color: inst.color,
      remote_identity: ct.phone_number,
      contact_id: ct.id,
      contact_name: ct.name,
      contact_phone: ct.phone_number,
      contact_avatar: null,
      last_message: ultima,
      last_message_time: min(minutos),
      unread_count: naoLidas,
      is_favorite: favorita,
      is_group: false,
      queue_id: vendas.id,
      queue_name: vendas.name,
      queue_color: vendas.color,
      queue_status: 'accepted',
      queue_entered_at: min(minutos + 30),
      ai_bucket: null,
      assigned_user_id: usuario.user_id,
      assigned_user_name: usuario.name,
      messaging_policy: politicaLivre,
      metadata: {},
      created_at: min(minutos + 600),
    };
  });

  // --- Kanban (um card por conversa) -------------------------------------------------
  const colunas = [
    { id: 'col-novo', name: 'Novo contato', color: '#64748b', is_default: true, position: 0 },
    { id: 'col-negociacao', name: 'Em negociação', color: '#f59e0b', is_default: false, position: 1 },
    { id: 'col-pedido', name: 'Pedido enviado', color: '#16a34a', is_default: false, position: 2 },
    { id: 'col-posvenda', name: 'Pós-venda', color: '#2563eb', is_default: false, position: 3 },
  ];
  const colunaPorConversa = {
    c1: 'col-negociacao', c2: 'col-novo', c3: 'col-posvenda', c4: 'col-negociacao', c5: 'col-novo',
    c6: 'col-pedido', c7: 'col-novo', c8: 'col-pedido', c9: 'col-novo', c10: 'col-pedido',
    c11: 'col-posvenda', c12: 'col-negociacao', c13: 'col-posvenda', c14: 'col-negociacao',
  };
  const cards = conversas.map((c) => ({
    id: `card-${c.id}`,
    chat_id: c.id,
    contact_id: c.contact_id,
    column_id: colunaPorConversa[c.id],
  }));

  Object.assign(mock.dados, { me, usuarios, instancias, filas, tags, contatos, conversas, colunas, cards });

  // --- rotas usadas por várias páginas -------------------------------------------------
  mock.rota('GET', '/me', () => me);
  mock.rota('POST', '/logout', () => ({ success: true }));
  mock.rota('GET', '/api/billing/access', () => ({ situacao: 'ativa', liberado: true }));
  mock.rota('GET', '/api/memberships', () => ({ success: true, data: usuarios, memberships: usuarios }));
  mock.rota('GET', '/api/contacts/tags', () => ({ success: true, data: tags, tags }));
  mock.rota('GET', '/api/tags', () => ({ success: true, data: tags, tags }));
  mock.rota('GET', '/api/chats/filter-options', () => ({ success: true, data: { queues: filas, users: usuarios, instances: instancias } }));
  mock.rota('GET', '/api/kanban/columns', () => colunas);
  mock.rota('GET', '/api/kanban/board', () => ({ columns: colunas, contacts: cards }));
  mock.rota('POST', '/api/whatsapp/sync-contact-avatars', () => ({ success: true, synced: 0 }));

  mock.rota('GET', '/api/chats', ({ busca }) => {
    // Só a aba "Em aberto" tem conversas; grupos, filas e chatbot ficam vazios.
    const aba = busca.get('listFilter') || 'all';
    const lista = aba === 'all' ? conversas : [];
    return { success: true, chats: lista, total: lista.length };
  });
  mock.rota('GET', /^\/api\/chats\/([^/]+)$/, ({ params: [id] }) => {
    const c = conversas.find((x) => x.id === id);
    return c || mock.json({ error: 'nao_encontrado' }, 404);
  });
  mock.rota('GET', /^\/api\/contacts\/([^/]+)$/, ({ params: [id] }) => {
    const c = contatos.find((x) => x.id === id);
    return c ? { success: true, data: c, contact: c } : undefined;
  });
})();
