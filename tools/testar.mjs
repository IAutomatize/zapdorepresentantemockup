/**
 * Testa uma página do protótipo como o GitHub Pages serve (sob /zapdorepresentantemockup/):
 * erros de JavaScript, requisições com erro (404 de CSS, imagem...) e prints de
 * desktop e celular.
 *
 *   node tools/testar.mjs <pagina> [ações...]
 *   node tools/testar.mjs kanban
 *   node tools/testar.mjs settings "@[data-tab=tags]" ~500
 *
 * Ações (só no desktop, antes do print): @seletor clica, ~ms espera, js:expr avalia.
 * Prints em tools/capture/out/testes/<pagina>-desktop.png e <pagina>-celular.png.
 * Portas: PORTA_TESTE (padrão 47914) e PORTA_CDP_TESTE (padrão 9334).
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(RAIZ, 'tools', 'capture', 'out', 'testes');
const PREFIXO = '/zapdorepresentantemockup';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORTA = Number(process.env.PORTA_TESTE || 47914);
const PORTA_CDP = Number(process.env.PORTA_CDP_TESTE || 9334);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };

const [, , pagina, ...acoes] = process.argv;
if (!pagina) { console.error('uso: node tools/testar.mjs <pagina> [ações...]'); process.exit(1); }
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const servidor = createServer(async (req, res) => {
  let caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!caminho.startsWith(PREFIXO)) { res.writeHead(404).end(); return; }
  caminho = caminho.slice(PREFIXO.length) || '/';
  let arquivo = normalize(join(RAIZ, caminho));
  if (!arquivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(arquivo)).isDirectory()) arquivo = join(arquivo, 'index.html');
    res.writeHead(200, { 'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream' });
    res.end(await readFile(arquivo));
  } catch {
    res.writeHead(404).end();
  }
});

async function main() {
  mkdirSync(SAIDA, { recursive: true });
  await new Promise((ok) => servidor.listen(PORTA, '127.0.0.1', ok));
  const perfil = mkdtempSync(join(tmpdir(), 'zap-mockup-teste-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${PORTA_CDP}`,
    `--user-data-dir=${perfil}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });

  try {
    let wsUrl;
    for (let i = 0; i < 50 && !wsUrl; i += 1) {
      try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* subindo */ }
      if (!wsUrl) await dormir(200);
    }
    const ws = new WebSocket(wsUrl);
    await new Promise((ok) => { ws.onopen = ok; });
    let id = 0;
    const pendentes = new Map();
    const erros = [];
    const falhas = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); return; }
      if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] || m.params.exceptionDetails.text);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') erros.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
      if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) falhas.push(`${m.params.response.status} ${m.params.response.url}`);
      if (m.method === 'Network.loadingFailed' && !m.params.canceled) falhas.push(`falhou ${m.params.errorText} (${m.params.type})`);
    };
    const cdp = (method, params = {}) => new Promise((ok) => { id += 1; pendentes.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
    const avaliar = async (expression) => (await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
    const print = async (arquivo) => writeFileSync(join(SAIDA, arquivo), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
    const url = `http://127.0.0.1:${PORTA}${PREFIXO}/${pagina}.html`;

    await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
    await cdp('Page.navigate', { url });
    await dormir(2500);
    const titulo = await avaliar('document.title');
    for (const acao of acoes) {
      if (acao.startsWith('~')) await dormir(Number(acao.slice(1)));
      else if (acao.startsWith('@')) {
        const ok = await avaliar(`(() => { const el = document.querySelector(${JSON.stringify(acao.slice(1))}); if (!el) return false; el.click(); return true; })()`);
        if (!ok) erros.push(`ação sem alvo: ${acao}`);
        await dormir(500);
      } else if (acao.startsWith('js:')) { console.log(`  ${acao.slice(3, 60)} → ${JSON.stringify(await avaliar(acao.slice(3)))}`); }
    }
    await print(`${pagina}-desktop.png`);

    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp('Page.navigate', { url });
    await dormir(2500);
    await print(`${pagina}-celular.png`);

    console.log(`${pagina}: "${titulo}"`);
    console.log(`  erros de JS: ${erros.length ? '\n    ' + [...new Set(erros)].join('\n    ') : 'nenhum'}`);
    console.log(`  requisições com erro: ${falhas.length ? '\n    ' + [...new Set(falhas)].join('\n    ') : 'nenhuma'}`);
    console.log(`  prints: tools/capture/out/testes/${pagina}-desktop.png e -celular.png`);
    ws.close();
  } finally {
    chrome.kill();
    servidor.close();
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* ignora */ }
  }
}

main().catch((e) => { console.error('falhou:', e.message); process.exit(1); });
