/**
 * Monta (ou atualiza) a página do protótipo na raiz a partir da captura.
 *
 *   node tools/capture/montar.mjs <nome>
 *
 * Página = tools/capture/out/<nome>.html + o bloco MOCKUP inline no fim.
 *
 * - Se <nome>.html ainda não existe na raiz, cria com um bloco MOCKUP vazio.
 * - Se já existe, troca SÓ a parte capturada e preserva o bloco MOCKUP (tudo a partir de
 *   `<!-- MOCKUP:INICIO` até o </body>). É assim que se recaptura uma tela depois que o
 *   app mudou sem perder o comportamento escrito à mão.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const MARCA = '<!-- MOCKUP:INICIO';

const nome = process.argv[2];
if (!nome) {
  console.error('uso: node tools/capture/montar.mjs <nome>');
  process.exit(1);
}

const captura = join(AQUI, 'out', `${nome}.html`);
if (!existsSync(captura)) {
  console.error(`não achei ${captura}. Rode antes: node tools/capture/capture.mjs ${nome} "/<pagina>.html"`);
  process.exit(1);
}
const html = readFileSync(captura, 'utf8');
if ((html.match(/<\/body>/gi) || []).length !== 1) {
  console.error('a captura precisa ter exatamente um </body>');
  process.exit(1);
}

const destino = join(RAIZ, `${nome}.html`);
const existia = existsSync(destino);
let bloco;
if (existia) {
  const atual = readFileSync(destino, 'utf8');
  const inicio = atual.indexOf(MARCA);
  const fim = atual.lastIndexOf('</body>');
  if (inicio === -1 || fim < inicio) {
    console.error(`${nome}.html existe mas não tem o marcador ${MARCA}. Não vou sobrescrever.`);
    process.exit(1);
  }
  bloco = atual.slice(inicio, fim).trimEnd();
} else {
  bloco = `${MARCA} — daqui para baixo é escrito à mão. A marcação acima é a captura do app
     (tools/capture/out/${nome}.html). Para recapturar sem perder este bloco:
     node tools/capture/montar.mjs ${nome} -->
<script>
(() => {
  // Dados fictícios e comportamento desta tela. Repositório público: nada real aqui.
  // Avisos: window.mockup.avisar('texto').
})();
</script>`;
}

writeFileSync(destino, html.replace(/<\/body>/i, `\n${bloco}\n</body>`));
console.log(`${nome}.html montado (${existia ? 'bloco MOCKUP preservado' : 'novo, com bloco MOCKUP vazio'})`);
