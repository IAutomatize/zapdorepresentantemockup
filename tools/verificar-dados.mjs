/**
 * Guarda do repositório público: procura nas páginas e nas fixtures qualquer telefone,
 * e-mail, link de WhatsApp ou domínio que não seja o fictício do protótipo. Falha (saída 1)
 * se achar algo, para rodar antes de todo push.
 *
 *   node tools/verificar-dados.mjs
 *
 * Fictício permitido: telefones 55 11 99000-0001 a 99000-0199 (o universo do comum.js),
 * e-mails em exemplo.com.br / exemplo.com, e os domínios de CDN que as páginas carregam.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const arquivos = [
  ...readdirSync(RAIZ).filter((f) => f.endsWith('.html') || f.endsWith('.js')).map((f) => join(RAIZ, f)),
  ...readdirSync(join(RAIZ, 'tools', 'capture', 'fixtures')).filter((f) => f.endsWith('.js')).map((f) => join(RAIZ, 'tools', 'capture', 'fixtures', f)),
];

const DOMINIOS_OK = [
  /^cdn\.jsdelivr\.net$/, /^fonts\.googleapis\.com$/, /^fonts\.gstatic\.com$/, /^www\.w3\.org$/,
  /(^|\.)exemplo\.com(\.br)?$/, /^meet\.google\.com$/, /^iautomatize\.github\.io$/,
  /^empresa\.com(\.br)?$/, // placeholder do próprio app ("https://empresa.com.br")
];
const EMAIL_OK = /(^|\.)(exemplo|empresa|email)\.com(\.br)?$/; // empresa.com, email.com: placeholders do app
// 99000-00NN instâncias, 01NN contatos, 02NN representadas (mockup-vendas.js).
const telefoneFicticio = (digitos) => /^(55)?11990000[0-2][0-9]{2}$/.test(digitos);

/** CNPJ ou CPF com dígito verificador VÁLIDO pode ser de alguém real: o protótipo só usa inválidos. */
function documentoValido(digitos) {
  const n = digitos.split('').map(Number);
  if (new Set(n).size === 1) return false;
  const dv = (nums, pesos) => { const r = nums.reduce((a, x, i) => a + x * pesos[i], 0) % 11; return r < 2 ? 0 : 11 - r; };
  if (n.length === 14) {
    const d1 = dv(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = dv(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return d1 === n[12] && d2 === n[13];
  }
  if (n.length === 11) {
    const d1 = dv(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = dv(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return d1 === n[9] && d2 === n[10];
  }
  return false;
}
// Placeholder óbvio: termina com o mesmo dígito repetido ou é o clássico 99999-1234.
const placeholder = (digitos) => /(\d)\1{7}$/.test(digitos) || /999991234$/.test(digitos);

const achados = [];
for (const arquivo of arquivos) {
  const linhas = readFileSync(arquivo, 'utf8').split('\n');
  linhas.forEach((original, i) => {
    // Imagens embutidas são base64: sequências de dígitos ali não são telefone.
    const linha = original.replace(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+/g, '');
    const onde = `${arquivo.slice(RAIZ.length + 1)}:${i + 1}`;

    for (const m of linha.matchAll(/(?<![\d.\w])(?:\+?55[\s-]?)?\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}(?![\d.\w])/g)) {
      const digitos = m[0].replace(/\D/g, '');
      // Só conta como telefone se começa com 55 ou vem formatado; número cru de 10 dígitos
      // sem DDI é id, timestamp ou z-index.
      const formatado = /[\s()-]/.test(m[0]);
      if (digitos.length < 10 || (!digitos.startsWith('55') && !formatado)) continue;
      if (!telefoneFicticio(digitos) && !placeholder(digitos)) achados.push(`${onde}  telefone ${m[0]}`);
    }
    for (const m of linha.matchAll(/([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[a-z]{2,})/g)) {
      // JID do WhatsApp (numero@s.whatsapp.net): vale a regra do telefone.
      if (/^(s\.whatsapp\.net|g\.us|lid)$/.test(m[2])) {
        if (!telefoneFicticio(m[1]) && !placeholder(m[1])) achados.push(`${onde}  JID ${m[0]}`);
        continue;
      }
      if (!EMAIL_OK.test(m[2])) achados.push(`${onde}  e-mail ${m[0]}`);
    }
    for (const m of linha.matchAll(/https?:\/\/([^/"'\s)<>`]+)/g)) {
      const host = m[1].toLowerCase();
      if (!/[a-z]/.test(host) || host.startsWith('${')) continue; // "https://..." de placeholder e modelo de texto no JS
      if (!DOMINIOS_OK.some((re) => re.test(host))) achados.push(`${onde}  domínio ${host}`);
    }
    if (/wa\.me\/|api\.whatsapp\.com/.test(linha)) achados.push(`${onde}  link de WhatsApp`);
    for (const m of linha.matchAll(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g)) {
      if (documentoValido(m[0].replace(/\D/g, ''))) achados.push(`${onde}  CNPJ/CPF válido (pode ser real) ${m[0]}`);
    }
  });
}

if (achados.length) {
  console.error(`dados possivelmente reais (${achados.length}):\n  ${[...new Set(achados)].join('\n  ')}`);
  process.exit(1);
}
console.log(`verificar-dados: ${arquivos.length} arquivos, só dados fictícios`);
