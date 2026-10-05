/*
 * Rotas só da tela de Configurações (settings.html). Repositório público: tudo aqui é
 * fictício. Reaproveita a conta, a equipe, as instâncias, as filas, os marcadores e os
 * contatos de comum.js, para esta tela contar a mesma história das outras.
 *
 * Cada formato de resposta foi lido no código do app (src/public/js/settings*.ts,
 * access-settings.ts, follow-up-settings.ts, ai-agents-settings.ts, workflows.ts,
 * plans-checkout.ts, account-access-ui.ts) e nos controllers correspondentes.
 *
 * No fim do arquivo, window.__capturarMoldes() abre cada modal e cada estado que o app só
 * desenha ao clicar e guarda a marcação em <template id="molde-..."> no fim do <body>.
 * A captura completa é:
 *
 *   PORTA_APP=... PORTA_CDP=... node tools/capture/capture.mjs settings "/settings.html" 8000 "js:__capturarMoldes()"
 */
(function () {
  const mock = window.__mock;
  const { min, dias } = mock;
  const { usuarios, instancias, filas, tags, contatos, conversas, colunas } = mock.dados;

  const contato = (id) => contatos.find((c) => c.id === id);
  const diaISO = (d) => dias(d).slice(0, 10);

  // --- conta: plano, cobrança, exclusão ------------------------------------------------
  const limites = {
    professional: { whatsapp_numbers: 1, contacts: 500, campaigns_per_month: 10, collaborators: 2 },
    office: { whatsapp_numbers: 3, contacts: 5000, campaigns_per_month: 50, collaborators: 5 },
    enterprise: { whatsapp_numbers: 5, contacts: 20000, campaigns_per_month: 200, collaborators: 15 },
    custom: { whatsapp_numbers: null, contacts: null, campaigns_per_month: null, collaborators: null },
  };
  const recursos = {
    professional: { automations: false, multimedia_campaigns: false, api: false, webhooks: false },
    office: { automations: true, multimedia_campaigns: true, api: false, webhooks: false },
    enterprise: { automations: true, multimedia_campaigns: true, api: true, webhooks: true },
    custom: { automations: true, multimedia_campaigns: true, api: true, webhooks: true },
  };
  // GET /api/billing/plans (billing.controller.ts › listPlans)
  const planos = [
    { id: 'pequeno', name: 'Pequeno Empreendedor', nome_curto: 'Pequeno', price: 97, account_plan: 'professional', destaques: ['Suporte por e-mail'], mais_popular: false, ordem: 1 },
    { id: 'medio', name: 'Médio Empreendedor', nome_curto: 'Médio', price: 197, account_plan: 'office', destaques: ['Suporte prioritário'], mais_popular: true, ordem: 2 },
    { id: 'grande', name: 'Grande Empreendedor', nome_curto: 'Grande', price: 397, account_plan: 'enterprise', destaques: ['Suporte prioritário', 'Treinamento da equipe'], mais_popular: false, ordem: 3 },
    { id: 'personalizado', name: 'Personalizado', nome_curto: 'Personalizado', price: 0, account_plan: 'custom', destaques: ['Suporte dedicado 24/7', 'Gerente de conta'], mais_popular: false, ordem: 4, requires_contact: true },
  ].map((p) => ({
    ...p,
    cycle: 'MONTHLY',
    description: p.requires_contact ? 'Plano personalizado via time comercial' : `Plano ${p.name} - R$ ${p.price}/mês`,
    limits: limites[p.account_plan],
    features: recursos[p.account_plan],
  }));

  mock.rota('GET', '/api/billing/plans', () => planos);
  mock.rota('GET', '/api/billing/cancellation', () => ({
    plan: 'office', payment: 'ok', cancel_requested_at: null, cancel_effective_at: null, cancel_reason: null,
    cancelamento_pendente: false, pode_cancelar: true,
  }));
  mock.rota('GET', '/api/billing/entitlements', () => ({
    plan: 'office', plan_name: 'Médio Empreendedor', limits: limites.office, features: recursos.office,
    usage: { whatsapp_numbers: 2, contacts: contatos.length, campaigns_per_month: 6, collaborators: usuarios.length },
    available_from: { automations: null, multimedia_campaigns: null, api: 'Grande Empreendedor', webhooks: 'Grande Empreendedor' },
    sob_medida: false,
  }));
  // Mais completo que o de comum.js: account-access-ui.ts lê plano, responsável e assinatura.
  mock.rota('GET', '/api/billing/access', () => ({
    situacao: 'ativa', liberado: true, motivo: null, bloqueia_em: null, ultimo_dia_teste: null,
    dias_restantes_teste: null, dia_do_teste: null, duracao_teste_dias: 7, etapa_aviso: 'nenhuma',
    plano: 'office', plano_nome: 'Médio Empreendedor', pode_pagar: true,
    responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com.br' },
    assinatura: { existe: true, pagamento: 'ok' }, modalidade: 'assinatura',
  }));
  mock.rota('GET', '/api/billing/billing-data', () => ({
    modalidade: 'assinatura', forma: 'pix', valor_negociado: null,
    dados: {
      nome: 'Representações Exemplo Ltda', documento: null, documento_mascarado: null, email: 'financeiro@exemplo.com.br',
      telefone: null, cep: null, endereco: null, numero: null, complemento: null, bairro: null, cidade: 'São Paulo', uf: 'SP',
    },
  }));
  mock.rota('GET', '/api/auth/account/deletion', () => ({ plan: 'office', deletion_effective_at: null, exclusao_pendente: false }));
  mock.rota('GET', '/api/settings/api-key', () => ({ api_key: 'zr_exemplo_0000000000000000' }));
  // Chamadas de componentes comuns (barra lateral e alerta do Instagram): sem pendências.
  mock.rota('GET', '/api/tasks/assignments/unseen', () => ({ count: 0 }));
  mock.rota('GET', '/api/channels/meta/connection-alerts', () => ({ alerts: [] }));

  // --- usuários, convites, funções, filas ---------------------------------------------
  const criadoEm = { 'usr-ana': 420, 'usr-carla': 200, 'usr-bruno': 21 };
  const papelId = { owner: 'role-owner', admin: 'role-admin', member: 'role-member' };
  const membros = usuarios.map((u) => ({
    id: u.membership_id,
    user_id: u.user_id,
    email: u.email,
    display_name: u.display_name,
    role: u.role,
    role_id: papelId[u.role],
    status: u.status,
    created_at: dias(criadoEm[u.user_id]),
    accepted_at: dias(criadoEm[u.user_id] - 1),
  }));
  // { page, limit, total, data } (membership-service.ts e settings.ts › loadAllScheduleMembers)
  mock.rota('GET', '/api/memberships', ({ busca }) => ({
    page: Number(busca.get('page') || 1), limit: Number(busca.get('limit') || 10), total: membros.length, data: membros,
  }));

  const convites = [
    { id: 'inv-diego', invited_email: 'diego.vendas@exemplo.com.br', role_id: 'role-member', status: 'pending', expires_at: dias(-5), created_at: dias(2) },
  ];
  mock.rota('GET', '/api/membership-invites', ({ busca }) => {
    const status = busca.get('status');
    const lista = status ? convites.filter((c) => c.status === status) : convites;
    return { page: 1, limit: Number(busca.get('limit') || 10), total: lista.length, data: lista };
  });

  const funcoes = [
    { id: 'role-owner', account_id: null, name: 'owner' },
    { id: 'role-admin', account_id: null, name: 'admin' },
    { id: 'role-member', account_id: null, name: 'member' },
    { id: 'role-externo', account_id: 'acc-demo', name: 'Vendedor externo' },
  ];
  mock.rota('GET', '/api/roles', () => ({ data: funcoes }));

  // Catálogo de permissões: os mesmos rótulos que o app mostra (constants/permissions-catalog.ts).
  const grupos = [
    ['dashboard', 'Dashboard', [['read', 'Ver dashboard', 'Acessar métricas, relatórios e painéis.']]],
    ['chats', 'Conversas', [['read', 'Ver conversas', 'Listar e abrir atendimentos.'], ['write', 'Responder conversas', 'Enviar mensagens, transferir e atualizar atendimentos.'], ['delete', 'Excluir conversas', 'Executar ações destrutivas em conversas.']]],
    ['contacts', 'Contatos', [['read', 'Ver contatos', 'Listar, buscar e visualizar contatos.'], ['write', 'Criar/editar contatos', 'Criar, editar, importar e atualizar contatos.'], ['delete', 'Excluir contatos', 'Excluir contatos, tags ou dados relacionados.']]],
    ['kanban', 'Kanban', [['read', 'Ver kanban', 'Visualizar quadros, colunas e cards.'], ['write', 'Editar kanban', 'Criar, mover e atualizar cards/colunas.'], ['delete', 'Excluir kanban', 'Remover cards, colunas ou quadros.']]],
    ['campaigns', 'Campanhas', [['read', 'Ver campanhas', 'Visualizar campanhas, métricas e públicos.'], ['write', 'Criar/editar campanhas', 'Criar, editar, enviar e gerenciar campanhas.']]],
    ['quick_replies', 'Respostas rápidas', [['read', 'Ver respostas rápidas', 'Listar e visualizar respostas rápidas.'], ['write', 'Criar/editar respostas rápidas', 'Criar, editar e organizar respostas rápidas.'], ['delete', 'Excluir respostas rápidas', 'Excluir respostas rápidas.']]],
    ['calendar', 'Calendário', [['read', 'Ver calendário', 'Visualizar eventos, lembretes e agenda.'], ['write', 'Criar/editar calendário', 'Criar e atualizar eventos e lembretes.']]],
    ['tasks', 'Tarefas', [['read', 'Ver tarefas', 'Visualizar projetos, tarefas, histórico e estatísticas.'], ['write', 'Criar/editar tarefas', 'Criar, editar, atribuir e comentar tarefas.']]],
  ];
  const catalogo = grupos.flatMap(([feature, group, acoes]) => acoes.map(([action, label, description]) => ({
    key: `${feature}.${action}`, feature, action, group, label, description,
  })));
  mock.rota('GET', '/api/roles/permissions/catalog', () => ({ data: catalogo }));
  const permissoesDoExterno = ['dashboard.read', 'chats.read', 'chats.write', 'contacts.read', 'contacts.write', 'kanban.read', 'kanban.write', 'quick_replies.read', 'calendar.read', 'calendar.write', 'tasks.read'];
  mock.rota('GET', /^\/api\/roles\/([^/]+)\/permissions$/, ({ params: [id] }) => {
    const role = funcoes.find((f) => f.id === id) || funcoes[2];
    const chaves = role.id === 'role-externo' ? permissoesDoExterno : ['dashboard.read', 'chats.read', 'chats.write', 'contacts.read', 'kanban.read', 'quick_replies.read'];
    return { role, permissions: chaves.map((permission_key) => ({ permission_key, effect: 'allow' })) };
  });

  // Filas (access-settings.ts › loadQueues / openQueueModal)
  const nomeDe = (userId) => usuarios.find((u) => u.user_id === userId);
  const membrosDaFila = { 'fila-geral': ['usr-ana', 'usr-carla', 'usr-bruno'], 'fila-vendas': ['usr-ana', 'usr-bruno'] };
  const linhaFila = (f) => ({
    id: f.id, account_id: 'acc-demo', instance_id: null, instance_name: null, instance_label: null,
    name: f.name, color: f.color, kind: f.kind,
    auto_transfer_enabled: f.id === 'fila-vendas',
    auto_transfer_after_minutes: f.id === 'fila-vendas' ? 30 : null,
    auto_transfer_target_type: f.id === 'fila-vendas' ? 'queue' : null,
    auto_transfer_target_queue_id: f.id === 'fila-vendas' ? 'fila-geral' : null,
    auto_transfer_target_user_id: null,
    members_count: membrosDaFila[f.id].length,
    created_at: dias(300), updated_at: dias(10),
  });
  const usuariosDaFila = usuarios.map((u) => ({ user_id: u.user_id, name: u.name, email: u.email, role: u.role }));
  mock.rota('GET', '/api/queues', () => ({ success: true, data: filas.map(linhaFila) }));
  mock.rota('GET', '/api/queues/options', () => ({
    success: true,
    data: {
      queues: filas.map((f) => ({ id: f.id, name: f.name, color: f.color, kind: f.kind, instance_id: null, instance_name: null, instance_label: null })),
      users: usuariosDaFila,
    },
  }));
  mock.rota('GET', /^\/api\/queues\/([^/]+)$/, ({ params: [id] }) => {
    const f = filas.find((x) => x.id === id);
    if (!f) return undefined;
    const ids = membrosDaFila[f.id];
    return { success: true, data: { queue: linhaFila(f), member_user_ids: ids, members: ids.map((uid) => usuariosDaFila.find((u) => u.user_id === uid)) } };
  });

  // --- canais (settings-mvp-ui.ts › loadInstances / loadUptimeChart) -------------------
  const instanciasDoCanal = {
    whatsapp: instancias.map((i) => ({
      id: i.id, instance_id: i.id, instance_name: i.name, display_label: i.label,
      phone_number: i.phone_number, status: i.status, metadata: { color: i.color },
    })),
  };
  mock.rota('GET', /^\/api\/channels\/([^/]+)\/instances$/, ({ params: [canal] }) => instanciasDoCanal[canal] || []);
  mock.rota('GET', /^\/api\/channels\/([^/]+)\/instances\/uptime$/, ({ params: [canal], busca }) => {
    const total = Number(busca.get('days') || 7);
    if (!instanciasDoCanal[canal]) return { days: [] };
    // Conexão estável com duas quedas curtas (a de 4 dias atrás foi a troca do roteador).
    const quedas = { 4: 93, 11: 97, 19: 88, 26: 99 };
    return {
      days: Array.from({ length: total }, (_, i) => {
        const atras = total - 1 - i;
        return { day: diaISO(atras), uptime: quedas[atras] ?? 100 };
      }),
    };
  });
  mock.rota('GET', /^\/api\/channels\/[^/]+\/instances\/[^/]+\/status$/, () => ({ status: 'CONNECTING' }));
  mock.rota('GET', /^\/api\/channels\/[^/]+\/instances\/[^/]+\/deletion-impact$/, ({ url }) => (
    url.pathname.includes('inst-posvenda') ? { chats: 4, messages: 312 } : { chats: 10, messages: 1874 }
  ));

  /**
   * QR Code de mentira: módulos pseudoaleatórios com semente fixa e os três quadrados de
   * posição. Parece um QR, mas não codifica nada.
   */
  function qrFicticio() {
    const n = 29;
    const px = 8;
    const borda = 4;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = (n + borda * 2) * px;
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#111827';
    let semente = 20261005;
    const sorteio = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
    const quadrado = (x, y) => {
      g.fillRect((borda + x) * px, (borda + y) * px, 7 * px, 7 * px);
      g.fillStyle = '#ffffff';
      g.fillRect((borda + x + 1) * px, (borda + y + 1) * px, 5 * px, 5 * px);
      g.fillStyle = '#111827';
      g.fillRect((borda + x + 2) * px, (borda + y + 2) * px, 3 * px, 3 * px);
    };
    const reservado = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if (!reservado(x, y) && sorteio() > 0.52) g.fillRect((borda + x) * px, (borda + y) * px, px, px);
      }
    }
    quadrado(0, 0);
    quadrado(n - 7, 0);
    quadrado(0, n - 7);
    return canvas.toDataURL('image/png');
  }
  mock.rota('POST', /^\/api\/channels\/[^/]+\/instances\/[^/]+\/connect$/, () => ({ qr: qrFicticio() }));

  // --- marcadores e respostas rápidas --------------------------------------------------
  // settings.ts › loadTags faz `tags = response.data`: o app espera a LISTA crua, como
  // o controller devolve (res.json(tags)). O formato de comum.js quebraria esta tela.
  const contagemDoMarcador = (id) => contatos.filter((c) => c.tag_ids.includes(id)).length;
  mock.rota('GET', '/api/contacts/tags', () => tags.map((t) => ({ ...t, contact_count: contagemDoMarcador(t.id) })));

  const categorias = [
    { id: 'qrc-atendimento', slug: 'atendimento', label: 'Atendimento', emoji: '💬', color: '#2196F3', position: 1, is_system: false },
    { id: 'qrc-precos', slug: 'precos', label: 'Preços', emoji: '💰', color: '#48BB78', position: 2, is_system: false },
    { id: 'qrc-entrega', slug: 'entrega', label: 'Entrega', emoji: '🚚', color: '#F6AD55', position: 3, is_system: false },
    { id: 'qrc-financeiro', slug: 'financeiro', label: 'Financeiro', emoji: '🧾', color: '#9F7AEA', position: 4, is_system: false },
    { id: 'qrc-avulso', slug: 'avulso', label: 'Avulso', emoji: '📌', color: '#8896A6', position: 99, is_system: true },
  ];
  const anexo = (id, type, name, size_label) => ({ id, type, name, size_label, url: `https://arquivos.exemplo.com.br/${name}`, metadata: {}, position: 0 });
  const respostas = [
    ['qr-boas-vindas', 'Boas-vindas', 'qrc-atendimento', 'Olá! Aqui é a Ana, da Representações Exemplo 😊 Como posso ajudar no seu pedido hoje?', []],
    ['qr-catalogo', 'Catálogo de produtos', 'qrc-atendimento', 'Te mandei o catálogo completo, com fotos e códigos. Qualquer dúvida é só chamar!', [anexo('att-cat', 'document', 'Catalogo_Outubro.pdf', '2.3 MB'), anexo('att-disp', 'image', 'Display_Novo.jpg', '380 KB')]],
    ['qr-tabela', 'Tabela de preços', 'qrc-precos', 'Segue a tabela de preços de outubro. Valores válidos até o fim do mês, pedido mínimo de R$ 800,00.', [anexo('att-tab', 'document', 'Tabela_Precos_Outubro.pdf', '471 KB')]],
    ['qr-atacado', 'Condição de atacado', 'qrc-precos', 'Acima de 50 caixas: 5% de desconto à vista no Pix ou boleto em 28/35/42 dias.', []],
    ['qr-prazo', 'Prazo de entrega', 'qrc-entrega', 'Capital e Grande SP: até 3 dias úteis depois do faturamento. Interior e litoral: de 5 a 7 dias úteis.', []],
    ['qr-confirmado', 'Pedido confirmado', 'qrc-entrega', 'Pedido confirmado! A nota fiscal sai em até 24 horas e te aviso assim que a transportadora coletar.', []],
    ['qr-pix', 'Dados para pagamento', 'qrc-financeiro', 'Chave Pix (e-mail): financeiro@exemplo.com.br\nFavorecido: Representações Exemplo Ltda.\nMe manda o comprovante por aqui que eu dou baixa no pedido.', []],
  ].map(([id, title, categoryId, content, attachments], position) => {
    const cat = categorias.find((c) => c.id === categoryId);
    return {
      id, title, content, position, attachments,
      category_id: cat.id, category_slug: cat.slug, category_label: cat.label, category_emoji: cat.emoji, category_color: cat.color,
    };
  });
  mock.rota('GET', '/api/quick-replies/categories', () => categorias);
  mock.rota('GET', '/api/quick-replies', () => respostas);

  // --- regras de atendimento -----------------------------------------------------------
  mock.rota('GET', '/api/attendance-rules', () => ({
    success: true,
    data: {
      settings: {
        account_id: 'acc-demo',
        require_close_reason: true,
        rating_stars_enabled: true,
        rating_numeric_enabled: false,
        rating_text_enabled: false,
        rating_text_levels: ['Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'],
        rating_request_message: 'Como foi o seu atendimento com a Representações Exemplo? Dê uma nota de 1 a 5:',
        rating_thanks_message: 'Obrigado pela avaliação! Ela ajuda a gente a atender cada vez melhor. 💙',
        notify_new_attendance: true,
        transfer_unanswered_to_queue: false,
        transfer_inactivity_minutes: 15,
        transfer_destination_queue_id: null,
        call_handling_action: 'reject',
        call_rejection_message: 'Olá! No momento não atendemos chamadas de voz ou vídeo. Por favor, deixe sua mensagem por escrito que responderemos em breve. 💙',
        birthday_auto_enabled: true,
        birthday_send_time: '09:00',
        birthday_recurring_yearly: true,
        birthday_message_sequence: [
          { id: 'bd-texto', type: 'text', text: 'Feliz aniversário, {{nome}}! 🎉 Toda a equipe da Representações Exemplo deseja um dia incrível.' },
          { id: 'bd-cartao', type: 'image', file_name: 'cartao-aniversario.png', file_url: 'https://arquivos.exemplo.com.br/cartao-aniversario.png', caption: 'Um presentinho nosso 🎁' },
        ],
        updated_at: dias(6),
      },
      reasons: [
        { id: 'rs-pedido', label: 'Pedido fechado', color: '#48BB78', position: 1, is_active: true, is_success: true },
        { id: 'rs-orcamento', label: 'Orçamento enviado', color: '#2196F3', position: 2, is_active: true, is_success: false },
        { id: 'rs-estoque', label: 'Sem estoque', color: '#F6AD55', position: 3, is_active: true, is_success: false },
        { id: 'rs-desistiu', label: 'Cliente desistiu', color: '#F56565', position: 4, is_active: true, is_success: false },
      ],
    },
  }));
  const isentos = [{ contact_id: 'ct-07', name: 'Carlos Mendes', phone_number: contato('ct-07').phone_number }];
  mock.rota('GET', '/api/attendance-rules/rating-exclusions', () => ({ success: true, data: isentos }));
  // Busca de contato (settings.ts lê a lista crua em response.data).
  mock.rota('GET', '/api/contacts/search', ({ busca }) => {
    const termo = String(busca.get('q') || '').toLowerCase();
    return contatos
      .filter((c) => c.name.toLowerCase().includes(termo) || c.phone_number.includes(termo))
      .slice(0, 20)
      .map((c) => ({ id: c.id, name: c.name, phone_number: c.phone_number, email: c.email }));
  });
  const naoRecebem = new Set(['ct-11', 'ct-19']);
  mock.rota('GET', '/api/contacts/birthdays', () => ({
    contacts: contatos.filter((c) => c.birthday).map((c) => ({
      id: c.id, name: c.name, phone_number: c.phone_number, email: c.email, birth_date: c.birthday,
      birthday_auto_enabled: !naoRecebem.has(c.id), profile_picture_url: null,
    })),
  }));

  // --- expediente (GET /api/schedule-settings › { settings, timezones }) ---------------
  const dia = (enabled, start, end, comAlmoco) => ({ enabled, start, end, break_enabled: comAlmoco, break_start: '12:00', break_end: '13:00' });
  const fusos = [
    ['America/Sao_Paulo', 'Brasília (UTC-3)', ['brasil', 'brasilia', 'brasília', 'df', 'distrito federal']],
    ['America/Sao_Paulo', 'São Paulo (UTC-3)', ['brasil', 'sao paulo', 'são paulo', 'sp']],
    ['America/Sao_Paulo', 'Rio de Janeiro (UTC-3)', ['brasil', 'rio', 'rio de janeiro', 'rj']],
    ['America/Sao_Paulo', 'Curitiba (UTC-3)', ['brasil', 'curitiba', 'parana', 'paraná', 'pr']],
    ['America/Sao_Paulo', 'Florianópolis (UTC-3)', ['brasil', 'florianopolis', 'florianópolis', 'santa catarina', 'sc']],
    ['America/Sao_Paulo', 'Porto Alegre (UTC-3)', ['brasil', 'porto alegre', 'rio grande do sul', 'rs']],
    ['America/Sao_Paulo', 'Belo Horizonte (UTC-3)', ['brasil', 'belo horizonte', 'minas gerais', 'mg']],
    ['America/Sao_Paulo', 'Goiânia (UTC-3)', ['brasil', 'goiania', 'goiânia', 'goias', 'goiás', 'go']],
    ['America/Sao_Paulo', 'Vitória (UTC-3)', ['brasil', 'vitoria', 'vitória', 'espirito santo', 'espírito santo', 'es']],
    ['America/Recife', 'Recife (UTC-3)', ['brasil', 'pernambuco', 'pe', 'nordeste']],
    ['America/Fortaleza', 'Fortaleza (UTC-3)', ['brasil', 'ceara', 'ceará', 'ce', 'nordeste']],
    ['America/Bahia', 'Salvador, Bahia (UTC-3)', ['brasil', 'salvador', 'bahia', 'ba', 'nordeste']],
    ['America/Maceio', 'Maceió (UTC-3)', ['brasil', 'maceio', 'maceió', 'alagoas', 'al', 'nordeste']],
    ['America/Belem', 'Belém (UTC-3)', ['brasil', 'belem', 'belém', 'para', 'pará', 'pa', 'norte']],
    ['America/Manaus', 'Manaus (UTC-4)', ['brasil', 'amazonas', 'am', 'norte']],
    ['America/Campo_Grande', 'Campo Grande (UTC-4)', ['brasil', 'mato grosso do sul', 'ms', 'centro oeste']],
    ['America/Cuiaba', 'Cuiabá (UTC-4)', ['brasil', 'cuiaba', 'cuiabá', 'mato grosso', 'mt', 'centro oeste']],
    ['America/Rio_Branco', 'Rio Branco, Acre (UTC-5)', ['brasil', 'acre', 'ac']],
    ['America/Noronha', 'Fernando de Noronha (UTC-2)', ['brasil', 'noronha', 'fernando de noronha', 'pe']],
    ['Europe/Lisbon', 'Lisboa (UTC+0)', ['portugal', 'lisbon']],
  ].map(([value, label, keywords]) => ({ value, label, keywords }));
  mock.rota('GET', '/api/schedule-settings', () => ({
    success: true,
    data: {
      settings: {
        account_id: 'acc-demo',
        timezone: 'America/Sao_Paulo',
        schedule_enforced: true,
        company_schedule_enabled: true,
        company_week_schedule: {
          monday: dia(true, '08:00', '18:00', true),
          tuesday: dia(true, '08:00', '18:00', true),
          wednesday: dia(true, '08:00', '18:00', true),
          thursday: dia(true, '08:00', '18:00', true),
          friday: dia(true, '08:00', '18:00', true),
          saturday: dia(true, '08:00', '12:00', false),
          sunday: dia(false, '08:00', '12:00', false),
        },
        company_absence_sequence: [{
          id: 'aus-texto',
          type: 'text',
          text: 'Olá, {{primeiro_nome}}! Nosso horário é de segunda a sexta, das 8h às 18h, e sábado, das 8h às 12h. Assim que voltarmos, respondemos sua mensagem. 😊',
          variations: [],
        }],
        user_schedules: [],
        updated_at: dias(14),
      },
      timezones: fusos,
    },
  }));

  // --- favoritos e bloqueados ----------------------------------------------------------
  mock.rota('GET', '/api/chats', ({ busca }) => {
    if (busca.get('listFilter') !== 'favorites') return undefined; // demais abas: rota de comum.js
    const lista = conversas.filter((c) => c.is_favorite);
    return { success: true, chats: lista, total: lista.length };
  });
  mock.rota('GET', '/api/blocked-contacts', () => {
    const lista = [
      { id: 'blk-1', contact_id: null, chat_id: null, channel: 'whatsapp', normalized_identity: '5511990000188', phone_number: '5511990000188', display_name: 'Ofertas Telemarketing', avatar_url: null, reason: 'spam', blocked_at: dias(15) },
      { id: 'blk-2', contact_id: null, chat_id: null, channel: 'whatsapp', normalized_identity: '5511990000189', phone_number: '5511990000189', display_name: null, avatar_url: null, reason: null, blocked_at: dias(41) },
    ];
    return { blocked_contacts: lista, total: lista.length };
  });

  // --- follow-up -----------------------------------------------------------------------
  const tagDe = (id) => { const t = tags.find((x) => x.id === id); return { id: t.id, name: t.name, color: t.color }; };
  const mensagem = (position, content) => ({
    id: `fum-${position}-${content.length}`, type: 'text', content, caption: null, media_url: null, media_name: null,
    media_mime: null, media_size_label: null, quick_reply_id: null, quick_reply_snapshot: null, metadata: {}, position, enabled: true,
  });
  const colunaPosVenda = colunas.find((c) => c.id === 'col-posvenda');
  const manuais = ['ct-04', 'ct-10', 'ct-22'].map((id) => { const c = contato(id); return { id: c.id, name: c.name, phone_number: c.phone_number, email: c.email }; });
  const regraBase = {
    inactivity_unit: 'days', attempt_interval_unit: 'days', fallback_queue_id: null, fallback_user_id: null,
    kanban_column_id: null, kanban_column: null, csv_mapping: {}, tags: [], tag_ids: [], categories: [], category_ids: [],
    contacts: [], contact_ids: [], csv_contacts: [],
  };
  const regras = [
    {
      ...regraBase, id: 'fu-orcamento', name: 'Orçamento sem resposta', enabled: true, audience_type: 'tag',
      inactivity_days: 2, inactivity_amount: 2, max_attempts: 3, attempt_interval_days: 2,
      random_min_seconds: 60, random_max_seconds: 180, recurring: false, repeat_while_inactive: true,
      tags: [tagDe('tag-orcamento')], tag_ids: ['tag-orcamento'],
      messages: [
        mensagem(1, 'Oi, {{primeiro_nome}}! Conseguiu dar uma olhada no orçamento que te mandei? Se quiser, ajusto as quantidades.'),
        mensagem(2, '{{primeiro_nome}}, o preço do orçamento vale até sexta. Posso reservar a mercadoria para você?'),
      ],
      message_count: 2, audience_count: 5,
    },
    {
      ...regraBase, id: 'fu-reativacao', name: 'Reativação 30 dias', enabled: false, audience_type: 'kanban',
      inactivity_days: 30, inactivity_amount: 30, max_attempts: 2, attempt_interval_days: 7,
      random_min_seconds: 120, random_max_seconds: 300, recurring: true, repeat_while_inactive: true,
      kanban_column_id: colunaPosVenda.id, kanban_column: { ...colunaPosVenda, card_count: 3 },
      messages: [mensagem(1, 'Olá, {{primeiro_nome}}! Faz um tempinho que não conversamos. Chegaram novidades no catálogo, quer que eu te mande?')],
      message_count: 1, audience_count: 3,
    },
    {
      ...regraBase, id: 'fu-semanal', name: 'Lembrete do pedido semanal', enabled: true, audience_type: 'manual',
      inactivity_days: 7, inactivity_amount: 7, max_attempts: 1, attempt_interval_days: 1,
      random_min_seconds: 60, random_max_seconds: 120, recurring: true, repeat_while_inactive: false,
      contacts: manuais, contact_ids: manuais.map((c) => c.id),
      messages: [mensagem(1, 'Bom dia! Já posso lançar o pedido desta semana com as mesmas quantidades da anterior?')],
      message_count: 1, audience_count: 3,
    },
  ];
  mock.rota('GET', '/api/follow-up/rules', () => ({ rules: regras }));
  mock.rota('GET', /^\/api\/follow-up\/rules\/([^/]+)$/, ({ params: [id] }) => ({ rule: regras.find((r) => r.id === id) }));
  mock.rota('GET', '/api/follow-up/options', () => ({
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
    categories: [
      { id: 'cat-mercados', name: 'Mercados', contact_count: 8 },
      { id: 'cat-padarias', name: 'Padarias', contact_count: 3 },
      { id: 'cat-distribuidores', name: 'Distribuidores', contact_count: 4 },
    ],
    queues: filas.map((f) => ({ id: f.id, name: f.name, color: f.color, kind: f.kind, instance_id: null })),
    users: usuariosDaFila,
    quick_replies: respostas,
    contacts: contatos.slice(0, 8).map((c) => ({ id: c.id, name: c.name, phone_number: c.phone_number, email: c.email })),
    kanban_columns: colunas.map((c, i) => ({ ...c, card_count: [4, 4, 3, 3][i] })),
  }));

  // --- agentes de IA (GET /api/ai-agents › { agents }; /:id devolve o agente) ---------
  const representadas = [
    {
      id: 'rep-serra', name: 'Doces Serra Azul', factory_location: 'Fábrica em Jundiaí/SP. Faturamento pela matriz, em Jundiaí.',
      site_url: 'https://doces.exemplo.com.br', billing: 'Pedido mínimo de R$ 800,00. Nota emitida em até 24 horas.',
      payment_terms: '28/35/42 dias no boleto ou 5% de desconto à vista no Pix.', damage_returns: 'Avaria comunicada em até 48 horas, com foto da caixa e da nota.',
      support_contact: 'sac@doces.exemplo.com.br', collections_credit: 'Primeiro pedido à vista. Depois, limite liberado pelo financeiro da fábrica.',
      delivery_delays: 'Atraso acima de 5 dias úteis: avisar a Ana para acionar a transportadora.', taxes_charges: 'Preços com ICMS incluso para SP.',
    },
    {
      id: 'rep-vale', name: 'Biscoitos Vale Verde', factory_location: 'Fábrica em Piracicaba/SP.', site_url: 'https://biscoitos.exemplo.com.br',
      billing: 'Faturamento semanal, às quartas.', payment_terms: '30/60 dias no boleto.', damage_returns: '', support_contact: 'atendimento@biscoitos.exemplo.com.br',
      collections_credit: '', delivery_delays: '', taxes_charges: '',
    },
  ];
  const agentes = [
    {
      id: 'ag-vendas', name: 'Assistente de Vendas', agent_type: 'vendas', status: 'active',
      profile: {
        objective: 'Responder dúvidas de preço, prazo e estoque e deixar o pedido pronto para a equipe confirmar.',
        personality: 'Cordial, objetiva e consultiva. Chama o cliente pelo nome e não insiste.',
        guardrails: 'Nunca prometer desconto acima de 5% nem prazo fora da tabela. Não confirmar pedido: quem confirma é a equipe.',
      },
      company_profile: { company_name: 'Representações Exemplo', segment: 'Representação comercial de alimentos', represented_companies: representadas },
      contact_questions: [],
      training: 'Atendemos mercados, padarias e distribuidores no estado de São Paulo. Sempre pergunte a cidade do cliente antes de informar o prazo de entrega. Pedidos acima de 50 caixas têm 5% de desconto à vista.',
      products: [
        { id: 'prd-achoc', name: 'Achocolatado em pó 400 g', description: 'Caixa com 24 unidades', price: 'R$ 8,90 a unidade', link: '', notes: '', company_scope: 'represented', represented_company_id: 'rep-serra', represented_company_name: 'Doces Serra Azul' },
        { id: 'prd-bisc', name: 'Biscoito sortido 300 g', description: 'Caixa com 30 unidades', price: 'R$ 5,40 a unidade', link: '', notes: 'Reajuste de 4% em outubro', company_scope: 'represented', represented_company_id: 'rep-vale', represented_company_name: 'Biscoitos Vale Verde' },
      ],
      price_tables: [
        { id: 'pt-vale-out', represented_company_id: 'rep-vale', represented_company_name: 'Biscoitos Vale Verde', label: 'Tabela de outubro', content: 'Biscoito sortido 300 g — R$ 5,40\nBiscoito de polvilho 100 g — R$ 3,10\nRosquinha de coco 350 g — R$ 6,20' },
      ],
      settings: {
        model: 'gpt-5.6-terra', temperature: 0.7, instance_ids: [], channels: ['whatsapp'],
        queue_rules: [{ queue_id: 'fila-vendas', activation_mode: 'all', activation_keywords: [] }],
        handoff_to_human: true,
        handoff_instructions: 'Quando o cliente pedir para falar com a Ana, quiser negociar condição especial ou disser que vai fechar o pedido.',
        fallback_message: 'Não tenho essa informação agora, mas já chamo alguém da equipe para te ajudar.',
        activation_schedule: { enabled: false, timezone: 'America/Sao_Paulo', days: {} },
      },
      updated_at: dias(2),
    },
    {
      id: 'ag-posvenda', name: 'Suporte Pós-venda', agent_type: 'suporte', status: 'paused',
      profile: { objective: 'Acompanhar entregas, mandar segunda via de boleto e orientar trocas.', personality: 'Paciente e clara.', guardrails: 'Não autorizar troca nem abatimento sem a equipe.' },
      company_profile: { company_name: 'Representações Exemplo', segment: 'Representação comercial de alimentos', represented_companies: [] },
      contact_questions: [], training: '', products: [], price_tables: [],
      settings: {
        model: 'gpt-5.6-luna', temperature: 0.7, instance_ids: [], channels: ['whatsapp'],
        queue_rules: [{ queue_id: 'fila-geral', activation_mode: 'keywords', activation_keywords: ['boleto', 'entrega', 'troca'] }],
        handoff_to_human: true, handoff_instructions: '', fallback_message: '',
        activation_schedule: { enabled: false, timezone: 'America/Sao_Paulo', days: {} },
      },
      updated_at: dias(9),
    },
  ];
  mock.rota('GET', '/api/ai-agents', () => ({ agents: agentes }));
  mock.rota('GET', /^\/api\/ai-agents\/(ag-[^/]+)$/, ({ params: [id] }) => agentes.find((a) => a.id === id));
  mock.rota('GET', '/api/ai-agents/openai-key', () => ({ has_openai_api_key: true, validated_at: dias(20) }));

  // --- automações (GET /api/workflows › { workflows }) ---------------------------------
  const nos = (n) => Array.from({ length: n }, (_, i) => ({ id: `n${i + 1}` }));
  mock.rota('GET', '/api/workflows', () => ({
    workflows: [
      { id: 'wf-pedido', name: 'Pedido por palavra-chave', description: 'Quem escreve "pedido" ou "orçamento" recebe o catálogo e vai para Em negociação', status: 'active', trigger_config: { type: 'keyword', keywords: ['pedido', 'orçamento'] }, nodes: nos(7), edges: [], channels: ['whatsapp'], created_at: dias(60), updated_at: min(90) },
      { id: 'wf-fora', name: 'Boas-vindas fora do horário', description: 'Responde quem chama fora do expediente e cria uma tarefa para a equipe', status: 'active', trigger_config: { type: 'any' }, nodes: nos(5), edges: [], channels: ['whatsapp'], created_at: dias(120), updated_at: dias(3) },
      { id: 'wf-entrega', name: 'Pesquisa pós-entrega', description: 'Pergunta se a mercadoria chegou bem, dois dias depois do faturamento', status: 'paused', trigger_config: { type: 'keyword', keywords: ['entregue'] }, nodes: nos(4), edges: [], channels: ['whatsapp'], created_at: dias(90), updated_at: dias(12) },
      { id: 'wf-reativar', name: 'Reativação de clientes', description: 'Rascunho: oferta para quem não compra há 60 dias', status: 'draft', trigger_config: { type: 'any' }, nodes: nos(2), edges: [], channels: ['whatsapp'], created_at: dias(1), updated_at: dias(1) },
    ],
  }));

  // =====================================================================================
  // Moldes: estados que o app só desenha ao clicar (modais, diálogos, painéis de canal).
  // Chamado pela captura com "js:__capturarMoldes()". Cada estado vira um
  // <template id="molde-..."> no fim do <body>, que o bloco MOCKUP clona.
  // =====================================================================================
  const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const $ = (sel) => document.querySelector(sel);

  async function clicar(sel, ms = 600) {
    const el = $(sel);
    if (!el) throw new Error(`molde: não achei ${sel}`);
    el.click();
    await esperar(ms);
  }

  /**
   * O que o app põe em campo por JS (input.value, textarea.value, select.value, checked)
   * não aparece no outerHTML. Copia para os atributos, senão a captura sai com os
   * campos vazios.
   */
  function congelarValores(raiz) {
    raiz.querySelectorAll('input').forEach((el) => {
      if (el.type === 'file') return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.toggleAttribute('checked', el.checked);
        return;
      }
      if (el.value !== (el.getAttribute('value') ?? '')) el.setAttribute('value', el.value);
    });
    raiz.querySelectorAll('textarea').forEach((el) => {
      if (el.value !== el.textContent) el.textContent = el.value;
    });
    raiz.querySelectorAll('select').forEach((el) => {
      [...el.options].forEach((op, i) => op.toggleAttribute('selected', i === el.selectedIndex));
    });
  }

  const guardados = [];
  function guardar(nome, el, { interno = false } = {}) {
    if (!el) throw new Error(`molde: nada para guardar em ${nome}`);
    congelarValores(el);
    const molde = document.createElement('template');
    molde.id = `molde-${nome}`;
    molde.innerHTML = interno ? el.innerHTML : el.outerHTML;
    document.body.appendChild(molde);
    guardados.push(nome);
  }

  /** Diálogo criado na hora pelo app (div fixa no <body>, removida ao fechar). */
  const dialogo = (marca) => $(marca)?.closest('body > div');

  window.__capturarMoldes = async function () {
    // Abas carregadas só ao abrir.
    await clicar('[data-tab="follow-up"]', 900);
    await clicar('[data-tab="schedule"]', 900);

    // --- Usuários & Acesso: fila nova (paleta e lista de membros) e permissões da função.
    await clicar('#as-add-queue-btn', 700);
    await clicar('#as-queue-modal [data-action="close-queue"]', 300);
    await clicar('[data-action="edit-role"][data-id="role-externo"]', 700);
    await clicar('#as-role-modal [data-action="close-role"]', 300);

    // --- Integrações: o painel de cada canal e o modal de criação de e-mail e Telegram.
    await clicar('[data-tab="integrations"]', 300);
    for (const canal of ['whatsapp_meta', 'instagram', 'messenger', 'email', 'telegram']) {
      await clicar(`.settings-channel-btn[data-channel="${canal}"]`, 700);
      guardar(`canal-${canal}`, $('#integrations-channel-panel'), { interno: true });
      if (canal === 'email' || canal === 'telegram') guardar(`instancia-${canal}`, $('#instance-modal'), { interno: true });
    }
    await clicar('.settings-channel-btn[data-channel="whatsapp"]', 1000);

    // QR Code: o modal fica no <body> depois de fechado.
    await clicar('[data-action="connect-instance"][data-id="inst-comercial"]', 800);
    await clicar('#settings-qr-modal [data-close-qr]', 300);

    // Diálogos do app (renomear, confirmar, excluir, desconectar).
    await clicar('[data-action="rename-instance"][data-id="inst-comercial"]', 300);
    guardar('dialogo-texto', dialogo('[data-pd-input]'));
    await clicar('[data-pd-cancel]', 200);
    await clicar('[data-action="restart-instance"][data-id="inst-comercial"]', 300);
    guardar('dialogo-confirmar', dialogo('[data-cd-confirm]'));
    await clicar('[data-cd-cancel]', 200);
    await clicar('[data-action="delete-instance"][data-id="inst-posvenda"]', 500);
    guardar('dialogo-excluir', dialogo('[data-cd-confirm]'));
    await clicar('[data-cd-cancel]', 200);
    await clicar('[data-action="logout-instance"][data-id="inst-comercial"]', 300);
    guardar('dialogo-desconectar', dialogo('[data-di-logout]'));
    await clicar('[data-di-cancel]', 200);

    // --- Agentes: modal de edição preenchido. Ao fechar, o app volta ao "Novo Agente IA".
    await clicar('[data-ai-action="edit"][data-id="ag-vendas"]', 1000);
    guardar('agente-editar', $('#ai-agent-modal .settings-modal-card'), { interno: true });
    await clicar('#ai-agent-modal [data-ai-agent-modal-close]', 300);

    // --- Follow-up: a edição de cada regra (público diferente em cada uma) e o "novo"
    // (uma variação de texto vazia).
    for (const id of ['fu-orcamento', 'fu-reativacao', 'fu-semanal']) {
      await clicar(`[data-followup-action="edit"][data-id="${id}"]`, 900);
      guardar(`followup-editar-${id}`, $('#followup-create-modal .settings-modal-card'), { interno: true });
      await clicar('#followup-create-modal [data-modal-close]', 400);
    }
    await clicar('#followup-new-rule', 600);
    guardar('followup-novo', $('#followup-create-modal .settings-modal-card'), { interno: true });
    await clicar('#followup-create-modal [data-modal-close]', 400);

    // --- Regras: resultado da busca de contato isento e a lista de respostas rápidas.
    const busca = $('#rules-rating-exclusion-search');
    busca.value = 'ma';
    busca.dispatchEvent(new Event('input', { bubbles: true }));
    await esperar(800);
    guardar('isencao-resultados', $('#rules-rating-exclusion-results'), { interno: true });
    busca.value = '';
    busca.dispatchEvent(new Event('input', { bubbles: true }));
    await esperar(200);
    await clicar('#rules-birthday-add-quick', 700);
    $('#rules-birthday-quick-panel').style.display = 'none';

    // --- Expediente: painel da empresa (fica desenhado) e o de um usuário.
    await clicar('#schedule-company-edit-btn', 400);
    await clicar('#schedule-company-edit-btn', 300);
    await clicar('[data-schedule-toggle-user="usr-carla"]', 400);
    guardar('expediente-usuario', $('.settings-user-schedule-inline-panel'));
    await clicar('[data-schedule-toggle-user="usr-carla"]', 300);

    // --- Planos: o checkout é montado na primeira abertura e fica no <body>.
    await clicar('.settings-plan-action[data-plan="grande"]', 900);
    await clicar('#close-checkout-modal', 300);

    // Estado final: primeira aba, valores dos campos gravados nos atributos.
    await clicar('[data-tab="general"]', 400);
    congelarValores(document);
    return guardados;
  };
})();
