/*
 * Rotas só da tela de Calendário (calendar.html, app Vue em dist/calendar/).
 *
 * Formato copiado do backend (calendar.controller.ts / calendar.model.ts):
 *   GET /api/calendar/events?start_date&end_date&scope
 *       { events: [ { ...calendar.events, contact_name, contact_phone, reminders: [...] } ] }
 *       (o backend NÃO manda user_name/owner_name: a tela mostra o usuário logado como
 *       responsável de todos os eventos)
 *   GET /api/contacts?limit=100          { contacts, total, totalPages, currentPage }
 *   GET /api/contacts/search?query=      Contact[]
 *   GET /api/whatsapp/connected-instances  { instances: [{ id, name, instance_name, status }], count }
 *
 * Datas relativas a hoje (offset em dias + hora local), para a tela sempre abrir no mês
 * atual cheio de compromissos. mock.dados.eventos guarda a lista para quem precisar.
 */
(function () {
  const mock = window.__mock;
  const { contatos, instancias } = mock.dados;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const contato = (id) => contatos.find((c) => c.id === id);

  const COMERCIAL = 'inst-comercial';
  const MSG_PADRAO = 'Olá {nome}, lembrando do nosso compromisso {data} às {hora}. Até lá! 😊';

  // [offset em dias, hora, duração (min), título, tipo, cor, contato, local, descrição, lembretes]
  // lembretes: 'u30' = usuário 30 min antes; 'u1d' = usuário 1 dia antes; 'c1d' = cliente 1 dia antes; 'c1h' = cliente 1 hora antes
  const base = [
    // mês anterior
    [-28, '08:30', 45, 'Reunião semanal da equipe', 'meeting', '#B794F4', null, 'Escritório', 'Metas da semana e carteira de clientes', ['u30']],
    [-24, '10:00', 60, 'Visita – Patrícia Gomes', 'appointment', '#4A6FA5', 'ct-13', 'Campinas – SP', 'Levar amostras da linha nova', ['u30']],
    [-21, '08:30', 45, 'Reunião semanal da equipe', 'meeting', '#B794F4', null, 'Escritório', 'Metas da semana e carteira de clientes', ['u30']],
    [-18, '15:00', 60, 'Entrega – Padaria Estrela', 'event', '#F6AD55', 'ct-08', 'São Paulo – SP', '', []],
    [-14, '08:30', 45, 'Reunião semanal da equipe', 'meeting', '#B794F4', null, 'Escritório', 'Metas da semana e carteira de clientes', ['u30']],
    [-10, '14:00', 60, 'Visita – Supermercado Avenida', 'appointment', '#4A6FA5', 'ct-10', 'Santo André – SP', 'Revisar pedido semanal', ['u30']],
    [-7, '08:30', 45, 'Reunião semanal da equipe', 'meeting', '#B794F4', null, 'Escritório', 'Metas da semana e carteira de clientes', ['u30']],
    [-7, '10:00', 90, 'Visita – Rede Econômica', 'appointment', '#4A6FA5', 'ct-22', 'Campinas – SP', 'Proposta do contrato trimestral', ['u30', 'c1d']],
    [-6, '14:00', 60, 'Reunião com a fábrica: metas do mês', 'meeting', '#B794F4', null, 'https://meet.exemplo.com.br/fabrica', '', ['u30']],
    // semana passada e hoje
    [-4, '09:00', 60, 'Visita – Mercado Bom Preço', 'appointment', '#4A6FA5', 'ct-02', 'Guarulhos – SP', 'Apresentar o display novo e a tabela do mês', ['u30', 'c1d']],
    [-4, '14:30', 60, 'Alinhamento com a fábrica', 'meeting', '#B794F4', null, 'https://meet.exemplo.com.br/alinhamento', '', ['u30']],
    [-3, '08:00', 180, 'Entrega – Distribuidora Litoral', 'event', '#F6AD55', 'ct-04', 'Santos – SP', 'Pedido de 120 caixas', []],
    [-3, '16:00', 15, 'Ligar para Juliana Ribeiro', 'appointment', '#ECC94B', 'ct-05', '', 'Retorno do orçamento de 30 caixas', ['u30']],
    [0, '08:30', 45, 'Reunião semanal da equipe', 'meeting', '#B794F4', null, 'Escritório', 'Metas da semana e carteira de clientes', ['u30']],
    [0, '10:30', 60, 'Visita – Padaria Estrela', 'appointment', '#4A6FA5', 'ct-08', 'Rua das Palmeiras, 120 – São Paulo', 'Conferir a reposição do biscoito sortido', ['u30', 'c1h']],
    [0, '15:00', 30, 'Follow-up: proposta do Atacadão do Vale', 'appointment', '#ECC94B', 'ct-14', '', 'Responder o pedido de 8% no volume de 200 caixas', ['u30']],
    [0, '17:30', 30, 'Enviar pedidos da semana para a fábrica', 'event', '#48BB78', null, '', '', ['u30']],
    // próximos dias
    [1, '09:00', 90, 'Visita – Empório Central', 'appointment', '#4A6FA5', 'ct-06', 'Jundiaí – SP', 'Levar o catálogo novo', ['u30', 'c1d']],
    [1, '14:00', 180, 'Degustação no Supermercado Avenida', 'event', '#F6AD55', 'ct-10', 'Santo André – SP', 'Promotora + 2 caixas de amostra', ['u1d']],
    [2, '11:00', 60, 'Reunião – Rede Econômica', 'meeting', '#B794F4', 'ct-22', 'Campinas – SP', 'Fechar o contrato trimestral', ['u30', 'c1d']],
    [2, '16:00', 15, 'Ligar para Pedro Almeida', 'appointment', '#ECC94B', 'ct-03', '', 'Pós-venda do último pedido', ['u30']],
    [3, '09:30', 60, 'Visita – Carlos Mendes', 'appointment', '#4A6FA5', 'ct-07', 'Sorocaba – SP', 'Primeira visita: apresentar a empresa', ['u30', 'c1d']],
    [3, '15:00', 60, 'Entrega – Mariana Costa (40 caixas)', 'event', '#48BB78', 'ct-01', 'São Paulo – SP', '', ['c1h']],
    [4, '10:00', 60, 'Visita – Hortifruti Verde Vida', 'appointment', '#4A6FA5', 'ct-18', 'Barueri – SP', 'Orçamento da linha de sucos', ['u30']],
    [4, '15:00', 60, 'Fechamento semanal de pedidos', 'event', '#48BB78', null, 'Escritório', '', ['u30']],
    [7, '08:00', 1440, 'Feriado – sem expediente', 'event', '#F56565', null, '', '', []],
    [8, '09:00', 60, 'Visita – Fernanda Oliveira (loja nova)', 'appointment', '#4A6FA5', 'ct-09', 'Osasco – SP', 'Levar a tabela de atacado', ['u30', 'c1d']],
    [9, '14:00', 120, 'Treinamento de produto: achocolatados', 'event', '#F6AD55', null, 'Fábrica – São Paulo', 'Treinamento da equipe de vendas', ['u1d']],
    [10, '10:00', 60, 'Visita – Patrícia Gomes', 'appointment', '#4A6FA5', 'ct-13', 'Campinas – SP', '', ['u30', 'c1d']],
    [11, '09:00', 90, 'Reunião mensal com o gerente regional', 'meeting', '#B794F4', null, 'https://meet.exemplo.com.br/regional', 'Resultados do mês e metas', ['u30']],
    [14, '08:30', 45, 'Reunião semanal da equipe', 'meeting', '#B794F4', null, 'Escritório', 'Metas da semana e carteira de clientes', ['u30']],
    [15, '10:30', 60, 'Visita – Atacadão do Vale', 'appointment', '#4A6FA5', 'ct-14', 'São José dos Campos – SP', 'Assinar o pedido trimestral', ['u30', 'c1d']],
    [17, '14:00', 60, 'Visita – Café Aroma', 'appointment', '#4A6FA5', 'ct-24', 'São Paulo – SP', 'Primeiro pedido', ['u30']],
    [21, '08:30', 45, 'Reunião semanal da equipe', 'meeting', '#B794F4', null, 'Escritório', 'Metas da semana e carteira de clientes', ['u30']],
    [22, '09:00', 60, 'Visita – Distribuidora Litoral', 'appointment', '#4A6FA5', 'ct-04', 'Santos – SP', '', ['u30', 'c1d']],
    [24, '16:00', 60, 'Fechamento do mês: relatório de vendas', 'event', '#48BB78', null, 'Escritório', '', ['u1d']],
    // mês seguinte
    [29, '09:00', 60, 'Visita – Mercado Bom Preço', 'appointment', '#4A6FA5', 'ct-02', 'Guarulhos – SP', '', ['u30']],
    [31, '10:00', 60, 'Reunião – Rede Econômica (revisão)', 'meeting', '#B794F4', 'ct-22', 'Campinas – SP', '', ['u30']],
    [36, '14:00', 180, 'Degustação no Empório Central', 'event', '#F6AD55', 'ct-06', 'Jundiaí – SP', '', ['u1d']],
    [44, '09:30', 60, 'Visita – Supermercado Avenida', 'appointment', '#4A6FA5', 'ct-10', 'Santo André – SP', '', ['u30']],
  ];

  const LEMBRETES = {
    u30: { time_value: 30, time_unit: 'minutes', cliente: false },
    u1d: { time_value: 1, time_unit: 'days', cliente: false },
    c1d: { time_value: 1, time_unit: 'days', cliente: true },
    c1h: { time_value: 1, time_unit: 'hours', cliente: true },
  };

  const eventos = base.map(([offset, hora, duracao, titulo, tipo, cor, contatoId, local, descricao, lembretes], i) => {
    const id = `ev-${String(i + 1).padStart(2, '0')}`;
    const [h, m] = hora.split(':').map(Number);
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() + offset);
    inicio.setHours(h, m, 0, 0);
    const fim = new Date(inicio.getTime() + duracao * 60_000);
    const ct = contatoId ? contato(contatoId) : null;
    const criado = mock.dias(Math.max(2, 10 - offset));
    return {
      id,
      account_id: 'acc-demo',
      user_id: 'usr-ana',
      title: titulo,
      description: descricao || null,
      event_type: tipo,
      start_datetime: inicio.toISOString(),
      end_datetime: fim.toISOString(),
      all_day: duracao === 1440,
      duration_minutes: duracao,
      contact_id: ct ? ct.id : null,
      instance_id: COMERCIAL,
      color: cor,
      location: local || null,
      notes: null,
      status: 'scheduled',
      created_at: criado,
      updated_at: criado,
      contact_name: ct ? ct.name : null,
      contact_phone: ct ? ct.phone_number : null,
      reminders: lembretes.map((chave, j) => {
        const l = LEMBRETES[chave];
        const disparo = new Date(inicio.getTime() - (l.time_unit === 'days' ? l.time_value * 1440 : l.time_unit === 'hours' ? l.time_value * 60 : l.time_value) * 60_000);
        const enviado = disparo.getTime() < mock.agora;
        return {
          id: `rem-${id}-${j + 1}`,
          event_id: id,
          reminder_type: 'before',
          time_value: l.time_value,
          time_unit: l.time_unit,
          channel: 'whatsapp',
          custom_message: l.cliente ? MSG_PADRAO : null,
          contact_id: l.cliente && ct ? ct.id : null,
          instance_id: l.cliente ? COMERCIAL : null,
          status: enviado ? 'sent' : 'pending',
          sent_at: enviado ? disparo.toISOString() : null,
          error_message: null,
          created_at: criado,
          contact_name: l.cliente && ct ? ct.name : null,
          contact_phone: l.cliente && ct ? ct.phone_number : null,
          whatsapp: l.cliente && ct ? ct.phone_number : null,
        };
      }),
    };
  });
  mock.dados.eventos = eventos;

  // Mesmo filtro do backend: start_datetime::date entre start_date e end_date (datas locais).
  mock.rota('GET', '/api/calendar/events', ({ busca }) => {
    const de = busca.get('start_date');
    const ate = busca.get('end_date');
    const lista = eventos.filter((e) => {
      const dia = ymd(new Date(e.start_datetime));
      return (!de || dia >= de) && (!ate || dia <= ate);
    });
    return { events: lista };
  });
  mock.rota('GET', /^\/api\/calendar\/events\/(ev-\d+)$/, ({ params: [id] }) => eventos.find((e) => e.id === id) || mock.json({ error: 'Evento não encontrado' }, 404));

  mock.rota('GET', '/api/contacts', () => ({ contacts: contatos, total: contatos.length, totalPages: 1, currentPage: 1 }));
  mock.rota('GET', '/api/contacts/search', ({ busca }) => {
    const q = (busca.get('query') || '').toLowerCase();
    return contatos.filter((c) => c.name.toLowerCase().includes(q) || c.phone_number.includes(q)).slice(0, 20);
  });
  mock.rota('GET', '/api/whatsapp/connected-instances', () => {
    const conectadas = instancias.filter((i) => i.status === 'CONNECTED')
      .map((i) => ({ id: i.id, name: i.label, instance_name: i.name, status: i.status }));
    return { instances: conectadas, count: conectadas.length };
  });
})();
