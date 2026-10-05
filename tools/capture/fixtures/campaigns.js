/*
 * Rotas só da tela de Campanhas (campaigns.html): disparos em massa de uma representação
 * comercial, com as instâncias "Comercial" e "Pós-venda" e o público dos contatos,
 * marcadores, categorias e etapas do Kanban de comum.js.
 *
 * Formatos lidos de src/public/js/campaigns.ts, campaign-media-builder.ts e do backend
 * (campaign.controller / campaign.model):
 *   GET /api/campaigns                  Campaign[] (mais nova primeiro)
 *   GET /api/campaigns/:id              { campaign, stats: { total, sent, failed, pending }, logs }
 *   GET /api/campaigns/instances        { success, data: [{ id, name, status }] }
 *   GET /api/campaigns/data/tags        [{ id, name, color, contact_count }]
 *   GET /api/campaigns/data/contacts    { contacts: [{ id, name, phone_number }], pagination }
 *   GET /api/campaigns/data/categories  { categories: [{ id, name, contact_count }] }
 *   GET /api/campaigns/data/kanban-columns  { columns: [{ id, name, color, position, contact_count }] }
 *   GET /api/campaigns/categories/:id/contacts  { contacts: [{ ..., in_category }] }
 *   GET /api/chats/transfer-options     { success, data: { queues, users } }
 *   GET /api/quick-replies(/categories)
 */
