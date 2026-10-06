/*
 * Comportamento comum a todas as páginas do protótipo. Carregado no <head> (o capture.mjs
 * já inclui), para o tema ser aplicado antes da primeira pintura.
 *
 * Cuida do que é igual em todas as telas: selo "Protótipo", avisos, menu lateral no
 * celular, botão de tema, "Sair", links para telas fora do protótipo e formulários (que
 * nunca recarregam a página). O comportamento de cada tela fica inline, no bloco MOCKUP
 * no fim do próprio .html.
 *
 * Para as páginas: window.mockup.avisar('texto') mostra um aviso rápido no rodapé.
 */
(function () {
  const PAGINAS = [
    'index.html', 'dashboard.html', 'chats.html', 'kanban.html', 'contacts.html', 'stories.html',
    'campaigns.html', 'agendadas.html', 'tasks.html', 'calendar.html', 'settings.html', 'ajuda.html',
    // Módulo de vendas (recursos novos 001 a 005, em aprovação)
    'clientes.html', 'pedidos.html', 'representadas.html',
  ];

  // Tema antes da pintura, com a mesma chave que o app usa.
  try {
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
  } catch { /* navegação privada: fica no claro */ }

  let timerAviso;
  function avisar(texto) {
    const el = document.getElementById('mockup-aviso');
    if (!el) return;
    el.textContent = texto;
    el.classList.add('visivel');
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => el.classList.remove('visivel'), 2400);
  }

  function paginaDoLink(href) {
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return { externo: true };
      return { arquivo: url.pathname.split('/').pop() || 'index.html', mesmaPagina: url.pathname === location.pathname };
    } catch {
      return {};
    }
  }

  function fecharMenuCelular() {
    document.body.classList.remove('mvp-sidebar-open');
    document.getElementById('mvp-sidebar-toggle')?.setAttribute('aria-expanded', 'false');
  }

  function montarSeloEAviso() {
    const estilo = document.createElement('style');
    estilo.textContent = `
      .mockup-selo {
        position: fixed; left: 12px; bottom: 12px; z-index: 9999;
        padding: 3px 10px; border-radius: 999px;
        background: rgba(15, 23, 42, .78); color: #fff;
        font: 600 11px/1.6 Inter, system-ui, sans-serif; letter-spacing: .04em; text-transform: uppercase;
        pointer-events: none;
      }
      @media (max-width: 768px) {
        .mockup-selo { left: auto; right: 12px; bottom: calc(84px + env(safe-area-inset-bottom)); }
      }
      .mockup-aviso {
        position: fixed; left: 50%; bottom: 24px; z-index: 2147483647; transform: translate(-50%, 12px);
        max-width: calc(100vw - 32px); padding: 10px 16px; border-radius: 10px;
        background: #0f172a; color: #fff; font: 500 13px/1.4 Inter, system-ui, sans-serif;
        opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s;
      }
      .mockup-aviso.visivel { opacity: 1; transform: translate(-50%, 0); }
      .mockup-novo {
        display: inline-flex; align-items: center; margin-left: 8px; padding: 1px 7px; border-radius: 999px;
        background: var(--ds-success-soft, rgba(22, 163, 74, .14)); color: var(--ds-success, #16a34a);
        font-size: 10px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; line-height: 1.5;
      }
    `;
    document.head.appendChild(estilo);

    const selo = document.createElement('div');
    selo.className = 'mockup-selo';
    selo.title = 'Protótipo para aprovação: nada aqui é salvo nem enviado';
    selo.textContent = 'Protótipo';
    const aviso = document.createElement('div');
    aviso.id = 'mockup-aviso';
    aviso.className = 'mockup-aviso';
    aviso.setAttribute('role', 'status');
    aviso.setAttribute('aria-live', 'polite');
    document.body.append(selo, aviso);
  }

  /**
   * Itens novos da barra lateral (módulo de vendas, em aprovação). A barra capturada do
   * app não tem essas telas: o item é clonado de um existente, para manter a marcação,
   * e ganha o selo "Novo". Entram logo depois de Contatos.
   */
  const ITENS_NOVOS = [
    { href: 'clientes.html', rotulo: 'Clientes', icone: 'ri-store-2-line' },
    { href: 'pedidos.html', rotulo: 'Pedidos', icone: 'ri-file-list-3-line' },
    { href: 'representadas.html', rotulo: 'Representadas', icone: 'ri-building-2-line' },
  ];
  function montarItensNovosDaBarra() {
    const nav = document.querySelector('#mvp-sidebar nav');
    const referencia = nav?.querySelector('a.sidebar-item[href="contacts.html"]');
    if (!nav || !referencia || nav.querySelector('[data-mockup-novo]')) return;
    const atual = location.pathname.split('/').pop() || 'index.html';
    let depois = referencia;
    for (const item of ITENS_NOVOS) {
      const a = referencia.cloneNode(true);
      a.setAttribute('href', item.href);
      a.setAttribute('title', item.rotulo);
      a.setAttribute('aria-label', item.rotulo);
      a.setAttribute('data-mockup-novo', '');
      a.classList.toggle('sidebar-item-active', atual === item.href);
      a.querySelector('i').className = item.icone;
      const rotulo = a.querySelector('.sidebar-label');
      rotulo.textContent = item.rotulo;
      const selo = document.createElement('span');
      selo.className = 'mockup-novo';
      selo.textContent = 'Novo';
      rotulo.append(selo);
      depois.after(a);
      depois = a;
    }
    // Numa tela nova, nenhum item antigo fica marcado como atual.
    if (ITENS_NOVOS.some((i) => i.href === atual)) {
      nav.querySelectorAll('a.sidebar-item:not([data-mockup-novo])').forEach((a) => a.classList.remove('sidebar-item-active'));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    montarSeloEAviso();
    montarItensNovosDaBarra();

    // Formulário nunca recarrega a página; a tela trata o envio no próprio script.
    document.addEventListener('submit', (ev) => ev.preventDefault(), true);

    document.addEventListener('click', (ev) => {
      const alvo = ev.target;

      // Menu lateral no celular (mesmas classes do app).
      const botaoMenu = alvo.closest('#mvp-sidebar-toggle');
      if (botaoMenu) {
        const aberto = !document.body.classList.contains('mvp-sidebar-open');
        document.body.classList.toggle('mvp-sidebar-open', aberto);
        botaoMenu.setAttribute('aria-expanded', String(aberto));
        return;
      }
      if (alvo.closest('#mvp-sidebar-backdrop, .mvp-sidebar-close')) { fecharMenuCelular(); return; }

      if (alvo.closest('#mvp-theme-trigger')) {
        const escuro = document.documentElement.classList.toggle('dark');
        try { localStorage.setItem('theme', escuro ? 'dark' : 'light'); } catch { /* ignora */ }
        return;
      }
      if (alvo.closest('#mvp-logout-trigger')) { avisar('Sair não faz parte do protótipo'); return; }

      const link = alvo.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      const destino = paginaDoLink(href);
      if (destino.externo) return;
      if (link.closest('.sidebar-item, a.sidebar-item') || link.classList.contains('sidebar-item')) fecharMenuCelular();
      if (!PAGINAS.includes(destino.arquivo)) {
        ev.preventDefault();
        avisar('Essa tela não faz parte deste protótipo');
      }
    });

    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') fecharMenuCelular();
    });
  });

  window.mockup = { avisar, paginas: PAGINAS };
})();
