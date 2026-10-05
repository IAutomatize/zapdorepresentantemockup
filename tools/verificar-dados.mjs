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
const telefoneFicticio = (digitos) => /^(55)?11990000(0[0-9]{2}|1[0-9]{2})$/.test(digitos);
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
      if (!/[a-z]/.test(host)) continue; // "https://..." de placeholder
      if (!DOMINIOS_OK.some((re) => re.test(host))) achados.push(`${onde}  domínio ${host}`);
    }
    if (/wa\.me\/|api\.whatsapp\.com/.test(linha)) achados.push(`${onde}  link de WhatsApp`);
  });
}

if (achados.length) {
  console.error(`dados possivelmente reais (${achados.length}):\n  ${[...new Set(achados)].join('\n  ')}`);
  process.exit(1);
}
console.log(`verificar-dados: ${arquivos.length} arquivos, só dados fictícios`);
