/*
 * Rotas só da tela de Status (stories.html): publicações agendadas no Status do WhatsApp.
 *
 * Formato copiado do backend (story.controller.ts / story.model.ts):
 *   GET /api/stories            { success, data: Story[], total }  (data_agendada DESC, hora ASC)
 *   GET /api/stories/stats      { success, data: { total, publicados, agendados, falhas } }
 *   GET /api/stories/instances  { success, data: [{ id, name, status }] }  (só conectadas)
 *   GET /api/stories/:id        { success, data: Story }
 *   GET /api/chats/transfer-options  { success, data: { queues, users: [{ user_id, name, email, role }] } }
 *
 * As imagens são SVG em data: URI, geradas aqui: a página final continua funcionando no
 * GitHub Pages sem depender de arquivo nenhum (e sem foto real).
 */
(function () {
  const mock = window.__mock;
  const { usuarios, instancias, filas } = mock.dados;

  // --- datas relativas a hoje -----------------------------------------------------------
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dia = (n) => { const d = new Date(hoje); d.setDate(d.getDate() + n); return ymd(d); };
  const primeiroDoProximoMes = ymd(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1));

  // Mesma chave de ciclo que a tela usa para mostrar "Diário postado" / "Semanal postado".
  function semanaIso(ref) {
    const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
    const quinta = new Date(d.getFullYear(), 0, 4);
    quinta.setDate(quinta.getDate() - ((quinta.getDay() + 6) % 7) + 3);
    const n = 1 + Math.round((d - quinta) / (7 * 86_400_000));
    return `${d.getFullYear()}-${String(n).padStart(2, '0')}`;
  }
  const cicloDiario = ymd(hoje);
  const cicloSemanal = semanaIso(hoje);

  // --- imagens fictícias (arte de status 9:16) ----------------------------------------------
  function arte(cor1, cor2, selo, titulo, rodape) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${cor1}"/><stop offset="1" stop-color="${cor2}"/></linearGradient></defs>
<rect width="540" height="960" fill="url(#g)"/>
<circle cx="450" cy="150" r="190" fill="#fff" opacity=".08"/><circle cx="70" cy="820" r="230" fill="#fff" opacity=".07"/>
<rect x="60" y="300" width="${selo.length * 19 + 48}" height="52" rx="26" fill="#fff" opacity=".95"/>
<text x="84" y="335" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="${cor2}">${selo}</text>
${titulo.map((linha, i) => `<text x="60" y="${430 + i * 66}" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="800" fill="#fff">${linha}</text>`).join('')}
<text x="60" y="860" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="600" fill="#fff" opacity=".9">${rodape}</text>
</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  const imgLancamento = arte('#F6AD55', '#9C4221', 'LANÇAMENTO', ['Nova linha de', 'achocolatados'], 'Representações Exemplo');
  const imgDisplay = arte('#4FD1C5', '#2B6CB0', 'NOVIDADE', ['Display de', 'balcão grátis', 'no pedido'], 'Peça pelo WhatsApp');
  const imgCatalogo = arte('#48BB78', '#22543D', 'CATÁLOGO DO MÊS', ['Confira as', 'novidades'], 'Representações Exemplo');

  // --- publicações -----------------------------------------------------------------------------
  const todasInstancias = instancias.map((i) => i.id);
  const [comercial, posvenda] = todasInstancias;
  let seq = 0;
  function status(campos) {
    seq += 1;
    const criado = mock.dias(30 - seq);
    return Object.assign({
      id: `st-${String(seq).padStart(2, '0')}`,
      account_id: 'acc-demo',
      tipo: 'texto',
      texto: '',
      cor_background: null,
      imagem_url: null,
      imagem_key: null,
      data_agendada: dia(0),
      hora: '09:00:00',
      status: 'pendente',
      recorrencia: 'unico',
      dias_semana: null,
      data_inicio: null,
      data_fim: null,
      frequencia_periodo: null,
      intervalo_numero: null,
      intervalo_unidade: null,
      instance_ids: todasInstancias,
      metadata: { responsavel: 'Ana Souza' },
      data_criacao: criado,
      data_atualizacao: criado,
    }, campos);
  }

  const stories = [
    status({ tipo: 'imagem', texto: 'Catálogo do mês: confira as novidades 📦', imagem_url: imgCatalogo, imagem_key: 'stories/acc-demo/catalogo-mes.svg',
      recorrencia: 'mensal', status: 'ativo_mensal', data_agendada: primeiroDoProximoMes, hora: '09:00:00' }),
    status({ texto: 'Atenção: segunda-feira é feriado e não teremos expediente. Pedidos feitos até sexta serão entregues na terça. 🗓️',
      cor_background: '#1A1A2E', data_agendada: dia(4), hora: '17:00:00' }),
    status({ texto: '🔥 Promoção da semana: biscoito sortido 400g com 15% de desconto acima de 20 caixas. Chame no WhatsApp!',
      cor_background: '#F56565', data_agendada: dia(3), hora: '09:00:00', instance_ids: [comercial] }),
    status({ tipo: 'imagem', texto: 'Lançamento: nova linha de achocolatados 🍫 Peça sua amostra!', imagem_url: imgLancamento, imagem_key: 'stories/acc-demo/lancamento.svg',
      data_agendada: dia(2), hora: '08:30:00', instance_ids: [comercial] }),
    status({ texto: 'Equipe de degustação no Empório Central neste sábado, das 9h às 13h. Passe lá! ☕', cor_background: '#A0522D',
      data_agendada: dia(1), hora: '10:00:00', status: 'cancelado', metadata: { responsavel: 'Carla Dias' } }),
    status({ tipo: 'imagem', texto: 'Chegou o display novo para balcão! Peça o seu junto com o pedido.', imagem_url: imgDisplay, imagem_key: 'stories/acc-demo/display.svg',
      data_agendada: dia(-2), hora: '10:00:00', status: 'enviado' }),
    status({ texto: 'Semana do cliente: 5% extra em pedidos acima de R$ 1.500 💙', cor_background: '#2196F3',
      recorrencia: 'personalizado', status: 'ativo_personalizado', data_agendada: dia(-3), hora: '12:00:00',
      data_inicio: dia(-3), data_fim: dia(11), frequencia_periodo: 'diario' }),
    status({ tipo: 'video', texto: 'Veja como montar o display de achocolatado em 30 segundos', imagem_key: 'stories/acc-demo/montagem-display.mp4',
      data_agendada: dia(-4), hora: '15:00:00', status: 'enviado', instance_ids: [posvenda], metadata: { responsavel: 'Bruno Lima' } }),
    status({ texto: 'Últimas unidades do kit panetone com o preço do mês passado!', cor_background: '#ECC94B',
      data_agendada: dia(-6), hora: '18:00:00', status: 'erro', instance_ids: [comercial],
      metadata: { responsavel: 'Ana Souza' } }),
    status({ texto: 'Pedidos feitos até as 15h saem no mesmo dia para a Grande SP 🚚', cor_background: '#48BB78',
      recorrencia: 'diario', status: 'ativo_diario', data_agendada: dia(-20), hora: '07:30:00',
      metadata: { responsavel: 'Ana Souza', recurring_last_posted_cycle_key: cicloDiario, recurring_last_posted_recorrencia: 'diario' } }),
    status({ texto: 'Bom dia! A tabela de preços da semana já está disponível. Peça a sua 📋', cor_background: '#4FD1C5',
      recorrencia: 'semanal', status: 'ativo_semanal', dias_semana: [1], data_agendada: dia(-28), hora: '08:00:00',
      metadata: { responsavel: 'Carla Dias', recurring_last_posted_cycle_key: cicloSemanal, recurring_last_posted_recorrencia: 'semanal' } }),
  ];

  // Mesma regra do getStats do backend: recorrente postado no ciclo atual conta como publicado.
  function postadoNoCiclo(s) {
    const ciclo = { diario: cicloDiario, semanal: cicloSemanal }[s.recorrencia];
    return ['ativo_diario', 'ativo_semanal', 'ativo_mensal'].includes(s.status)
      && ciclo && s.metadata && s.metadata.recurring_last_posted_cycle_key === ciclo;
  }
  const stats = {
    total: stories.length,
    publicados: stories.filter((s) => s.status === 'enviado' || postadoNoCiclo(s)).length,
    agendados: stories.filter((s) => ['pendente', 'ativo_diario', 'ativo_semanal', 'ativo_mensal', 'ativo_personalizado'].includes(s.status) && !postadoNoCiclo(s)).length,
    falhas: stories.filter((s) => s.status === 'erro').length,
  };
  mock.dados.stories = stories;

  mock.rota('GET', '/api/stories', () => ({ success: true, data: stories, total: stories.length, message: `${stories.length} stories encontrados` }));
  mock.rota('GET', '/api/stories/stats', () => ({ success: true, data: stats }));
  mock.rota('GET', '/api/stories/instances', () => ({
    success: true,
    data: instancias.filter((i) => i.status === 'CONNECTED').map((i) => ({ id: i.id, name: i.label, status: i.status })),
    message: `${instancias.length} instância(s) disponível(eis) para stories`,
  }));
  mock.rota('GET', /^\/api\/stories\/(st-\d+)$/, ({ params: [id] }) => {
    const s = stories.find((x) => x.id === id);
    return s ? { success: true, data: s } : mock.json({ error: 'Story não encontrado' }, 404);
  });
  mock.rota('POST', /^\/api\/stories\/(st-\d+)\/cancel$/, ({ params: [id] }) => {
    const s = stories.find((x) => x.id === id);
    return Object.assign({}, s, { status: 'cancelado' });
  });
  mock.rota('GET', '/api/chats/transfer-options', () => ({
    success: true,
    data: {
      queues: filas.map((f) => ({ ...f, instance_name: null, instance_label: null })),
      users: usuarios.map((u) => ({ user_id: u.user_id, name: u.name, email: u.email, role: u.role })),
    },
  }));
})();
