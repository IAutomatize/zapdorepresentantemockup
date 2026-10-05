/* Rotas só da tela de Conversas (chats.html): histórico de mensagens. */
(function () {
  const mock = window.__mock;
  const { min } = mock;
  const { conversas } = mock.dados;

  let seq = 0;
  function msg(chat, quem, texto, minutos, extra) {
    seq += 1;
    const saida = quem === 'eu';
    const conversa = conversas.find((c) => c.id === chat);
    return Object.assign({
      id: `m-${chat}-${seq}`,
      chat_id: chat,
      content: texto,
      sender_type: saida ? 'user' : 'contact',
      sender_id: saida ? 'usr-ana' : conversa.contact_id,
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

  const mensagens = {
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
  for (const c of conversas) {
    if (!mensagens[c.id]) {
      mensagens[c.id] = [msg(c.id, 'ela', c.last_message, (mock.agora - Date.parse(c.last_message_time)) / 60_000)];
    }
  }
  mock.dados.mensagens = mensagens;

  mock.rota('GET', /^\/api\/chats\/([^/]+)\/messages$/, ({ params: [id] }) => ({ success: true, messages: mensagens[id] || [] }));
})();