(function () {
  const mock = window.__mock;
  const { min, dias } = mock;
  const { contatos, tags, instancias, filas, usuarios, colunas, cards, conversas } = mock.dados;
  const [comercial, posvenda] = instancias;

  const porNome = (a, b) => a.name.localeCompare(b.name, 'pt-BR');
  /** Data `d` dias atrás (negativo = no futuro) às hh:mm, no fuso do navegador. */
  function diaAs(d, hh, mm = 0) {
    const data = new Date(mock.agora - d * 86_400_000);
    data.setHours(hh, mm, 0, 0);
    return data.toISOString();
  }

  // --- categorias de campanha (contatos pré-selecionados) ------------------------------
  const categorias = [
    { id: 'cat-campinas', name: 'Região de Campinas', contatos: ['ct-03', 'ct-13', 'ct-19', 'ct-22'] },
    { id: 'cat-padarias', name: 'Padarias e mercearias', contatos: ['ct-01', 'ct-08', 'ct-12', 'ct-16', 'ct-20', 'ct-24'] },
    { id: 'cat-leads', name: 'Leads da feira', contatos: ['ct-05', 'ct-09', 'ct-15', 'ct-18'] },
    { id: 'cat-supermercados', name: 'Supermercados e atacarejos', contatos: ['ct-02', 'ct-04', 'ct-10', 'ct-14', 'ct-22'] },
  ];
  mock.dados.categoriasCampanha = categorias;

  // --- conteúdo (pool aleatório de mensagens) ------------------------------------------
  let seqMidia = 0;
  function item(tipo, extra) {
    seqMidia += 1;
    return Object.assign({ id: `media_${seqMidia}`, type: tipo, order: seqMidia, upload_status: 'completed', created_at: dias(30) }, extra);
  }
  const texto = (conteudo) => item('text', { content: conteudo });
  const arquivo = (tipo, nome, tamanho, legenda) => item(tipo, {
    file_name: nome, file_size: tamanho, caption: legenda || '',
    s3_url: `https://arquivos.exemplo.com.br/campanhas/${nome}`, s3_key: `campanhas/${nome}`,
  });

  // --- campanhas ------------------------------------------------------------------------
  const base = {
    account_id: 'acc-demo', description: null, delay_seconds: 10, completed_at: null, started_at: null, scheduled_at: null,
    confirmation_accepted: true, message_template: '',
  };
  const campanhas = [
    {
      id: 'cmp-1', name: 'Tabela de preços — Novembro', status: 'scheduled',
      scheduled_at: diaAs(-2, 8), created_at: min(95),
      total_contacts: 9, sent_count: 0, failed_count: 0,
      source_type: 'tags', source_config: { tags: ['tag-cliente'] }, instance_ids: [comercial.id],
      media_sequence: [
        texto('Bom dia, {{primeiro_nome}}! A tabela de novembro já está valendo. Segue em anexo 👇'),
        arquivo('document', 'Tabela_Precos_Novembro.pdf', 512_400),
      ],
    },
    {
      id: 'cmp-2', name: 'Promoção do mês — Biscoitos 10% off', status: 'running',
      started_at: min(38), created_at: min(40),
      total_contacts: 24, sent_count: 9, failed_count: 0,
      source_type: 'contacts', source_config: {}, instance_ids: [comercial.id, posvenda.id],
      media_sequence: [
        arquivo('image', 'Promo_Biscoitos_Outubro.jpg', 248_000, 'Linha de biscoitos com 10% off até o fim do mês 🍪'),
        texto('{{primeiro_nome}}, a linha de biscoitos está com 10% de desconto até o fim do mês. Quer que eu separe seu pedido?'),
        texto('Oi {{primeiro_nome}}! Promoção relâmpago: biscoitos com 10% off nos pedidos acima de 10 caixas. Posso reservar?'),
      ],
    },
    {
      id: 'cmp-3', name: 'Reativação de clientes inativos (cópia)', status: 'draft',
      created_at: dias(2), total_contacts: 6, sent_count: 0, failed_count: 0,
      source_type: 'manual', source_config: { contact_ids: ['ct-07', 'ct-11', 'ct-12', 'ct-15', 'ct-16', 'ct-19'] }, instance_ids: [posvenda.id],
      media_sequence: [texto('Olá {{primeiro_nome}}, sentimos sua falta! Preparei condições especiais para o seu próximo pedido. Posso te mandar?')],
    },
    {
      id: 'cmp-4', name: 'Lançamento catálogo Outubro', status: 'completed',
      started_at: diaAs(5, 9, 30), completed_at: diaAs(5, 10, 42), created_at: diaAs(5, 9, 20),
      total_contacts: 11, sent_count: 10, failed_count: 1,
      source_type: 'categories', source_config: { categories: ['cat-padarias', 'cat-supermercados'], categories_match: 'any' }, instance_ids: [comercial.id, posvenda.id],
      media_sequence: [
        texto('{{primeiro_nome}}, chegou o catálogo de outubro com 18 lançamentos! Dá uma olhada:'),
        arquivo('document', 'Catalogo_Outubro.pdf', 2_411_000),
        arquivo('image', 'Lancamentos_Outubro.jpg', 312_000, 'Novidades de outubro'),
      ],
    },
    {
      id: 'cmp-5', name: 'Reativação de clientes inativos', status: 'completed',
      started_at: diaAs(9, 10), completed_at: diaAs(9, 10, 38), created_at: diaAs(9, 9, 45),
      total_contacts: 6, sent_count: 6, failed_count: 0,
      source_type: 'manual', source_config: { contact_ids: ['ct-07', 'ct-11', 'ct-12', 'ct-15', 'ct-16', 'ct-19'] }, instance_ids: [posvenda.id],
      media_sequence: [
        texto('Olá {{primeiro_nome}}, sentimos sua falta! Preparei condições especiais para o seu próximo pedido. Posso te mandar?'),
        texto('{{primeiro_nome}}, faz tempo que não conversamos. Temos produtos novos e prazo estendido para quem volta a comprar.'),
      ],
    },
    {
      id: 'cmp-6', name: 'Convite: feira de panificação', status: 'cancelled',
      started_at: diaAs(12, 14), created_at: diaAs(12, 13, 50),
      total_contacts: 6, sent_count: 2, failed_count: 0,
      source_type: 'categories', source_config: { categories: ['cat-padarias'], categories_match: 'any' }, instance_ids: [comercial.id],
      media_sequence: [
        arquivo('image', 'Convite_Feira_Panificacao.png', 410_000, 'Te esperamos no nosso estande!'),
        texto('{{primeiro_nome}}, vamos estar na feira de panificação. Passa no nosso estande para conhecer os lançamentos!'),
      ],
    },
    {
      id: 'cmp-7', name: 'Boas-vindas a novos clientes', status: 'completed',
      started_at: diaAs(20, 11), completed_at: diaAs(20, 11, 9), created_at: diaAs(20, 10, 55),
      total_contacts: 4, sent_count: 4, failed_count: 0,
      source_type: 'kanban', source_config: { column_id: 'col-novo' }, instance_ids: [comercial.id],
      media_sequence: [texto('Seja bem-vindo(a), {{primeiro_nome}}! Sou a Ana, sua representante. Pode contar comigo para pedidos e dúvidas.')],
    },
  ].map((c) => Object.assign({}, base, c, { updated_at: c.completed_at || c.started_at || c.created_at }));
  mock.dados.campanhas = campanhas;

  mock.rota('GET', '/api/campaigns', () => campanhas);
  mock.rota('GET', /^\/api\/campaigns\/(cmp-[^/]+)$/, ({ params: [id] }) => {
    const c = campanhas.find((x) => x.id === id);
    if (!c) return mock.json({ error: 'Campanha não encontrada' }, 404);
    const pendentes = ['completed', 'cancelled'].includes(c.status) ? 0 : c.total_contacts - c.sent_count - c.failed_count;
    return { campaign: c, stats: { total: c.total_contacts, sent: c.sent_count, failed: c.failed_count, pending: pendentes }, logs: [] };
  });

  // --- dados do modal "Nova Campanha" -------------------------------------------------------
  mock.rota('GET', '/api/campaigns/instances', () => ({
    success: true,
    data: instancias.map((i) => ({ id: i.id, name: i.label, status: 'CONNECTED' })),
    message: `${instancias.length} instância(s) disponível(eis) para campanhas`,
  }));
  mock.rota('GET', '/api/campaigns/data/tags', () => tags.map((t) => ({
    id: t.id, name: t.name, color: t.color, contact_count: contatos.filter((c) => c.tag_ids.includes(t.id)).length,
  })).sort(porNome));
  mock.rota('GET', '/api/campaigns/data/contacts', () => {
    const lista = contatos.map((c) => ({ id: c.id, name: c.name, phone_number: c.phone_number, profile_picture_url: null })).sort(porNome);
    return { contacts: lista, pagination: { page: 1, limit: 10000, total: lista.length } };
  });
  mock.rota('GET', '/api/campaigns/data/categories', () => ({
    categories: categorias.map((c) => ({ id: c.id, name: c.name, contact_count: c.contatos.length })).sort(porNome),
  }));
  mock.rota('GET', '/api/campaigns/data/kanban-columns', ({ busca }) => {
    const usuario = busca.get('user_id');
    return {
      columns: colunas.map((col) => ({
        id: col.id, name: col.name, color: col.color, position: col.position,
        contact_count: cards.filter((card) => card.column_id === col.id
          && (!usuario || conversas.find((c) => c.id === card.chat_id)?.assigned_user_id === usuario)).length,
      })),
    };
  });
  mock.rota('GET', /^\/api\/campaigns\/categories\/([^/]+)\/contacts$/, ({ params: [id] }) => {
    const cat = categorias.find((c) => c.id === id);
    return {
      contacts: contatos.map((c) => ({
        id: c.id, name: c.name, phone_number: c.phone_number, email: c.email, profile_picture_url: null,
        in_category: Boolean(cat && cat.contatos.includes(c.id)),
      })).sort(porNome),
    };
  });
  mock.rota('GET', '/api/chats/transfer-options', () => ({
    success: true,
    data: {
      queues: filas.map((f) => ({ id: f.id, name: f.name, color: f.color, kind: f.kind, instance_id: null, instance_name: null, instance_label: null })),
      users: usuarios.map((u) => ({ user_id: u.user_id, name: u.name, email: u.email, role: u.role })),
    },
  }));
  mock.rota('GET', '/api/billing/entitlements', () => ({
    plan: 'office', plan_name: 'Médio',
    features: { automations: true, multimedia_campaigns: true, api: false, webhooks: false },
  }));

  // --- respostas rápidas (botão "Respostas Rápidas" do conteúdo) ----------------------------
  const categoriasRespostas = [
    { id: 'qr-vendas', name: 'Vendas', emoji: '💰' },
    { id: 'qr-posvenda', name: 'Pós-venda', emoji: '📦' },
  ];
  const resposta = (id, titulo, conteudo, cat, anexos = []) => {
    const c = categoriasRespostas.find((x) => x.id === cat);
    return { id, title: titulo, content: conteudo, category_id: c.id, category_label: c.name, category_emoji: c.emoji, attachments: anexos };
  };
  const respostas = [
    resposta('qr-1', 'Tabela de preços', 'Olá {{primeiro_nome}}! Segue a tabela de preços atualizada. Qualquer dúvida, estou à disposição.', 'qr-vendas', [
      { type: 'document', url: 'https://arquivos.exemplo.com.br/respostas/Tabela_Precos_Outubro.pdf', name: 'Tabela_Precos_Outubro.pdf', metadata: { size: 482_133, mime_type: 'application/pdf' } },
    ]),
    resposta('qr-2', 'Prazo de entrega', 'Para a capital o prazo é de 2 dias úteis; para o interior, de 3 a 5 dias úteis após o faturamento.', 'qr-vendas'),
    resposta('qr-3', 'Pedido mínimo', 'O pedido mínimo é de R$ 800,00 ou 10 caixas, o que for atingido primeiro.', 'qr-vendas'),
    resposta('qr-4', 'Boleto enviado', '{{primeiro_nome}}, o boleto do seu pedido já foi enviado por e-mail. Vencimento em 28 dias.', 'qr-posvenda'),
    resposta('qr-5', 'Pesquisa de satisfação', 'Como foi sua experiência com o último pedido? Responda de 1 a 5 😊', 'qr-posvenda'),
  ];
  mock.rota('GET', '/api/quick-replies/categories', () => categoriasRespostas);
  mock.rota('GET', '/api/quick-replies', () => respostas);
  // --- só para a captura ------------------------------------------------------------------
  // Um item de cada tipo no pool de conteúdo, como se os arquivos tivessem subido (o seletor
  // de arquivo não roda no headless). Na captura: "js:__mock.encherPool()".
  mock.encherPool = () => {
    const b = window.campaignMediaBuilder;
    b.addTextItem();
    const tipos = [
      ['image', 'Promo_Outubro.jpg', 248_000, 'image/jpeg'],
      ['audio', 'Recado_da_Ana.ogg', 96_000, 'audio/ogg'],
      ['video', 'Demonstracao_Produto.mp4', 4_200_000, 'video/mp4'],
      ['document', 'Tabela_Precos_Novembro.pdf', 512_400, 'application/pdf'],
    ];
    for (const [tipo, nome, tamanho, mime] of tipos) {
      const it = {
        id: `media_cap_${tipo}`, type: tipo, order: b.nextOrder++, file: new File([new Uint8Array(tamanho)], nome, { type: mime }),
        file_name: nome, file_size: tamanho, s3_url: `https://arquivos.exemplo.com.br/campanhas/${nome}`, s3_key: `campanhas/${nome}`,
        upload_status: 'completed', created_at: new Date(),
      };
      b.items.push(it);
      b.renderItem(it);
    }
    b.emit('change');
  };
})();
