/*
 * Núcleo do mock da API usado na captura. Roda ANTES de qualquer script do app e troca o
 * fetch por um registro de rotas. As respostas ficam em tools/capture/fixtures/:
 *
 *   comum.js      universo fictício compartilhado (conta, contatos, conversas, Kanban...)
 *   <pagina>.js   rotas só daquela página (dashboard.js, kanban.js...)
 *
 * O servidor injeta este arquivo, depois comum.js, depois o da página. Rota registrada
 * por último vence, então a página pode sobrescrever uma rota comum.
 *
 * Toda rota sem resposta devolve um vazio e fica em __mock.naoAtendidas, que o
 * capture.mjs imprime no fim.
 */
(function () {
  const agora = Date.now();
  const rotas = [];

  const mock = {
    agora,
    /** ISO de `m` minutos atrás. */
    min: (m) => new Date(agora - m * 60_000).toISOString(),
    /** ISO de `d` dias atrás (negativo = no futuro). */
    dias: (d) => new Date(agora - d * 86_400_000).toISOString(),
    /** Dados compartilhados entre os arquivos de fixture. */
    dados: {},
    naoAtendidas: [],

    /**
     * Registra uma rota. `padrao` é o caminho exato ('/api/chats') ou uma RegExp sobre o
     * caminho (grupos viram `params`). `metodo` pode ser '*'. O handler recebe
     * { url, busca, metodo, params, corpo } e devolve um objeto (vira JSON 200), um
     * Response pronto, ou undefined para deixar a próxima rota responder.
     */
    rota(metodo, padrao, handler) {
      rotas.push({ metodo: metodo.toUpperCase(), padrao, handler });
    },

    json(corpo, status = 200) {
      return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
    },

    /** Stream SSE que avisa "connected" e fica aberto para sempre. */
    stream() {
      return new Response(new ReadableStream({
        start(ctrl) { ctrl.enqueue(new TextEncoder().encode('data: {"type":"connected"}\n\n')); },
      }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    },
  };
  window.__mock = mock;

  function lerCorpo(corpo) {
    if (!corpo || typeof corpo !== 'string') return corpo || null;
    try { return JSON.parse(corpo); } catch { return corpo; }
  }

  function responder(url, metodo, corpo) {
    const caminho = url.pathname;
    for (let i = rotas.length - 1; i >= 0; i -= 1) {
      const r = rotas[i];
      if (r.metodo !== '*' && r.metodo !== metodo) continue;
      let params = null;
      if (typeof r.padrao === 'string') {
        if (r.padrao !== caminho) continue;
        params = [];
      } else {
        const m = caminho.match(r.padrao);
        if (!m) continue;
        params = m.slice(1);
      }
      const saida = r.handler({ url, busca: url.searchParams, metodo, params, corpo: lerCorpo(corpo) });
      if (saida === undefined) continue;
      return saida instanceof Response ? saida : mock.json(saida);
    }
    return null;
  }

  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async function (entrada, opcoes) {
    const url = new URL(typeof entrada === 'string' ? entrada : entrada.url, location.origin);
    const metodo = String((opcoes && opcoes.method) || (entrada && entrada.method) || 'GET').toUpperCase();
    const ehApi = url.origin === location.origin
      && (url.pathname.startsWith('/api/') || ['/me', '/logout', '/refresh'].includes(url.pathname));
    if (!ehApi) return fetchOriginal(entrada, opcoes);

    if (/\/stream$/.test(url.pathname)) return mock.stream();
    const resposta = responder(url, metodo, opcoes && opcoes.body);
    if (resposta) return resposta;
    mock.naoAtendidas.push(`${metodo} ${url.pathname}`);
    return mock.json(metodo === 'GET' ? { success: true, data: [] } : { success: true });
  };

  // Nenhuma página deveria abrir EventSource, mas se abrir, fica registrado e mudo.
  window.EventSource = class {
    constructor(u) { this.url = u; this.readyState = 1; mock.naoAtendidas.push(`SSE ${u}`); }
    addEventListener() {}
    removeEventListener() {}
    close() { this.readyState = 2; }
  };

  // Compatibilidade com o capture.mjs, que lê esta lista.
  Object.defineProperty(window, '__mockNaoAtendidas', { get: () => mock.naoAtendidas });
})();
