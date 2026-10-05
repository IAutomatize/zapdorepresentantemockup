/**
 * Servidor estático da captura: serve os arquivos do app (zap-empresarial) como estão e
 * injeta o mock da API como PRIMEIRO script de qualquer .html. Não há backend: toda
 * chamada a /api e /me é respondida dentro da página pelo mock-api.js.
 *
 *   node tools/capture/server.mjs [porta]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP = resolve(process.env.APP_DIR || join(AQUI, '..', '..', '..', 'zap-empresarial'));
const MOCK = join(AQUI, 'mock-api.js');
const PORTA = Number(process.argv[2] || 47913);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);

  if (caminho === '/__mock/mock-api.js') {
    res.writeHead(200, { 'Content-Type': TIPOS['.js'], 'Cache-Control': 'no-store' });
    res.end(await readFile(MOCK));
    return;
  }

  let arquivo = normalize(join(APP, caminho));
  if (!arquivo.startsWith(APP)) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(arquivo)).isDirectory()) arquivo = join(arquivo, 'index.html');
  } catch {
    // Mesmo fallback do Express: /chats serve chats.html
    arquivo = `${arquivo}.html`;
  }

  try {
    let corpo = await readFile(arquivo);
    const tipo = TIPOS[extname(arquivo)] || 'application/octet-stream';
    if (extname(arquivo) === '.html') {
      corpo = Buffer.from(String(corpo).replace(/<head>/i, '<head><script src="/__mock/mock-api.js"></script>'));
    }
    res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
    res.end(corpo);
  } catch {
    res.writeHead(404).end();
  }
}).listen(PORTA, '127.0.0.1', () => {
  console.log(`captura: servindo ${APP} em http://127.0.0.1:${PORTA}`);
});
