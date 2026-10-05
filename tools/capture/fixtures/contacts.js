/*
 * Rotas só da tela de Contatos (contacts.html). Os 24 contatos são os de comum.js, com o
 * cadastro completo que a tela de edição mostra (CNPJ, endereço, campos personalizados).
 *
 * Formatos lidos de src/public/js/contacts.ts e do backend (contacts.controller/model):
 *   GET /api/contacts              { contacts, total, totalPages, currentPage }
 *   GET /api/contacts/search       Contact[]
 *   GET /api/contacts/:id          Contact (objeto puro, sem envelope)
 *   GET /api/contacts/tags         Tag[] (comum.js devolve envelope; aqui é array)
 *   GET /api/contacts/custom-fields  [{ id, field_key, label, field_type }]
 *   GET /api/contacts/groups       { groups, total }
 *
 * Truque da paginação: a lista devolve TODOS os contatos do filtro de uma vez (o total e
 * as páginas seguem calculados por 12). Assim a captura tem as 24 linhas renderizadas pelo
 * app e o bloco MOCKUP da página mostra 12 por vez.
 *
 * CNPJs com dígito verificador propositalmente inválido: não existem de verdade.
 */
(function () {
  const mock = window.__mock;
  const { dias, min } = mock;
  const { contatos, tags, conversas, usuarios, instancias } = mock.dados;

  // [id, cpf/cnpj, cep, endereço, número, complemento, bairro, código, segmento, prazo]
  const cadastro = {
    'ct-01': [null, '04120-000', 'Rua Domingos de Morais', '1820', 'Loja 2', 'Vila Mariana', 'CLI-1001', 'Mercearia', '28 dias'],
    'ct-02': ['41.258.730/0001-09', '07110-000', 'Av. Paulo Faccini', '940', null, 'Centro', 'CLI-1002', 'Supermercado', '30/60 dias'],
    'ct-03': [null, '13015-000', 'Rua Barão de Jaguara', '655', null, 'Centro', 'CLI-1003', 'Loja de bairro', 'À vista'],
    'ct-04': ['38.114.596/0001-58', '11013-000', 'Rua Amador Bueno', '312', 'Galpão 4', 'Paquetá', 'CLI-1004', 'Distribuidor', '30/60/90 dias'],
    'ct-05': [null, '05415-000', 'Rua Teodoro Sampaio', '1120', null, 'Pinheiros', 'CLI-1005', 'Loja de bairro', '28 dias'],
    'ct-06': ['27.659.034/0001-74', '13201-000', 'Rua Barão de Jundiaí', '480', null, 'Centro', 'CLI-1006', 'Empório', '28 dias'],
    'ct-07': [null, '18035-000', 'Av. General Carneiro', '700', null, 'Vila Lucy', 'CLI-1007', 'Loja de bairro', 'À vista'],
    'ct-08': ['45.830.172/0001-55', '03310-000', 'Rua Tuiuti', '1500', null, 'Tatuapé', 'CLI-1008', 'Padaria', '14 dias'],
    'ct-09': [null, '06010-000', 'Rua Antônio Agu', '255', 'Sala 3', 'Centro', 'CLI-1009', 'Loja de bairro', 'À vista'],
    'ct-10': ['33.907.461/0001-35', '09015-000', 'Av. Portugal', '1100', null, 'Centro', 'CLI-1010', 'Supermercado', '30/60 dias'],
    'ct-11': [null, '09750-000', 'Rua Marechal Deodoro', '890', null, 'Centro', 'CLI-1011', 'Loja de bairro', '28 dias'],
    'ct-12': ['29.571.840/0001-21', '02013-000', 'Rua Voluntários da Pátria', '2400', null, 'Santana', 'CLI-1012', 'Varejo', 'À vista'],
    'ct-13': [null, '13025-000', 'Av. Júlio de Mesquita', '410', 'Loja 1', 'Cambuí', 'CLI-1013', 'Empório', '28 dias'],
    'ct-14': ['46.213.058/0001-49', '12245-000', 'Av. Andrômeda', '1980', 'Galpão B', 'Jardim Satélite', 'CLI-1014', 'Atacarejo', '30/60/90 dias'],
    'ct-15': [null, '08710-000', 'Rua Coronel Souza Franco', '320', null, 'Centro', 'CLI-1015', 'Loja de bairro', 'À vista'],
    'ct-16': ['31.845.207/0001-25', '12020-000', 'Rua Visconde do Rio Branco', '155', null, 'Centro', 'CLI-1016', 'Mercearia', '28 dias'],
    'ct-17': [null, '04538-000', 'Rua Joaquim Floriano', '760', 'Loja 4', 'Itaim Bibi', 'CLI-1017', 'Empório', '28 dias'],
    'ct-18': ['44.092.615/0001-95', '06454-000', 'Alameda Rio Negro', '585', null, 'Alphaville', 'CLI-1018', 'Hortifruti', '14 dias'],
    'ct-19': [null, '13400-000', 'Rua Governador Pedro de Toledo', '1040', null, 'Centro', 'CLI-1019', 'Loja de bairro', 'À vista'],
    'ct-20': ['36.728.194/0001-28', '01310-000', 'Av. Paulista', '2073', 'Loja 12', 'Bela Vista', 'CLI-1020', 'Conveniência', '14 dias'],
    'ct-21': [null, '14025-000', 'Av. Presidente Vargas', '1500', null, 'Jardim América', 'CLI-1021', 'Empório', '28 dias'],
    'ct-22': ['42.570.381/0001-29', '13050-000', 'Av. John Boyd Dunlop', '3900', null, 'Jardim Ipaussurama', 'CLI-1022', 'Rede de supermercados', '30/60/90 dias'],
    'ct-23': [null, '11060-000', 'Av. Ana Costa', '480', null, 'Gonzaga', 'CLI-1023', 'Loja de bairro', 'À vista'],
    'ct-24': ['30.816.452/0001-32', '01414-000', 'Rua Haddock Lobo', '1210', null, 'Cerqueira César', 'CLI-1024', 'Cafeteria', '14 dias'],
  };

  const camposPersonalizados = [
    { id: 'cf-codigo', field_key: 'codigo_cliente', label: 'Código do cliente', field_type: 'text' },
    { id: 'cf-prazo', field_key: 'prazo_pagamento', label: 'Prazo de pagamento', field_type: 'text' },
    { id: 'cf-segmento', field_key: 'segmento', label: 'Segmento', field_type: 'text' },
  ];

  const porNome = (a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.phone_number.localeCompare(b.phone_number);

  // Mesmo formato que o backend devolve (SELECT da lista + campos oficiais).
  const completos = contatos.map((c) => {
    const [cpf, cep, endereco, numero, complemento, bairro, codigo, segmento, prazo] = cadastro[c.id];
    return {
      id: c.id,
      account_id: 'acc-demo',
      name: c.name,
      phone_number: c.phone_number,
      email: c.email,
      birth_date: c.birthday,
      birthday_auto_enabled: Boolean(c.birthday),
      cpf_cnpj: cpf,
      postal_code: cep,
      address: endereco,
      address_number: numero,
      address_complement: complemento,
      neighborhood: bairro,
      city: c.city,
      state: c.state,
      country: 'Brasil',
      custom_fields: { codigo_cliente: codigo, segmento, prazo_pagamento: prazo },
      profile_picture_url: null,
      // O banco ordena as tags por nome.
      tags: [...c.tags].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  }).sort(porNome);

  const comConversa = new Set(conversas.map((c) => c.contact_id));

  function filtrar(busca) {
    const tag = busca.get('tag_id');
    if (busca.get('no_tag') === 'true') return completos.filter((c) => c.tags.length === 0);
    if (tag) return completos.filter((c) => c.tags.some((t) => t.id === tag));
    return completos;
  }

  // --- contatos ------------------------------------------------------------------------
  // Registrada primeiro: as rotas fixas abaixo (tags, search...) vencem por virem depois.
  mock.rota('GET', /^\/api\/contacts\/([^/]+)$/, ({ params: [id] }) => completos.find((c) => c.id === id));

  mock.rota('GET', '/api/contacts', ({ busca }) => {
    const limite = Number(busca.get('limit') || 50);
    const lista = filtrar(busca);
    return {
      contacts: lista,
      total: lista.length,
      totalPages: Math.ceil(lista.length / limite),
      currentPage: Number(busca.get('page') || 1),
    };
  });

  mock.rota('GET', '/api/contacts/search', ({ busca }) => {
    const termo = String(busca.get('q') || '').trim().toLowerCase();
    return completos.filter((c) => c.name.toLowerCase().includes(termo) || c.phone_number.includes(termo)).slice(0, 50);
  });

  mock.rota('GET', '/api/contacts/tags', () => tags);
  mock.rota('GET', '/api/contacts/custom-fields', () => camposPersonalizados);

  mock.rota('POST', '/api/contacts/bulk-delete/preview', ({ corpo }) => {
    const ids = corpo?.selection?.mode === 'ids' ? corpo.selection.ids : completos.map((c) => c.id);
    const comChat = ids.filter((id) => comConversa.has(id)).length;
    return { total: ids.length, withChats: comChat, withoutChats: ids.length - comChat, canDeleteWithChats: true };
  });

  // --- instâncias (importar do WhatsApp, iniciar conversa, criar grupo) -----------------
  mock.rota('GET', '/api/whatsapp/connected-instances', () => ({
    instances: instancias.map((i) => ({ id: i.id, name: i.label, instance_name: i.name, display_label: i.label, status: 'CONNECTED' })),
  }));
  mock.rota('GET', '/api/channels/whatsapp/instances', () => instancias.map((i) => ({
    id: i.id, instance_name: i.name, display_label: i.label, phone_number: i.phone_number, status: 'CONNECTED', metadata: {},
  })));
  mock.rota('GET', '/api/channels/whatsapp_meta/instances', () => []);
  mock.rota('GET', '/api/channels/email/instances', () => []);

  // --- grupos ----------------------------------------------------------------------------
  const [comercial, posvenda] = instancias;
  // [id, nome, descrição (última mensagem), responsável, instância, criado há (dias), participantes]
  const baseGrupos = [
    ['grp-1', 'Clientes VIP · Lançamentos', 'Catálogo de outubro já está no grupo 📒', 'Ana Souza', comercial, 120, ['ct-01', 'ct-13', 'ct-21', 'ct-17', 'ct-06']],
    ['grp-2', 'Compras Rede Econômica', 'Pedido trimestral aprovado pela diretoria', 'Carla Dias', comercial, 64, ['ct-22', 'ct-10', 'ct-14']],
    ['grp-3', 'Equipe Comercial', 'Reunião de metas na segunda às 8h', 'Ana Souza', posvenda, 300, []],
    ['grp-4', 'Padarias da Zona Leste', 'Tabela nova de panificação liberada', 'Bruno Lima', posvenda, 45, ['ct-08', 'ct-12', 'ct-20', 'ct-24']],
  ];
  const grupos = baseGrupos.map(([id, nome, descricao, responsavel, inst, criado], i) => ({
    id,
    contact_name: nome,
    contact_phone: null,
    last_message: descricao,
    last_message_time: min(30 + i * 95),
    created_at: dias(criado),
    assigned_user_name: responsavel,
    instance_display_label: inst.label,
    instance_name: inst.name,
    channel: 'whatsapp',
    remote_identity: `12036300000000${String(i + 1).padStart(4, '0')}@g.us`,
    unread_count: [3, 0, 1, 0][i],
    metadata: { group_jid: `12036300000000${String(i + 1).padStart(4, '0')}@g.us` },
    contact_avatar: null,
    can_view: true,
    can_manage_access: true,
  }));
  mock.dados.grupos = grupos;

  mock.rota('GET', '/api/contacts/groups', () => ({ groups: grupos, total: grupos.length }));
  mock.rota('GET', /^\/api\/contacts\/groups\/([^/]+)\/participants$/, ({ params: [id] }) => {
    const base = baseGrupos.find((g) => g[0] === id);
    const equipe = [
      { id: '5511990000001@s.whatsapp.net', name: 'Ana Souza', admin: 'superadmin' },
      { id: '5511990000002@s.whatsapp.net', name: 'Carla Dias', admin: 'admin' },
    ];
    const membros = (base ? base[6] : []).map((ctId) => {
      const c = contatos.find((x) => x.id === ctId);
      return { id: `${c.phone_number}@s.whatsapp.net`, name: c.name, admin: null };
    });
    if (base && base[0] === 'grp-3') {
      membros.push({ id: '5511990000003@s.whatsapp.net', name: 'Bruno Lima', admin: null });
    }
    return { participants: [...equipe, ...membros] };
  });
  mock.rota('GET', /^\/api\/contacts\/groups\/([^/]+)\/access$/, () => ({
    members: usuarios.map((u) => ({
      user_id: u.user_id, name: u.name, email: u.email, role: u.role,
      is_allowed: u.role !== 'member', is_locked: u.role === 'owner',
    })),
  }));
  // --- só para a captura ------------------------------------------------------------------
  // Planilha fictícia de uma feira, aberta direto no mapeamento de colunas (o seletor de
  // arquivo do navegador não roda no headless). Na captura: "js:__mock.abrirPlanilha()".
  const planilha = {
    delimiter: ';',
    renamedHeaders: [],
    headers: ['Nome', 'WhatsApp', 'Email', 'CNPJ', 'Cidade', 'UF', 'Marcador', 'Vendedor'],
    rows: [
      { Nome: 'Mercadinho Boa Vista', WhatsApp: '(11) 99000-0125', Email: 'compras@boavista.exemplo.com.br', CNPJ: '47.391.026/0001-06', Cidade: 'Campinas', UF: 'SP', Marcador: 'Orçamento', Vendedor: 'Bruno' },
      { Nome: 'Panificadora Pão Dourado', WhatsApp: '(11) 99000-0126', Email: '', CNPJ: '', Cidade: 'Guarulhos', UF: 'SP', Marcador: 'Orçamento', Vendedor: 'Carla' },
      { Nome: 'Distribuidora Serra Azul', WhatsApp: '(11) 99000-0127', Email: 'pedidos@serraazul.exemplo.com.br', CNPJ: '', Cidade: 'Jundiaí', UF: 'SP', Marcador: 'Atacado', Vendedor: 'Ana' },
    ],
  };
  mock.abrirPlanilha = () => window.contactsManager.startMappingFlow(planilha, 'separador ";"');
  // Modal de edição com os 5 marcadores, para copiar as pílulas pintadas pelo app.
  mock.todosOsMarcadores = () => {
    const m = window.contactsManager;
    m.selectedTagIds = [];
    m.selectedTagObjects = [];
    tags.forEach((t) => m.addTagToSelection(t.id));
  };
})();
