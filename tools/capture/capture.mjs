/**
 * Captura o DOM renderizado de uma página do app real (com a API mockada) e gera uma
 * versão estática, sem script nenhum, pronta para virar base de mockup.
 *
 *   node tools/capture/capture.mjs <nome> "<caminho da página>" [espera_ms]
 *   node tools/capture/capture.mjs chat "/chats.html?chat=c1"
 *
 * Saída em tools/capture/out/ (fora do git):
 *   <nome>.raw.html   DOM exatamente como o navegador renderizou
 *   <nome>.html       mesma coisa, limpa: sem <script>, caminhos relativos
 *   <nome>.png        print do estado capturado
 *
 * Nunca escreve na raiz do repositório: o mockup editado não é sobrescrito por acidente.
 * Para começar uma tela nova, copie out/<nome>.html para a raiz à mão.
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

const [, , nome, pagina, esperaArg] = process.argv;
if (!nome || !pagina) {
  console.error('uso: node tools/capture/capture.mjs <nome> "<caminho da página>" [espera_ms]');
  process.exit(1);
}
const ESPERA = Number(esperaArg || 7000);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function alvoDaPagina() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const alvos = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json`)).json();
      const pagina = alvos.find((a) => a.type === 'page');
      if (pagina) return pagina.webSocketDebuggerUrl;
    } catch { /* Chrome ainda subindo */ }
    await dormir(200);
  }
  throw new Error('Chrome não abriu a porta de depuração');
}

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
    .replace(/(src|href)="\/(?!\/)/g, '$1="');
}

const main = async () => {
  mkdirSync(SAIDA, { recursive: true });
  const servidor = spawn(process.execPath, [join(AQUI, 'server.mjs'), String(PORTA_APP)], { stdio: 'inherit' });
  const perfil = mkdtempSync(join(tmpdir(), 'zap-mockup-chrome-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`,
    '--window-size=1600,1000', 'about:blank',
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
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
      return r.result.value;
    };

    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Page.navigate', { url: `http://127.0.0.1:${PORTA_APP}${pagina}` });
    await dormir(ESPERA);

    const bruto = await avaliar('"<!DOCTYPE html>\\n" + document.documentElement.outerHTML');
    const naoAtendidas = await avaliar('JSON.stringify([...new Set(window.__mockNaoAtendidas || [])])');
    const print = await cdp('Page.captureScreenshot', { format: 'png' });

    writeFileSync(join(SAIDA, `${nome}.raw.html`), bruto);
    writeFileSync(join(SAIDA, `${nome}.html`), limpar(bruto));
    writeFileSync(join(SAIDA, `${nome}.png`), Buffer.from(print.data, 'base64'));

    console.log(`\n${nome}: ${bruto.length} bytes → tools/capture/out/${nome}.{raw.html,html,png}`);
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
