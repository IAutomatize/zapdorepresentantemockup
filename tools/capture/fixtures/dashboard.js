/*
 * Rotas só da tela Dashboard (dashboard.html): métricas v2, horários do chat, últimas
 * conversas e contadores do cabeçalho. É uma conta pequena de representação comercial,
 * coerente com comum.js: 14 conversas abertas, 24 contatos, Ana, Carla e Bruno na equipe,
 * dois números de WhatsApp e o Kanban de 4 etapas.
 *
 * A história é uma só: 90 dias até hoje, dia a dia, com sorteio de semente fixa (a mesma
 * captura sempre dá os mesmos números). Cada período do seletor (hoje, 7, 30 e 90 dias)
 * recorta essa história, então os totais batem entre si e com as outras telas.
 *
 * Formatos lidos de src/services/dashboard-v2.service.ts e de dashboard-renderers.ts.
 *
 * Também expõe __mockDashboard.capturarEstados(): a captura chama essa função para
 * guardar cada aba e cada período como <template>, já com os gráficos virados imagem.
 */
(function () {
  const mock = window.__mock;
  const { contatos, conversas, usuarios, instancias, filas, colunas, cards } = mock.dados;

  const DIA = 86_400_000;
  const agora = new Date(mock.agora);
  const meiaNoite = new Date(agora);
  meiaNoite.setHours(0, 0, 0, 0);
  const TOTAL_DIAS = 90;
  const HOJE = TOTAL_DIAS - 1;
  const horaAtual = agora.getHours();

  /** Início do dia `i` (0 = 89 dias atrás, 89 = hoje). */
  function inicioDoDia(i) {
    const d = new Date(meiaNoite);
    d.setDate(d.getDate() - (HOJE - i));
    return d;
  }
  const ehFimDeSemana = (i) => [0, 6].includes(inicioDoDia(i).getDay());
  const pad = (n) => String(n).padStart(2, '0');
  const rotuloDia = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  /** Instante de `dias` atrás (fração vira horas). */
  const atras = (dias) => new Date(agora.getTime() - dias * DIA);
  const soma = (lista) => lista.reduce((acc, v) => acc + v, 0);
  // Mesmo arredondamento do backend (percent com 2 casas).
  const percent = (parte, todo) => (todo > 0 ? Number(((parte / todo) * 100).toFixed(2)) : 0);

  /** Sorteio determinístico (mulberry32). */
  function sorteio(semente) {
    let a = semente >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Quanto do expediente de hoje já passou (8h às 18h): o dia de hoje vem parcial.
  const fracaoDeHoje = Math.min(1, Math.max(0, (horaAtual + agora.getMinutes() / 60 - 8) / 10));

  /** Uma série diária de 90 dias: [mín, máx] em dia útil e no fim de semana. */
  function serieDiaria(semente, util, fds) {
    const r = sorteio(semente);
    return Array.from({ length: TOTAL_DIAS }, (_, i) => {
      const [minimo, maximo] = ehFimDeSemana(i) ? fds : util;
      const v = Math.round(minimo + r() * (maximo - minimo));
      return i === HOJE ? Math.round(v * fracaoDeHoje) : v;
    });
  }

  // Peso de cada hora do dia num escritório de representação (pico de manhã e à tarde).
  const PESO_HORA = [0, 0, 0, 0, 0, 0, 0.1, 0.5, 2.2, 3.4, 3.8, 3.2, 1.6, 2.0, 3.0, 3.3, 2.8, 2.1, 1.0, 0.5, 0.3, 0.2, 0.1, 0];

  /** Reparte `total` em inteiros proporcionais aos pesos (maiores restos). */
  function repartir(total, pesos) {
    const somaPesos = soma(pesos);
    if (!total || !somaPesos) return pesos.map(() => 0);
    const brutos = pesos.map((p) => (total * p) / somaPesos);
    const inteiros = brutos.map(Math.floor);
    let falta = total - soma(inteiros);
    brutos
      .map((v, i) => [v - Math.floor(v), i])
      .sort((a, b) => b[0] - a[0])
      .forEach(([, i]) => { if (falta > 0) { inteiros[i] += 1; falta -= 1; } });
    return inteiros;
  }

  // --- a história dos 90 dias -----------------------------------------------------------
  const recebidasDia = serieDiaria(11, [14, 26], [7, 13]);
  const enviadasDia = serieDiaria(23, [17, 31], [6, 12]);
  const execucoesDia = serieDiaria(37, [1, 4], [0, 1]);

  // Movimentações do Kanban: 0 a 3 por dia útil; 30% entradas, 55% avanços, 15% voltas.
  const movimentos = [];
  (() => {
    const r = sorteio(41);
    for (let i = 0; i < TOTAL_DIAS; i += 1) {
      const qtd = ehFimDeSemana(i) ? 0 : Math.floor(r() * 4);
      for (let k = 0; k < qtd; k += 1) {
        const quando = new Date(inicioDoDia(i).getTime() + (8 + r() * 10) * 3_600_000);
        const sorte = r();
        const tipo = sorte < 0.3 ? 'entrada' : sorte < 0.85 ? 'avanco' : 'volta';
        if (quando <= agora) movimentos.push({ quando, tipo });
      }
    }
  })();

  // Chats novos além dos contatos novos (cliente antigo chamando no outro número).
  const chatsExtras = [0.32, 1.2, 4.1, 8.3, 13.2, 19.1, 26.3, 33.2, 41.1, 52.3, 67.2, 80.1].map(atras);

  // Tarefas: [responsável, criada, concluída, prazo] em dias atrás (prazo negativo = futuro).
  const TAREFAS = [
    ['usr-ana', 88, 86, 85], ['usr-ana', 75, 72, 70], ['usr-ana', 60, 59, 59], ['usr-ana', 44, 43, 42],
    ['usr-ana', 28, 26, 25], ['usr-ana', 21, 20, 20], ['usr-ana', 14, 12, 11], ['usr-ana', 9, 8, 7],
    ['usr-ana', 6, 5, 5], ['usr-ana', 3, 1.1, 1], ['usr-ana', 1, null, -2], ['usr-ana', 0.25, null, -3],
    ['usr-carla', 80, 78, 79], ['usr-carla', 50, 47, 48], ['usr-carla', 33, 30, 30], ['usr-carla', 25, 22, 22],
    ['usr-carla', 17, 15, 16], ['usr-carla', 10, 9, 9], ['usr-carla', 4, 2, 2], ['usr-carla', 2, null, -1],
    ['usr-carla', 0.9, 0.15, null],
    ['usr-bruno', 70, 64, 67], ['usr-bruno', 38, 33, 35], ['usr-bruno', 26, 21, 23], ['usr-bruno', 12, 9, 10],
    ['usr-bruno', 8, null, 3], ['usr-bruno', 5, null, 1], ['usr-bruno', 1, null, -4],
    // Antigas, de antes dos 90 dias: só entram no total.
    ['usr-ana', 130, 128, 127], ['usr-carla', 118, 117, 117], ['usr-ana', 104, 101, 100], ['usr-bruno', 97, 95, 94],
  ].map(([resp, criada, concluida, prazo]) => ({
    resp,
    criada: atras(criada),
    concluida: concluida === null ? null : atras(concluida),
    prazo: prazo === null ? null : atras(prazo),
  }));

  // Campanhas: [nome, status, contatos, enviadas, falhas, entregues, lidas, começou, atualizada]
  // (dias atrás). No máximo 24 contatos por campanha: é o tamanho da carteira em comum.js.
  const CAMPANHAS = [
    ['Catálogo de inverno', 'completed', 21, 21, 0, 20, 15, 82, 81],
    ['Aviso de reajuste – agosto', 'completed', 24, 23, 1, 22, 19, 58, 58],
    ['Pedido mínimo de setembro', 'completed', 16, 15, 1, 15, 9, 35, 34],
    ['Reativar clientes parados', 'completed', 9, 8, 1, 8, 4, 24, 23],
    ['Lançamento biscoitos integrais', 'completed', 18, 17, 1, 17, 12, 12, 11],
    ['Tabela de preços – outubro', 'completed', 22, 22, 0, 21, 17, 5, 4],
    ['Promoção Dia das Crianças', 'running', 24, 14, 0, 13, 6, 0.3, 0.1],
  ].map(([nome, status, total, enviadas, falhas, entregues, lidas, comecou, atualizada], i) => ({
    id: `camp-${i + 1}`, nome, status, total, enviadas, falhas, entregues, lidas,
    comecou: atras(comecou), atualizada: atras(atualizada),
  }));

  // Atendimentos finalizados: [cliente, responsável, fila, motivo, nota 0-10, dias atrás,
  // minutos de atendimento, minutos até a avaliação]. Cliente sempre cadastrado antes.
  const FINALIZACOES = [
    ['Beatriz Lima', 'usr-ana', 'Geral', 'Resolvido', 10, 0.12, 15, 3],
    ['Mariana Costa', 'usr-ana', 'Vendas', 'Finalizado com pedido', 10, 1.2, 34, 6],
    ['Pedro Almeida', 'usr-ana', 'Vendas', 'Resolvido', 8, 2.1, 22, 15],
    ['Padaria Estrela', 'usr-ana', 'Vendas', 'Finalizado com pedido', null, 3.3, 41, null],
    ['Supermercado Avenida', 'usr-carla', 'Vendas', 'Finalizado com pedido', 10, 5.2, 58, 9],
    ['Camila Rocha', 'usr-ana', 'Geral', 'Resolvido', 10, 8.1, 18, 4],
    ['Loja da Esquina', 'usr-bruno', 'Vendas', 'Sem resposta', null, 9.4, 95, null],
    ['Empório Central', 'usr-ana', 'Vendas', 'Finalizado com orçamento', 6, 12.2, 47, 32],
    ['Patrícia Gomes', 'usr-carla', 'Geral', 'Resolvido', 10, 15.1, 26, 7],
    ['Thiago Martins', 'usr-bruno', 'Vendas', 'Finalizado com orçamento', 8, 16.3, 63, 41],
    ['Rede Econômica', 'usr-carla', 'Vendas', 'Finalizado com pedido', 8, 21.1, 72, 18],
    ['Conveniência 24h Centro', 'usr-ana', 'Vendas', 'Sem resposta', null, 26.4, 120, null],
    ['Distribuidora Litoral', 'usr-carla', 'Vendas', 'Finalizado com pedido', 10, 33.2, 54, 12],
    ['Mercearia São José', 'usr-bruno', 'Vendas', 'Sem resposta', null, 37.4, 130, null],
    ['Ricardo Santos', 'usr-bruno', 'Geral', 'Finalizado com orçamento', 4, 40.1, 88, 55],
    ['Mariana Costa', 'usr-ana', 'Vendas', 'Finalizado com pedido', 10, 43.3, 29, 5],
    ['Atacadão do Vale', 'usr-bruno', 'Vendas', 'Finalizado com pedido', 8, 47.2, 77, 26],
    ['Empório Central', 'usr-ana', 'Vendas', 'Resolvido', 8, 51.1, 25, 11],
    ['Supermercado Avenida', 'usr-carla', 'Vendas', 'Finalizado com pedido', 10, 55.3, 61, 8],
    ['Pedro Almeida', 'usr-ana', 'Geral', 'Resolvido', 10, 58.2, 19, 6],
    ['Thiago Martins', 'usr-bruno', 'Vendas', 'Sem resposta', null, 59.1, 140, null],
    ['Patrícia Gomes', 'usr-carla', 'Geral', 'Resolvido', 10, 64.2, 21, 5],
    ['Rede Econômica', 'usr-carla', 'Vendas', 'Finalizado com orçamento', 8, 69.4, 66, 21],
    ['Padaria Estrela', 'usr-ana', 'Vendas', 'Finalizado com pedido', 10, 74.1, 37, 9],
    ['Conveniência 24h Centro', 'usr-ana', 'Vendas', 'Finalizado com pedido', 8, 79.3, 44, 14],
    ['Beatriz Lima', 'usr-carla', 'Geral', 'Resolvido', null, 83.2, 31, null],
    ['Camila Rocha', 'usr-ana', 'Geral', 'Finalizado com orçamento', 8, 87.1, 39, 17],
  ].map(([cliente, resp, fila, motivo, nota, dias, minutos, minutosAval], i) => ({
    id: idFicticio(i + 1),
    cliente, resp, fila, motivo, nota, quando: atras(dias), minutos, minutosAval,
  }));

  // Motivos padrão das Regras de Atendimento (migração 271); dois contam como resolvido.
  const MOTIVOS = {
    Resolvido: { cor: '#48BB78', sucesso: true },
    'Finalizado com pedido': { cor: '#2196F3', sucesso: true },
    'Finalizado com orçamento': { cor: '#9F7AEA', sucesso: false },
    'Sem resposta': { cor: '#F56565', sucesso: false },
  };

  /** Id com cara de UUID (a tabela de Monitoramento mostra o id do atendimento). */
  function idFicticio(n) {
    const r = sorteio(1000 + n);
    const hex = (len) => Array.from({ length: len }, () => Math.floor(r() * 16).toString(16)).join('');
    return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
  }

  const nomeDe = (userId) => usuarios.find((u) => u.user_id === userId)?.display_name || 'Sem responsável';

  // Números que não saem das listas acima: [hoje, 7d, 30d, 90d].
  const FIXOS = {
    conversas: { today: 9, '7d': 16, '30d': 22, '90d': 27 },
    atendimentos: { today: 8, '7d': 16, '30d': 25, '90d': 47 },
    espera: { today: 2.4, '7d': 3.1, '30d': 3.6, '90d': 4.2 },
    resposta: { today: 1.3, '7d': 1.6, '30d': 1.9, '90d': 2.3 },
    followUp: { today: 2, '7d': 9, '30d': 26, '90d': 71 },
    agendadas: { today: 1, '7d': 5, '30d': 14, '90d': 38 },
    falhasEnvio: { today: 0, '7d': 1, '30d': 3, '90d': 7 },
    // Conversas com mensagem no período, pelo responsável atual (soma = conversas).
    porAtendente: {
      today: [['usr-ana', 6], ['usr-carla', 2], ['usr-bruno', 1]],
      '7d': [['usr-ana', 9], ['usr-carla', 4], ['usr-bruno', 3]],
      '30d': [['usr-ana', 12], ['usr-carla', 6], ['usr-bruno', 4]],
      '90d': [['usr-ana', 15], ['usr-carla', 7], ['usr-bruno', 5]],
    },
  };

  // --- recorte por período ------------------------------------------------------------------
  function contexto(range) {
    if (range === 'today') {
      const buckets = Array.from({ length: horaAtual + 1 }, (_, h) => ({ hora: h, label: `${pad(h)}h` }));
      return { range, inicio: meiaNoite, unidade: 'hour', buckets, dias: [HOJE] };
    }
    const n = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const dias = Array.from({ length: n }, (_, k) => TOTAL_DIAS - n + k);
    const buckets = dias.map((i) => ({ dia: i, label: rotuloDia(inicioDoDia(i)) }));
    return { range, inicio: inicioDoDia(TOTAL_DIAS - n), unidade: 'day', buckets, dias };
  }

  const noPeriodo = (ctx, d) => d && d >= ctx.inicio && d <= agora;

  /** Uma série diária recortada nos buckets do período (hoje: repartida por hora). */
  function porBucket(ctx, serie) {
    if (ctx.unidade === 'hour') {
      const pesos = PESO_HORA.slice(0, horaAtual + 1);
      return repartir(serie[HOJE], pesos);
    }
    return ctx.dias.map((i) => serie[i]);
  }

  /** Conta instantes por bucket do período. */
  function contarPorBucket(ctx, instantes) {
    const saida = ctx.buckets.map(() => 0);
    for (const d of instantes) {
      if (!noPeriodo(ctx, d)) continue;
      if (ctx.unidade === 'hour') {
        saida[d.getHours()] += 1;
      } else {
        const idx = Math.floor((d - inicioDoDia(ctx.dias[0])) / DIA);
        if (idx >= 0 && idx < saida.length) saida[idx] += 1;
      }
    }
    return saida;
  }

  const grafico = (title, type, labels, datasets) => ({ title, type, labels, datasets });

  // --- seções --------------------------------------------------------------------------------
  function secaoChat(ctx) {
    const r = ctx.range;
    const recebidas = porBucket(ctx, recebidasDia);
    const enviadas = porBucket(ctx, enviadasDia);
    const inbound = soma(recebidas);
    const outbound = soma(enviadas);
    const novosContatos = contatos.map((c) => new Date(c.created_at));
    const contatosSerie = contarPorBucket(ctx, novosContatos);
    const chatsSerie = contarPorBucket(ctx, [...novosContatos, ...chatsExtras]);
    const finalizadas = FINALIZACOES.filter((f) => noPeriodo(ctx, f.quando));
    const tempoAtendimento = finalizadas.length
      ? Number((soma(finalizadas.map((f) => f.minutos)) / finalizadas.length).toFixed(2))
      : 0;
    const naoLidas = conversas.filter((c) => c.unread_count > 0).length;
    const atendimentos = FIXOS.atendimentos[r];

    return {
      key: 'chat',
      title: 'Chat',
      description: 'Mensagens, novos chats e contatos no período.',
      kpis: [
        { id: 'inbound', label: 'Mensagens recebidas', value: inbound },
        { id: 'outbound', label: 'Mensagens enviadas', value: outbound },
        { id: 'new_chats', label: 'Novos chats', value: soma(chatsSerie) },
        { id: 'new_contacts', label: 'Novos contatos', value: soma(contatosSerie) },
        { id: 'avg_wait_minutes', label: 'Tempo médio de espera', value: FIXOS.espera[r], unit: 'min' },
        { id: 'avg_response_minutes', label: 'Tempo médio de resposta', value: FIXOS.resposta[r], unit: 'min' },
        { id: 'avg_service_minutes', label: 'Tempo médio de atendimento', value: tempoAtendimento, unit: 'min' },
        { id: 'total_messages', label: 'Total de mensagens', value: inbound + outbound },
        { id: 'conversations_range', label: 'Conversas no período', value: FIXOS.conversas[r] },
        { id: 'attended_chats', label: 'Atendimentos no período', value: atendimentos },
        { id: 'outbound_audio', label: 'Áudios enviados', value: Math.round(outbound * 0.07) },
        { id: 'outbound_images', label: 'Imagens enviadas', value: Math.round(outbound * 0.1) },
        { id: 'outbound_documents', label: 'Documentos enviados', value: Math.round(outbound * 0.06) },
        { id: 'outbound_failed', label: 'Falhas de envio', value: FIXOS.falhasEnvio[r] },
        { id: 'follow_up_total', label: 'Follow-ups enviados', value: FIXOS.followUp[r] },
        { id: 'scheduled_messages_total', label: 'Mensagens agendadas', value: FIXOS.agendadas[r] },
        { id: 'finalized_chats_range', label: 'Atendimentos finalizados', value: finalizadas.length },
        { id: 'pending_queue_now', label: 'Pendentes na fila', value: naoLidas },
        { id: 'open_conversations_now', label: 'Conversas abertas agora', value: conversas.length },
        { id: 'human_attendances_range', label: 'Atendimentos com responsável', value: atendimentos },
      ],
      charts: {
        primary: grafico('Volume de mensagens', 'line', ctx.buckets.map((b) => b.label), [
          { label: 'Recebidas', data: recebidas },
          { label: 'Enviadas', data: enviadas },
        ]),
        secondary: grafico('Novos chats e contatos', 'bar', ctx.buckets.map((b) => b.label), [
          { label: 'Chats', data: chatsSerie },
          { label: 'Contatos', data: contatosSerie },
        ]),
      },
      extras: {
        top_agents_range: FIXOS.porAtendente[r].map(([id, count]) => ({ name: nomeDe(id), count })),
        // Os dois números da conta são WhatsApp: um canal só.
        channel_distribution: [{ label: 'whatsapp', count: inbound + outbound }],
        // O backend ainda não mede chatbot nem agente de IA: vem assim mesmo do servidor.
        bot: {
          chatbot_rules: {
            available: false,
            reason: 'Recurso em desenvolvimento',
            metrics: { sessions_bot: null, containment_rate: null, transfer_rate: null, time_in_bot_seconds: null },
          },
          ai_agent: {
            available: false,
            reason: 'Recurso em desenvolvimento',
            metrics: { interactions_ia: null, accuracy_rate: null, human_handoff: null, positive_sentiment: null },
          },
          human_service: {
            available: true,
            metrics: {
              attended_humans: atendimentos,
              avg_service_minutes: tempoAtendimento,
              finalized_range: finalizadas.length,
              satisfaction: null,
              satisfaction_available: false,
            },
          },
          sessions_by_type: {
            bot: { value: null, available: false },
            ia: { value: null, available: false },
            humano: { value: atendimentos, available: true },
          },
        },
      },
    };
  }

  function secaoKanban(ctx) {
    const doPeriodo = movimentos.filter((m) => noPeriodo(ctx, m.quando));
    const avancos = doPeriodo.filter((m) => m.tipo !== 'volta').length;
    return {
      key: 'kanban',
      title: 'Kanban',
      description: 'Cards por etapa e movimentações no funil.',
      kpis: [
        { id: 'cards', label: 'Cards', value: cards.length },
        { id: 'columns', label: 'Etapas', value: colunas.length },
        { id: 'moves', label: 'Movimentações', value: doPeriodo.length },
        { id: 'advance_rate', label: 'Taxa de avanço', value: percent(avancos, doPeriodo.length), unit: '%' },
      ],
      charts: {
        primary: grafico('Cards por etapa', 'doughnut', colunas.map((c) => c.name), [
          { label: 'Cards', data: colunas.map((c) => cards.filter((k) => k.column_id === c.id).length) },
        ]),
        secondary: grafico('Entradas e saídas', 'line', ctx.buckets.map((b) => b.label), [
          { label: 'Entradas', data: contarPorBucket(ctx, doPeriodo.filter((m) => m.tipo === 'entrada').map((m) => m.quando)) },
          { label: 'Saídas', data: contarPorBucket(ctx, doPeriodo.filter((m) => m.tipo !== 'entrada').map((m) => m.quando)) },
        ]),
      },
    };
  }

  function secaoTarefas(ctx) {
    const criadas = TAREFAS.filter((t) => noPeriodo(ctx, t.criada));
    const concluidas = TAREFAS.filter((t) => noPeriodo(ctx, t.concluida));
    const atrasadasAgora = TAREFAS.filter((t) => !t.concluida && t.prazo && t.prazo < agora);
    const vencidasNoPeriodo = TAREFAS.filter((t) => !t.concluida && noPeriodo(ctx, t.prazo)).map((t) => t.prazo);
    const atrasoSerie = contarPorBucket(ctx, vencidasNoPeriodo);

    const porResp = usuarios.map((u) => {
      const minhas = TAREFAS.filter((t) => t.resp === u.user_id);
      const ativas = minhas.filter((t) => noPeriodo(ctx, t.criada) || noPeriodo(ctx, t.concluida));
      const comPrazo = minhas.filter((t) => noPeriodo(ctx, t.concluida) && t.prazo);
      const deltas = comPrazo.map((t) => (t.concluida - t.prazo) / DIA);
      return {
        nome: u.display_name,
        todas: minhas.length,
        total: ativas.length,
        concluidas: minhas.filter((t) => noPeriodo(ctx, t.concluida)).length,
        prazoTotal: comPrazo.length,
        delta: deltas.length ? Number((soma(deltas) / deltas.length).toFixed(2)) : 0,
      };
    });
    const ordem = (a, b, campo) => b[campo] - a[campo] || a.nome.localeCompare(b.nome);

    return {
      key: 'tasks',
      title: 'Tarefas',
      description: 'Criadas, concluídas, atrasadas e distribuição por responsável.',
      kpis: [
        { id: 'total_tasks', label: 'Total de tarefas', value: TAREFAS.length },
        { id: 'created_count', label: 'Criadas', value: criadas.length },
        { id: 'completed_count', label: 'Concluídas', value: concluidas.length },
        { id: 'overdue_count', label: 'Atrasadas', value: atrasadasAgora.length },
        { id: 'completion_rate', label: 'Taxa de conclusão', value: percent(concluidas.length, criadas.length), unit: '%' },
      ],
      charts: {
        primary: grafico('Criadas x concluídas', 'line', ctx.buckets.map((b) => b.label), [
          { label: 'Criadas', data: contarPorBucket(ctx, criadas.map((t) => t.criada)) },
          { label: 'Concluídas', data: contarPorBucket(ctx, concluidas.map((t) => t.concluida)) },
        ]),
        secondary: grafico('Por responsável', 'bar', [...porResp].sort((a, b) => ordem(a, b, 'todas')).map((p) => p.nome), [
          { label: 'Tarefas', data: [...porResp].sort((a, b) => ordem(a, b, 'todas')).map((p) => p.todas) },
        ]),
      },
      extras: {
        overdue_trend: ctx.buckets.map((b, i) => ({ label: b.label, count: atrasoSerie[i] })),
        productivity_rows: porResp.filter((p) => p.total > 0).sort((a, b) => ordem(a, b, 'total'))
          .map((p) => ({ name: p.nome, total: p.total, completed: p.concluidas })),
        deadline_rows: porResp.filter((p) => p.prazoTotal > 0).sort((a, b) => ordem(a, b, 'prazoTotal'))
          .map((p) => ({ name: p.nome, total: p.prazoTotal, avg_days_delta: p.delta })),
      },
    };
  }

  function secaoCampanhas(ctx) {
    const doPeriodo = CAMPANHAS.filter((c) => noPeriodo(ctx, c.atualizada) || noPeriodo(ctx, c.comecou));
    const enviadas = soma(doPeriodo.map((c) => c.enviadas));
    const falhas = soma(doPeriodo.map((c) => c.falhas));
    const porStatus = ['completed', 'running'].map((s) => [s, doPeriodo.filter((c) => c.status === s).length]).filter(([, n]) => n > 0);
    const execucoes = ctx.buckets.map(() => 0);
    const falhasSerie = ctx.buckets.map(() => 0);
    doPeriodo.forEach((c) => {
      const [i] = contarPorBucket(ctx, [c.comecou]).map((v, k) => (v ? k : -1)).filter((k) => k >= 0);
      if (i !== undefined) { execucoes[i] += c.enviadas; falhasSerie[i] += c.falhas; }
    });

    return {
      key: 'campaigns',
      title: 'Campanhas',
      description: 'Campanhas ativas/finalizadas e desempenho de envio.',
      kpis: [
        { id: 'total_campaigns', label: 'Total de campanhas', value: doPeriodo.length },
        { id: 'active_campaigns', label: 'Ativas', value: doPeriodo.filter((c) => c.status === 'running').length },
        { id: 'completed_campaigns', label: 'Finalizadas', value: doPeriodo.filter((c) => c.status === 'completed').length },
        { id: 'total_sent', label: 'Envios com sucesso', value: enviadas },
        { id: 'failure_rate', label: 'Taxa de falha', value: percent(falhas, enviadas + falhas), unit: '%' },
      ],
      charts: {
        primary: grafico('Throughput', 'line', ctx.buckets.map((b) => b.label), [
          { label: 'Sucesso', data: execucoes },
          { label: 'Falha', data: falhasSerie },
        ]),
        secondary: grafico('Campanhas por status', 'doughnut', porStatus.map(([s]) => s), [
          { label: 'Campanhas', data: porStatus.map(([, n]) => n) },
        ]),
      },
      extras: {
        top_rows: doPeriodo.map((c) => ({
          id: c.id,
          name: c.nome,
          status: c.status,
          total_contacts: c.total,
          sent_count: c.enviadas,
          failed_count: c.falhas,
          total_sent: c.enviadas + c.falhas,
          delivered_count: c.entregues,
          read_count: c.lidas,
          updated_at: c.atualizada.toISOString(),
        })),
      },
    };
  }

  function secaoAutomacoes(ctx) {
    const serie = porBucket(ctx, execucoesDia);
    const total = soma(serie);
    const sucesso = Math.round(total * 0.87);
    const aguardando = Math.round(total * 0.08);
    const falhas = Math.max(0, total - sucesso - aguardando);
    const turnos = repartir(total, [55, 38, 7]);
    const base = total > 0 ? total : sucesso + aguardando;
    return {
      key: 'automations',
      title: 'Automações',
      description: 'Workflows ativos, execuções e confiabilidade.',
      kpis: [
        { id: 'active_workflows', label: 'Workflows ativos', value: 3 },
        { id: 'total_executions', label: 'Execuções', value: total },
        { id: 'success_rate', label: 'Taxa de sucesso', value: percent(sucesso, sucesso + falhas), unit: '%' },
        { id: 'avg_duration_ms', label: 'Tempo médio de execução', value: 1840.37, unit: 'ms' },
      ],
      charts: {
        primary: grafico('Execuções por período', 'line', ctx.buckets.map((b) => b.label), [
          { label: 'Execuções', data: serie },
        ]),
        secondary: grafico('Sessões por status', 'doughnut', ['completed', 'waiting', 'failed'], [
          { label: 'Sessões', data: [sucesso, aguardando, falhas] },
        ]),
      },
      extras: {
        automations_metrics: {
          follow_up: {
            sent: total,
            delivered: sucesso,
            viewed: Math.round(total * 0.66),
            failed: falhas,
            replied: Math.round(total * 0.34),
          },
          chatbot: {
            bot_average: percent(sucesso, base),
            human_average: percent(aguardando, base),
            rows: [
              { label: 'Iniciadas', bot: total, human: 0 },
              { label: 'Concluídas', bot: sucesso, human: 0 },
              { label: 'Transferidas', bot: 0, human: aguardando },
              { label: 'Falhas', bot: 0, human: falhas },
            ],
          },
          ia_agent: {
            attended: total,
            converted: sucesso,
            transferred: aguardando,
            escalated: falhas,
            shift_counts: { morning: turnos[0], afternoon: turnos[1], night: turnos[2] },
          },
        },
      },
    };
  }

  /** Mesmas fórmulas de buildMonitoring (dashboard-v2.service.ts). */
  function secaoMonitoramento(ctx) {
    const toFive = (v) => Math.min(5, Math.max(0, Number(v.toFixed(1))));
    const media = (lista) => (lista.length ? soma(lista) / lista.length : 0);
    const doPeriodo = FINALIZACOES.filter((f) => noPeriodo(ctx, f.quando)).sort((a, b) => b.quando - a.quando);
    const cores = ['#4A6FA5', '#48BB78', '#F6AD55', '#B794F4', '#F56565', '#2196F3'];

    const grupos = new Map();
    doPeriodo.forEach((f) => {
      const chave = `${f.resp}|${f.fila}`;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(f);
    });
    const desempenho = [...grupos.values()].map((linhas) => {
      const avaliadas = linhas.filter((f) => f.nota !== null);
      const temNota = avaliadas.length > 0;
      const nota5 = temNota ? media(avaliadas.map((f) => f.nota)) / 2 : 0;
      const tempo = media(linhas.map((f) => f.minutos));
      const tempoAval = media(avaliadas.map((f) => f.minutosAval));
      const resolvidos = linhas.filter((f) => MOTIVOS[f.motivo].sucesso).length;
      const contagem = new Map();
      linhas.forEach((f) => contagem.set(f.motivo, (contagem.get(f.motivo) || 0) + 1));
      const principal = [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
      const dims = {
        satisfacao: temNota ? toFive(nota5) : 0,
        cobertura: toFive((avaliadas.length / linhas.length) * 5),
        resolucao: toFive((resolvidos / linhas.length) * 5),
        agilidade: tempo > 0 ? toFive((1 - Math.min(tempo, 480) / 480) * 5) : 0,
        retorno: temNota && tempoAval > 0 ? toFive((1 - Math.min(tempoAval, 120) / 120) * 5) : 0,
      };
      const partes = [dims.cobertura, dims.resolucao, dims.agilidade].concat(temNota ? [dims.satisfacao, dims.retorno] : []);
      return {
        usuario_id: linhas[0].resp,
        usuario: nomeDe(linhas[0].resp),
        fila: linhas[0].fila,
        finalizados: linhas.length,
        avaliacoes: avaliadas.length,
        has_avaliacao: temNota,
        motivo: principal,
        avaliacao: temNota ? Number(nota5.toFixed(1)) : null,
        tempo_minutos: Number(tempo.toFixed(1)),
        tempo: `${Math.max(1, Math.round(tempo))}min`,
        tempo_atendimento_minutos: Number(tempo.toFixed(1)),
        tempo_resposta_avaliacao_minutos: Number(tempoAval.toFixed(1)),
        score: toFive(media(partes)),
        resolvidos,
        cobertura_avaliacao: Number(((avaliadas.length / linhas.length) * 100).toFixed(1)),
        taxa_resolucao: Number(((resolvidos / linhas.length) * 100).toFixed(1)),
        dimensoes: dims,
      };
    }).sort((a, b) => b.finalizados - a.finalizados || a.usuario.localeCompare(b.usuario));

    const relatorio = doPeriodo.map((f) => ({
      id: f.id,
      chat_id: '',
      cliente: f.cliente,
      usuario: nomeDe(f.resp),
      usuario_id: f.resp,
      fila: f.fila.toUpperCase(),
      motivo: f.motivo,
      avaliacao: f.nota === null ? null : Math.min(5, Math.max(0, Math.round(f.nota / 2))),
      has_avaliacao: f.nota !== null,
      rating_score_0_10: f.nota,
      data: f.quando.toLocaleString('pt-BR'),
      closed_at_iso: f.quando.toISOString(),
    }));

    const corPorUsuario = new Map();
    desempenho.forEach((d) => { if (!corPorUsuario.has(d.usuario)) corPorUsuario.set(d.usuario, cores[corPorUsuario.size % cores.length]); });
    // Ranking: uma entrada por pessoa avaliada (a de maior volume, como no backend).
    const vistos = new Set();
    const ranking = desempenho
      .filter((d) => d.usuario_id && d.has_avaliacao && !vistos.has(d.usuario) && vistos.add(d.usuario))
      .map((d) => ({
        nome: d.usuario,
        score: d.score,
        key: d.usuario.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        color: corPorUsuario.get(d.usuario),
        dims: d.dimensoes,
      }))
      .sort((a, b) => b.score - a.score)
      .map((d, i) => ({ ...d, pos: i + 1, medal: ['🥇', '🥈', '🥉'][i] || '' }));

    const totais = new Map();
    doPeriodo.forEach((f) => totais.set(f.motivo, (totais.get(f.motivo) || 0) + 1));
    const motivosTotal = doPeriodo.length;
    const motivos = [...totais.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([nome, valor]) => ({
      name: nome, value: valor, color: MOTIVOS[nome].cor, percent: Number(((valor / motivosTotal) * 100).toFixed(1)),
    }));

    const porUsuario = [...corPorUsuario.keys()].map((nome) => {
      const minhas = doPeriodo.filter((f) => nomeDe(f.resp) === nome);
      const conta = (m) => minhas.filter((f) => f.motivo === m).length;
      return {
        nome, color: corPorUsuario.get(nome), resolvido: conta('Resolvido'), semResp: conta('Sem resposta'),
        desistiu: 0, transf: 0, spam: 0, outro: minhas.length - conta('Resolvido') - conta('Sem resposta'),
      };
    });

    const evolucao = ctx.buckets.map((b, i) => {
      const doBucket = doPeriodo.filter((f) => contarPorBucket(ctx, [f.quando])[i] === 1);
      const conta = (m) => doBucket.filter((f) => f.motivo === m).length;
      return {
        date: b.label, resolvido: conta('Resolvido'), semResposta: conta('Sem resposta'),
        desistiu: 0, transferido: 0, spam: 0, outro: doBucket.length - conta('Resolvido') - conta('Sem resposta'),
      };
    });

    const avaliadas = doPeriodo.filter((f) => f.nota !== null);
    const resolvidosTotal = doPeriodo.filter((f) => MOTIVOS[f.motivo].sucesso).length;
    const nota5 = media(avaliadas.map((f) => f.nota)) / 2;
    const tempoMedio = media(doPeriodo.map((f) => f.minutos));
    const tempoAval = media(avaliadas.map((f) => f.minutosAval));
    const mediaDim = (campo) => (ranking.length ? Number((soma(ranking.map((d) => d.dims[campo])) / ranking.length).toFixed(2)) : 0);
    const geral = ranking.length ? Number((soma(ranking.map((d) => d.score)) / ranking.length).toFixed(2)) : 0;
    const unicos = (lista) => [...new Set(lista)].sort((a, b) => a.localeCompare(b));

    return {
      key: 'monitoring',
      title: 'Monitoramento',
      description: 'Atendimentos finalizados, qualidade e motivos de finalização.',
      kpis: [
        { id: 'closed_total', label: 'Atendimentos finalizados', value: doPeriodo.length },
        { id: 'rated_total', label: 'Avaliações respondidas', value: avaliadas.length },
        { id: 'resolved_total', label: 'Resolvidos', value: resolvidosTotal },
        { id: 'resolved_rate', label: 'Taxa de resolução', value: Number(percent(resolvidosTotal, doPeriodo.length).toFixed(1)), unit: '%' },
        { id: 'avg_rating_5', label: 'Avaliação média', value: Number(nota5.toFixed(2)), unit: '/5' },
        { id: 'avg_time_minutes', label: 'Tempo médio', value: Number(tempoMedio.toFixed(2)), unit: 'min' },
        { id: 'avg_rating_response_minutes', label: 'Tempo até avaliação', value: Number(tempoAval.toFixed(2)), unit: 'min' },
      ],
      charts: {
        primary: grafico('Qualidade por dimensão', 'radar', ['Satisfação', 'Cobertura', 'Resolução', 'Agilidade', 'Retorno'],
          ranking.map((d) => ({ label: d.nome.split(' ')[0], data: [d.dims.satisfacao, d.dims.cobertura, d.dims.resolucao, d.dims.agilidade, d.dims.retorno] }))),
        secondary: grafico('Evolução dos motivos', 'line', evolucao.map((e) => e.date), [
          { label: 'Resolvido', data: evolucao.map((e) => e.resolvido) },
          { label: 'Sem resposta', data: evolucao.map((e) => e.semResposta) },
          { label: 'Desistiu', data: evolucao.map((e) => e.desistiu) },
          { label: 'Transferido', data: evolucao.map((e) => e.transferido) },
          { label: 'Spam', data: evolucao.map((e) => e.spam) },
          { label: 'Outro', data: evolucao.map((e) => e.outro) },
        ]),
      },
      extras: {
        performance_rows: desempenho,
        report_rows: relatorio,
        quality_ranking: ranking,
        quality_dimension_averages: [
          { label: 'Satisfação', avg: mediaDim('satisfacao'), max: 5 },
          { label: 'Cobertura', avg: mediaDim('cobertura'), max: 5 },
          { label: 'Resolução', avg: mediaDim('resolucao'), max: 5 },
          { label: 'Agilidade', avg: mediaDim('agilidade'), max: 5 },
          { label: 'Retorno', avg: mediaDim('retorno'), max: 5 },
        ],
        quality_overall: geral,
        motivos_data: motivos,
        motivos_total: motivosTotal,
        success_reasons_configured: 2,
        report_total: doPeriodo.length,
        report_limit: 400,
        report_has_more: false,
        avg_time_minutes_all_closed: Number(tempoMedio.toFixed(2)),
        avg_rating_response_minutes: Number(tempoAval.toFixed(2)),
        motivos_by_user: porUsuario,
        evolucao_motivos: evolucao,
        insights: [],
        filter_options: {
          motivos: unicos(relatorio.map((l) => l.motivo)),
          filas: unicos(relatorio.map((l) => l.fila)),
          usuarios: unicos(relatorio.map((l) => l.usuario)),
        },
      },
    };
  }

  function secaoCanais(ctx) {
    return {
      key: 'channels',
      title: 'Canais',
      description: 'Instâncias por canal e estabilidade operacional.',
      kpis: [
        { id: 'instances_total', label: 'Instâncias', value: instancias.length },
        { id: 'connected', label: 'Conectadas', value: instancias.length },
        { id: 'disconnected', label: 'Desconectadas/Erro', value: 0 },
        { id: 'status_events', label: 'Eventos de status', value: 2 },
        { id: 'stability', label: 'Estabilidade', value: 100, unit: '%' },
      ],
      charts: {
        primary: grafico('Instâncias por canal', 'bar', ['whatsapp'], [{ label: 'Instâncias', data: [instancias.length] }]),
        secondary: grafico('Estabilidade', 'line', ctx.buckets.map((b) => b.label), [
          { label: 'Conectadas', data: ctx.buckets.map(() => 0) },
          { label: 'Desconectadas/Erro', data: ctx.buckets.map(() => 0) },
        ]),
      },
    };
  }

  function secaoUsuarios(ctx) {
    return {
      key: 'users',
      title: 'Usuários',
      description: 'Atividade da equipe e distribuição por role.',
      kpis: [
        { id: 'active_members', label: 'Membros ativos (15 min)', value: 2 },
        { id: 'active_sessions', label: 'Sessões ativas', value: 2 },
        { id: 'total_members', label: 'Membros totais', value: usuarios.length },
        { id: 'new_members', label: 'Novos membros', value: 0 },
      ],
      charts: {
        primary: grafico('Usuários ativos', 'line', ctx.buckets.map((b) => b.label), [{ label: 'Usuários', data: ctx.buckets.map(() => 2) }]),
        secondary: grafico('Membros por papel', 'doughnut', ['owner', 'admin', 'member'], [{ label: 'Membros', data: [1, 1, 1] }]),
      },
    };
  }

  function secaoPlano() {
    // Plano Médio (office): limites ilustrativos, só para o contrato ficar completo.
    const uso = [['Números WhatsApp', 2, 3], ['Contatos', contatos.length, 5000], ['Campanhas no mês', 2, 20], ['Colaboradores', usuarios.length, 5]];
    return {
      key: 'plan_usage',
      title: 'Uso do plano',
      description: 'Consumo dos limites do plano. Campanhas consideram o mês atual.',
      kpis: [{ id: 'plan_name', label: 'Plano', value: 'Médio' }],
      charts: {
        primary: grafico('Uso do plano', 'bar', uso.map(([n]) => n), [{ label: '% uso', data: uso.map(([, u, l]) => percent(u, l)) }]),
        secondary: grafico('Consumo x limite', 'bar', uso.map(([n]) => n), [
          { label: 'Consumido', data: uso.map(([, u]) => u) },
          { label: 'Limite', data: uso.map(([, , l]) => l) },
        ]),
      },
    };
  }

  function painel(range) {
    const ctx = contexto(range);
    const chat = secaoChat(ctx);
    const campaigns = secaoCampanhas(ctx);
    const automations = secaoAutomacoes(ctx);
    const valor = (secao, id) => secao.kpis.find((k) => k.id === id)?.value;
    return {
      global_summary: {
        range,
        generated_at: new Date().toISOString(),
        total_messages_range: valor(chat, 'total_messages'),
        active_users: 2,
        active_campaigns: valor(campaigns, 'active_campaigns'),
        active_workflows: valor(automations, 'active_workflows'),
      },
      sections: {
        chat,
        kanban: secaoKanban(ctx),
        tasks: secaoTarefas(ctx),
        campaigns,
        automations,
        monitoring: secaoMonitoramento(ctx),
        channels: secaoCanais(ctx),
        users: secaoUsuarios(ctx),
        plan_usage: secaoPlano(),
      },
    };
  }

  /** Snapshot da sub-aba Horários (getChatHoursSnapshot). */
  function horarios(range) {
    const ctx = contexto(range);
    const mensagensDia = recebidasDia.map((v, i) => v + enviadasDia[i]);
    // Conversas num dia: nunca mais que as do período inteiro (hoje: 9).
    const conversasDia = mensagensDia.map((v) => Math.min(conversas.length, FIXOS.conversas[range], Math.round(v / 4)));
    const total = soma(ctx.dias.map((i) => mensagensDia[i]));
    const pesos = PESO_HORA.map((p, h) => (range === 'today' && h > horaAtual ? 0 : p));
    const msgsHora = repartir(total, pesos);
    const totalDias = Math.max(1, Math.ceil((agora - ctx.inicio) / DIA) + 1);
    // Conversas distintas naquela hora do dia: cresce com as mensagens, mas satura no
    // total de conversas do período (é sempre a mesma carteira de clientes).
    const convHora = msgsHora.map((v) => Math.round(FIXOS.conversas[range] * (1 - Math.exp(-v / (2 * totalDias)))));
    const nomesDia = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const porSemana = nomesDia.map(() => 0);
    ctx.dias.forEach((i) => { porSemana[inicioDoDia(i).getDay()] += conversasDia[i]; });
    const pico = ctx.dias.reduce((melhor, i) => (conversasDia[i] > conversasDia[melhor] ? i : melhor), ctx.dias[0]);
    const horaPico = convHora.reduce((melhor, v, h) => (v > convHora[melhor] ? h : melhor), 0);

    // Conversas distintas por mês (somar dias contaria o mesmo cliente várias vezes).
    const meses = new Map();
    ctx.dias.forEach((i) => {
      const d = inicioDoDia(i);
      const chave = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      meses.set(chave, (meses.get(chave) || 0) + conversasDia[i]);
    });
    const formato = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' });
    const mensal = [...meses.entries()].map(([chave, somaDias]) => {
      const [ano, mes] = chave.split('-').map(Number);
      const rotulo = formato.format(new Date(ano, mes - 1, 1)).replace('.', '');
      return {
        month: chave,
        label: rotulo.charAt(0).toUpperCase() + rotulo.slice(1),
        count: Math.min(FIXOS.conversas[range], Math.round(26 * (1 - Math.exp(-somaDias / 60)))),
      };
    });

    return {
      generated_at: new Date().toISOString(),
      range,
      timezone: 'America/Sao_Paulo',
      filters: {
        selected: { instance_id: null, queue_status: null, assigned_user_id: null },
        options: {
          instances: instancias.map((i) => ({ id: i.id, label: i.label })),
          queues: [{ id: 'accepted', label: 'accepted' }, { id: 'pending', label: 'pending' }],
          users: usuarios.map((u) => ({ id: u.user_id, label: u.display_name })).sort((a, b) => a.label.localeCompare(b.label)),
        },
      },
      hourly_messages: msgsHora.map((count, hour) => ({ hour, label: `${pad(hour)}h`, count })),
      hourly_conversations: convHora.map((count, hour) => ({ hour, label: `${pad(hour)}h`, count })),
      weekday_conversations: nomesDia.map((label, day) => ({ day, label, count: porSemana[day] })),
      monthly_conversations: mensal,
      peaks: {
        max_day_label: rotuloDia(inicioDoDia(pico)),
        max_day_conversations: conversasDia[pico],
        peak_hour_label: `${pad(horaPico)}h às ${pad((horaPico + 1) % 24)}h`,
        peak_hour_conversations: convHora[horaPico],
        avg_messages_per_peak_hour: convHora[horaPico] > 0 ? Number((msgsHora[horaPico] / totalDias).toFixed(1)) : 0,
      },
    };
  }

  const periodo = (busca) => (['today', '7d', '30d', '90d'].includes(busca.get('range')) ? busca.get('range') : '30d');

  mock.rota('GET', '/api/metrics/v2/dashboard', ({ busca }) => painel(periodo(busca)));
  mock.rota('GET', '/api/metrics/v2/chat/hours', ({ busca }) => horarios(periodo(busca)));
  mock.rota('GET', '/api/notifications/count', () => ({ count: 3 }));
  // Igual às outras telas: nenhuma tarefa nova atribuída (o selo da barra fica escondido).
  mock.rota('GET', '/api/tasks/assignments/unseen', () => ({ count: 0 }));
  mock.rota('GET', '/api/channels/meta/connection-alerts', () => ({ success: true, alerts: [] }));

  // "Últimas conversas" da Visão Geral: pede limit=8 com startDate/endDate. As conversas
  // são as de comum.js, mais recentes primeiro, só as que tiveram mensagem no período.
  mock.rota('GET', '/api/chats', ({ busca }) => {
    if (!busca.get('startDate')) return undefined;
    const inicio = Date.parse(busca.get('startDate'));
    const limite = Number(busca.get('limit') || 8);
    const lista = conversas
      .filter((c) => Date.parse(c.last_message_time) >= inicio)
      .sort((a, b) => Date.parse(b.last_message_time) - Date.parse(a.last_message_time))
      .slice(0, limite);
    return { success: true, chats: lista, total: lista.length };
  });

  // --- estados para o protótipo ----------------------------------------------------------
  /*
   * A captura normal guarda só a tela aberta. Para o protótipo trocar de aba e de período
   * sem backend, esta função percorre o app de verdade (seletor de período, abas, sub-abas
   * do Chat e o menu do usuário) e guarda cada estado num <template data-estado="...">
   * dentro de <div id="mockup-estados" hidden>. Os <canvas> viram <img> do mesmo jeito que
   * o capture.mjs faz. No fim, volta para 30 dias / Visão Geral.
   *
   *   node tools/capture/capture.mjs dashboard "/dashboard.html" 7000 \
   *     "js:window.__mockDashboard.capturarEstados()"
   */
  function canvasParaImagem(original, copia) {
    const vivos = [...original.querySelectorAll('canvas')];
    const copias = [...copia.querySelectorAll('canvas')];
    vivos.forEach((canvas, i) => {
      let dados;
      try { dados = canvas.toDataURL('image/webp', 0.9); } catch { return; }
      if (!dados || dados === 'data:,') return;
      const img = document.createElement('img');
      img.src = dados;
      for (const attr of canvas.attributes) {
        if (!['width', 'height'].includes(attr.name)) img.setAttribute(attr.name, attr.value);
      }
      const r = canvas.getBoundingClientRect();
      img.style.width = canvas.style.width || (r.width ? `${r.width}px` : '');
      img.style.height = canvas.style.height || (r.height ? `${r.height}px` : '');
      img.style.maxWidth = '100%';
      img.setAttribute('data-mockup-canvas', '');
      copias[i].replaceWith(img);
    });
  }

  async function capturarEstados() {
    const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const conteudo = document.getElementById('dashboard-session-content');
    const seletor = document.getElementById('dashboard-range');
    const caixa = document.createElement('div');
    caixa.id = 'mockup-estados';
    caixa.hidden = true;

    const guardar = (nome, origem) => {
      const copia = origem.cloneNode(true);
      canvasParaImagem(origem, copia);
      const tpl = document.createElement('template');
      tpl.dataset.estado = nome;
      tpl.innerHTML = copia.innerHTML;
      caixa.appendChild(tpl);
    };
    const clicar = async (seletorCss, ms = 1400) => {
      document.querySelector(seletorCss)?.click();
      await esperar(ms);
    };
    const mudarPeriodo = async (valor) => {
      seletor.value = valor;
      seletor.dispatchEvent(new Event('change', { bubbles: true }));
      await esperar(1400);
    };

    for (const valor of ['today', '7d', '30d', '90d']) {
      await mudarPeriodo(valor);
      for (const sessao of ['overview', 'chat', 'kanban', 'tarefas', 'campanhas', 'automacoes', 'monitoramento']) {
        await clicar(`button[data-session-key="${sessao}"]`);
        if (sessao !== 'chat') { guardar(`${valor}:${sessao}`, conteudo); continue; }
        for (const sub of ['relatorios', 'bot', 'horarios']) {
          await clicar(`[data-chat-subtab="${sub}"]`);
          guardar(`${valor}:chat-${sub}`, conteudo);
        }
        await clicar('[data-chat-subtab="relatorios"]', 300);
      }
    }

    // Menu do usuário: o conteúdo só existe com ele aberto.
    await clicar('[data-user-btn]', 300);
    const popover = document.querySelector('[data-user-popover]');
    if (popover) guardar('menu-usuario', popover);
    await clicar('[data-user-btn]', 300);

    await mudarPeriodo('30d');
    await clicar('button[data-session-key="overview"]', 1600);
    document.body.appendChild(caixa);
    return caixa.children.length;
  }

  window.__mockDashboard = { capturarEstados };

  // O dashboard.html do app traz uma CSP sem 'unsafe-inline': copiada para o protótipo, ela
  // bloquearia o bloco MOCKUP (script inline) sem erro visível. Aqui na captura ela já foi
  // aplicada; tirar a <meta> só evita que ela vá parar na página do protótipo.
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.remove();
  });

  // Gráficos em resolução dupla: a imagem fica nítida em tela retina (Mac, celular).
  // O Chart.js lê window.devicePixelRatio ao desenhar; o tamanho em CSS não muda.
  Object.defineProperty(window, 'devicePixelRatio', { get: () => 2, configurable: true });
})();
