/*
 * Rotas só da tela de Tarefas (tasks.html): tarefas e projetos internos da equipe
 * (Ana, Carla e Bruno) de um escritório de representação comercial.
 *
 * Formato igual ao do backend (tasks.controller.ts → TaskService.mapTask): snake_case,
 * status do front (pending, in_progress, completed, cancelled) e due_date só com a data.
 * Na listagem o backend devolve só o anexo mais recente de cada tarefa.
 */
(function () {
  const mock = window.__mock;
  const { agora, dias } = mock;
  const { usuarios } = mock.dados;

  /** 'AAAA-MM-DD' de hoje + `d` dias (negativo = passado), no fuso local. */
  function data(d) {
    const x = new Date(agora + d * 86_400_000);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  }
  const nome = (id) => usuarios.find((u) => u.user_id === id)?.name;

  const projetos = [
    ['prj-rotina', 'Rotina comercial', '#4A6FA5', 'Follow-ups, cobranças e pedidos da semana.', 200],
    ['prj-natal', 'Campanha de Natal', '#F56565', 'Kits e displays de fim de ano para mercados e padarias.', 40],
    ['prj-reativar', 'Reativação de clientes', '#F6AD55', 'Clientes sem pedido há mais de 90 dias.', 25],
    ['prj-litoral', 'Expansão Litoral', '#48BB78', 'Novos pontos de venda em Santos e na Baixada Santista.', 18],
  ].map(([id, name, color, description, criado]) => ({
    id, name, color, description, status: 'active', created_by: 'usr-ana',
    created_at: dias(criado), updated_at: dias(Math.min(criado, 3)),
  }));

  let seqAnexo = 0;
  function anexo(tarefa, arquivo, mime, tamanho, d) {
    seqAnexo += 1;
    return {
      id: `anx-${seqAnexo}`,
      taskId: tarefa,
      userId: 'usr-ana',
      accountId: 'acc-demo',
      filename: `${tarefa}-${seqAnexo}-${arquivo}`,
      originalName: arquivo,
      mimeType: mime,
      fileSize: tamanho,
      filePath: `https://arquivos.exemplo.com.br/tarefas/${arquivo}`,
      createdAt: dias(d),
    };
  }
  const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  // [id, título, descrição, status, prioridade, responsável, projeto, vencimento (dias a partir
  //  de hoje; null = sem prazo), criada há N dias, anexos]
  const base = [
    ['t-01', 'Enviar tabela de atacado para Fernanda Oliveira', 'Loja nova em Osasco, chegou pelo Instagram. Mandar tabela e pedido mínimo.', 'pending', 'high', 'usr-bruno', 'prj-rotina', 0, 1],
    ['t-02', 'Responder proposta de 8% do Atacadão do Vale', 'Volume de 200 caixas. Confirmar a margem com a fábrica até quarta.', 'in_progress', 'urgent', 'usr-bruno', 'prj-rotina', 1, 2],
    ['t-03', 'Cobrar boleto vencido da Padaria Estrela', 'Pedido 2198, vencido desde o dia 28. Mandar a segunda via.', 'pending', 'urgent', 'usr-carla', 'prj-rotina', -3, 6],
    ['t-04', 'Visitar a Distribuidora Litoral em Santos', 'Apresentar o display novo e combinar entregas às terças e quintas.', 'pending', 'high', 'usr-ana', 'prj-litoral', 3, 5],
    ['t-05', 'Montar kits de Natal para supermercados', 'Definir o mix de biscoitos e panetones com o fornecedor.', 'in_progress', 'high', 'usr-ana', 'prj-natal', 10, 12,
      [['Kits_Natal_2026.xlsx', XLSX, 48_640, 4]]],
    ['t-06', 'Enviar o catálogo de outubro ao Empório Central', 'Pediram o catálogo novo pelo WhatsApp.', 'completed', 'medium', 'usr-ana', 'prj-rotina', -1, 3],
    ['t-07', 'Fechar contrato trimestral com a Rede Econômica', 'Preço mantido por 3 meses. Falta a minuta assinada pelo setor de compras.', 'in_progress', 'urgent', 'usr-carla', 'prj-rotina', 4, 9,
      [['Minuta_Contrato_Rede_Economica.docx', DOCX, 86_016, 2]]],
    ['t-08', 'Ligar para Ricardo Santos (sem pedido há 4 meses)', 'Oferecer condição especial de retorno no primeiro pedido.', 'pending', 'medium', 'usr-bruno', 'prj-reativar', -1, 8],
    ['t-09', 'Reativar a Mercearia São José', 'Último pedido em maio. Verificar se trocou de fornecedor.', 'pending', 'low', 'usr-bruno', 'prj-reativar', 6, 8],
    ['t-10', 'Lançar o pedido da semana do Supermercado Avenida', 'Mesmas quantidades da semana passada (planilha em anexo).', 'completed', 'high', 'usr-carla', 'prj-rotina', 0, 1,
      [['Pedido_Semana_41.xlsx', XLSX, 22_528, 0]]],
    ['t-11', 'Prospectar 10 mercados em São Vicente e Guarujá', 'Levantar contatos e agendar visitas para novembro.', 'pending', 'medium', 'usr-ana', 'prj-litoral', 14, 4],
    ['t-12', 'Atualizar a tabela de preços com o reajuste dos biscoitos', 'Reajuste de 4% na linha de biscoitos, válido a partir de 1º de outubro.', 'completed', 'high', 'usr-ana', null, -4, 10],
    ['t-13', 'Separar amostras dos lançamentos para Patrícia Gomes', 'Cliente VIP. Levar na próxima visita a Campinas.', 'pending', 'low', 'usr-carla', null, 7, 2],
    ['t-14', 'Criar display de balcão para padarias', 'O fornecedor desistiu do modelo de papelão. Aguardar novo orçamento.', 'cancelled', 'low', null, 'prj-natal', -6, 20],
    ['t-15', 'Confirmar prazo de entrega para Santos', 'Responder à Distribuidora Litoral: 3 dias úteis.', 'completed', 'medium', 'usr-ana', 'prj-litoral', -2, 3],
    ['t-16', 'Revisar as metas de vendas do 4º trimestre', 'Comparar com o mesmo período do ano passado, por cliente.', 'pending', 'medium', null, null, null, 6],
    ['t-17', 'Enviar a segunda via do boleto ao Pedro Almeida', 'Pedido 2231, vencimento dia 15.', 'completed', 'low', 'usr-ana', 'prj-rotina', -1, 2],
  ];

  const tarefas = base.map(([id, title, description, status, priority, resp, projeto, vence, criada, anexos = []]) => {
    const p = projetos.find((x) => x.id === projeto);
    return {
      id, title, description, status, priority,
      project_id: p ? p.id : undefined,
      project_name: p ? p.name : undefined,
      project_color: p ? p.color : undefined,
      assigned_to: resp || undefined,
      assigned_to_name: resp ? nome(resp) : undefined,
      created_by: 'usr-ana',
      created_by_name: 'Ana Souza',
      due_date: vence == null ? undefined : data(vence),
      tags: [],
      created_at: dias(criada),
      updated_at: dias(Math.max(0, criada - 1)),
      completed_at: status === 'completed' ? dias(Math.max(0, -(vence ?? 0))) : undefined,
      // Listagem: só o mais recente.
      attachments: anexos.slice(-1).map(([arquivo, mime, tamanho, d]) => anexo(id, arquivo, mime, tamanho, d)),
    };
  });
  mock.dados.tarefas = tarefas;
  mock.dados.projetos = projetos;

  function comProjeto(t, corpo) {
    const p = projetos.find((x) => x.id === corpo.project_id);
    return Object.assign(t, {
      project_id: p ? p.id : undefined, project_name: p ? p.name : undefined, project_color: p ? p.color : undefined,
      assigned_to: corpo.assigned_to || undefined, assigned_to_name: corpo.assigned_to ? nome(corpo.assigned_to) : undefined,
    });
  }

  mock.rota('GET', '/api/tasks', () => ({
    success: true, tasks: tarefas, pagination: { total: tarefas.length, page: 1, limit: 50 }, stats: {},
  }));
  mock.rota('GET', /^\/api\/tasks\/(t-[^/]+)$/, ({ params: [id] }) => {
    const t = tarefas.find((x) => x.id === id);
    return t ? { success: true, task: t } : mock.json({ error: 'Tarefa não encontrada' }, 404);
  });
  mock.rota('POST', '/api/tasks', ({ corpo }) => {
    const t = comProjeto({
      id: `t-${tarefas.length + 1}`, title: corpo.title, description: corpo.description, status: corpo.status || 'pending',
      priority: corpo.priority || 'medium', created_by: 'usr-ana', created_by_name: 'Ana Souza', due_date: corpo.due_date,
      tags: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), attachments: [],
    }, corpo);
    tarefas.push(t);
    return mock.json({ success: true, task: t }, 201);
  });
  mock.rota('PUT', /^\/api\/tasks\/(t-[^/]+)$/, ({ params: [id], corpo }) => {
    const t = tarefas.find((x) => x.id === id);
    if (!t) return mock.json({ error: 'Tarefa não encontrada' }, 404);
    Object.assign(t, corpo, { updated_at: new Date().toISOString() });
    if ('project_id' in corpo || 'assigned_to' in corpo) comProjeto(t, corpo);
    return { success: true, task: t };
  });
  mock.rota('DELETE', /^\/api\/tasks\/(t-[^/]+)$/, ({ params: [id] }) => {
    const i = tarefas.findIndex((x) => x.id === id);
    if (i >= 0) tarefas.splice(i, 1);
    return { success: true, message: 'Tarefa deletada com sucesso' };
  });
  mock.rota('GET', '/api/projects', () => ({
    success: true, projects: projetos, pagination: { total: projetos.length, page: 1, limit: 50 },
  }));
  mock.rota('POST', '/api/projects', ({ corpo }) => {
    const p = {
      id: `prj-${projetos.length + 1}`, name: corpo.name, description: corpo.description, color: corpo.color,
      status: 'active', created_by: 'usr-ana', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    projetos.push(p);
    return mock.json({ success: true, project: p, message: 'Projeto criado com sucesso' }, 201);
  });

  // Barra lateral (badge de tarefas novas) e a marca de "vistas" que a tela grava ao abrir.
  mock.rota('GET', '/api/tasks/assignments/unseen', () => ({ success: true, count: 0 }));
  mock.rota('POST', '/api/tasks/assignments/seen', () => ({ success: true }));
  mock.rota('GET', '/api/channels/meta/connection-alerts', () => ({ alerts: [] }));
})();
