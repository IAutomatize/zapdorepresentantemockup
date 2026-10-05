/**
 * Captura o DOM renderizado de uma página do app real (com a API mockada) e gera uma
 * versão estática, sem script do app, pronta para virar base de mockup.
 *
 *   node tools/capture/capture.mjs <nome> "<caminho da página>" [espera_ms] [ações...]
 *
 *   node tools/capture/capture.mjs chats "/chats.html?chat=c1"
 *   node tools/capture/capture.mjs settings "/settings.html" 7000 @[data-tab=tags] ~1500 @[data-tab=general]
 *
 * Ações, executadas em ordem depois da espera inicial:
 *   @seletor   clica no primeiro elemento que casa com o seletor CSS
 *   ~ms        espera
 *   js:expr    avalia uma expressão na página
 *
 * Saída em tools/capture/out/ (fora do git):
 *   <nome>.raw.html   DOM exatamente como o navegador renderizou
 *   <nome>.html       limpo: sem <script> do app, caminhos relativos, canvas virou imagem,
 *                     com o mockup-comum.js no <head>
 *   <nome>.png        print do estado capturado
 *
 * Nunca escreve na raiz: para montar ou atualizar a página use tools/capture/montar.mjs.
 *
 * Portas por variável, para rodar várias capturas ao mesmo tempo:
 *   PORTA_APP (padrão 47913) e PORTA_CDP (padrão 9333).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SAIDA = join(AQUI, 'out');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORTA_APP = Number(process.env.PORTA_APP || 47913);
const PORTA_CDP = Number(process.env.PORTA_CDP || 9333);
const LARGURA = Number(process.env.LARGURA || 1600);
const ALTURA = Number(process.env.ALTURA || 1000);

const [, , nome, pagina, esperaArg, ...acoes] = process.argv;
if (!nome || !pagina) {
  console.error('uso: node tools/capture/capture.mjs <nome> "<caminho da página>" [espera_ms] [ações...]');
  process.exit(1);
}
const ESPERA = Number(esperaArg || 7000);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function alvoDaPagina() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const alvos = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json`)).json();
      const alvo = alvos.find((a) => a.type === 'page');
      if (alvo) return alvo.webSocketDebuggerUrl;
    } catch { /* Chrome ainda subindo */ }
    await dormir(200);
  }
  throw new Error('Chrome não abriu a porta de depuração');
}

/**
 * <canvas> não guarda o desenho no HTML: troca cada um por uma <img> com o mesmo desenho,
 * tamanho e classes. O gráfico fica estático (sem tooltip), mas idêntico ao do app.
 */
const CANVAS_PARA_IMAGEM = `(() => {
  let trocados = 0;
  for (const canvas of [...document.querySelectorAll('canvas')]) {
    let dados;
    try { dados = canvas.toDataURL('image/png'); } catch { continue; }
    if (!dados || dados === 'data:,') continue;
    const img = document.createElement('img');
    img.src = dados;
    for (const attr of canvas.attributes) {
      if (!['width', 'height'].includes(attr.name)) img.setAttribute(attr.name, attr.value);
    }
    const r = canvas.getBoundingClientRect();
    img.style.width = canvas.style.width || (r.width ? r.width + 'px' : '');
    img.style.height = canvas.style.height || (r.height ? r.height + 'px' : '');
    img.style.maxWidth = '100%';
    img.setAttribute('data-mockup-canvas', '');
    canvas.replaceWith(img);
    trocados += 1;
  }
  return trocados;
})()`;

function limpar(html) {
  return html
    // Nenhum script do app vai para o mockup: o comportamento é escrito à mão, inline.
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]+rel="(manifest|apple-touch-icon|icon)"[^>]*>/gi, '')
    .replace(/<style[^>]*data-permissions-preload[^>]*>[\s\S]*?<\/style>/gi, '')
    // Comentários são notas internas do app; handlers inline chamam funções que não existem aqui.
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\son[a-z]+="[^"]*"/gi, '')
    // No GitHub Pages o site mora em /<repo>/: caminho absoluto quebraria.
    .replace(/(src|href)="\/(?!\/)/g, '$1="')
    // Comportamento comum (selo, menu do celular, tema, links) e favicon.
    .replace(/<\/head>/i, '<link rel="icon" href="favicon.svg">\n<script src="mockup-comum.js"></script>\n</head>');
}

const main = async () => {
  mkdirSync(SAIDA, { recursive: true });
  const servidor = spawn(process.execPath, [join(AQUI, 'server.mjs'), String(PORTA_APP)], { stdio: 'inherit' });
  const perfil = mkdtempSync(join(tmpdir(), 'zap-mockup-chrome-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`,
    `--window-size=${LARGURA},${ALTURA}`, 'about:blank',
  ], { stdio: 'ignore' });

  const encerrar = () => {
    chrome.kill();
    servidor.kill();
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ignora */ }
  };

  try {
    const ws = new WebSocket(await alvoDaPagina());
    await new Promise((ok, falha) => { ws.onopen = ok; ws.onerror = falha; });

    let id = 0;
    const pendentes = new Map();
    const erros = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pendentes.has(msg.id)) {
        const { ok, falha } = pendentes.get(msg.id);
        pendentes.delete(msg.id);
        if (msg.error) falha(new Error(msg.error.message)); else ok(msg.result);
        return;
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        erros.push(`exceção: ${d.exception?.description?.split('\n')[0] || d.text}`);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        erros.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200)}`);
      }
    };
    const cdp = (method, params = {}) => new Promise((ok, falha) => {
      id += 1;
      pendentes.set(id, { ok, falha });
      ws.send(JSON.stringify({ id, method, params }));
    });
    const avaliar = async (expression) => {
      const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };

    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Page.navigate', { url: `http://127.0.0.1:${PORTA_APP}${pagina}` });
    await dormir(ESPERA);

    for (const acao of acoes) {
      if (acao.startsWith('~')) {
        await dormir(Number(acao.slice(1)));
      } else if (acao.startsWith('@')) {
        const ok = await avaliar(`(() => { const el = document.querySelector(${JSON.stringify(acao.slice(1))}); if (!el) return false; el.click(); return true; })()`);
        if (!ok) console.error(`  !! ação sem alvo: ${acao}`);
        await dormir(800);
      } else if (acao.startsWith('js:')) {
        await avaliar(acao.slice(3));
        await dormir(300);
      } else {
        console.error(`  !! ação desconhecida: ${acao}`);
      }
    }

    const trocados = await avaliar(CANVAS_PARA_IMAGEM);
    const bruto = await avaliar('"<!DOCTYPE html>\\n" + document.documentElement.outerHTML');
    const naoAtendidas = await avaliar('JSON.stringify([...new Set(window.__mockNaoAtendidas || [])])');
    const print = await cdp('Page.captureScreenshot', { format: 'png' });

    writeFileSync(join(SAIDA, `${nome}.raw.html`), bruto);
    writeFileSync(join(SAIDA, `${nome}.html`), limpar(bruto));
    writeFileSync(join(SAIDA, `${nome}.png`), Buffer.from(print.data, 'base64'));

    console.log(`\n${nome}: ${bruto.length} bytes, ${trocados} canvas → imagem → tools/capture/out/${nome}.{raw.html,html,png}`);
    console.log(`rotas sem fixture: ${naoAtendidas}`);
    if (erros.length) console.log(`erros na página (${erros.length}):\n  ${[...new Set(erros)].join('\n  ')}`);
    ws.close();
  } finally {
    encerrar();
  }
};

main().catch((erro) => {
  console.error('falhou:', erro.message);
  process.exit(1);
});
