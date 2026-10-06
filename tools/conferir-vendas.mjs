/**
 * Confere que os dados de vendas do protótipo (mockup-vendas.js) não dependem da hora em que a
 * página abre: o mesmo dia, simulado em nove horários, tem que dar os mesmos pedidos (id, número,
 * cliente, representada, valor e status), com o número acompanhando o horário mostrado e nenhum
 * pedido depois de agora.
 *
 *   node tools/conferir-vendas.mjs
 *
 * Rode depois de qualquer mudança no gerador: o que o visitante altera é guardado pelo id do
 * pedido, e um sorteio a mais ou a menos muda todos os pedidos seguintes.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const CODIGO = readFileSync(join(RAIZ, 'mockup-vendas.js'), 'utf8');
const HORARIOS = [[0, 5], [7, 0], [9, 30], [11, 0], [13, 45], [16, 20], [18, 0], [21, 10], [23, 55]];

function gerar(hora, minuto) {
  const DataReal = Date;
  const agora = (() => { const d = new DataReal(); d.setHours(hora, minuto, 0, 0); return d.getTime(); })();
  class DataFalsa extends DataReal {
    constructor(...args) { if (args.length) super(...args); else super(agora); }
    static now() { return agora; }
  }
  const memoria = {};
  const contexto = {
    Date: DataFalsa, Intl, Math, JSON, Map, Set, String, Number, Boolean, Array, Object, encodeURIComponent, console,
    localStorage: { getItem: (k) => memoria[k] ?? null, setItem: (k, v) => { memoria[k] = String(v); }, removeItem: (k) => { delete memoria[k]; } },
    CustomEvent: class { constructor(tipo, opcoes) { this.type = tipo; this.detail = opcoes?.detail; } },
    document: { readyState: 'loading', addEventListener() {} },
  };
  contexto.window = contexto;
  contexto.addEventListener = () => {};
  contexto.dispatchEvent = () => {};
  vm.createContext(contexto);
  vm.runInContext(CODIGO, contexto);

  const pedidos = contexto.window.vendas.pedidos();
  const porHorario = [...pedidos].sort((a, b) => a.emitidoEm.localeCompare(b.emitidoEm) || a.numero - b.numero);
  return {
    chaves: pedidos.map((p) => `${p.id}|${p.numero}|${p.clienteId}|${p.representadaId}|${p.valorTotal}|${p.status}`).sort(),
    foraDeOrdem: porHorario.filter((p, i) => i > 0 && p.numero < porHorario[i - 1].numero).length,
    noFuturo: pedidos.filter((p) => new DataReal(p.emitidoEm).getTime() > agora).length,
    vendidoNoMes: contexto.window.vendas.resumo({}).valor,
  };
}

const base = gerar(...HORARIOS[0]);
let problemas = 0;
for (const [hora, minuto] of HORARIOS) {
  const g = gerar(hora, minuto);
  const diferencas = g.chaves.filter((chave, i) => chave !== base.chaves[i]).length + Math.abs(g.chaves.length - base.chaves.length);
  const vendidoMudou = g.vendidoNoMes !== base.vendidoNoMes;
  problemas += diferencas + g.foraDeOrdem + g.noFuturo + (vendidoMudou ? 1 : 0);
  const rotulo = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
  console.log(`${rotulo} → ${g.chaves.length} pedidos, ${diferencas} diferenças, ${g.foraDeOrdem} fora de ordem, ${g.noFuturo} depois de agora${vendidoMudou ? ', vendido no mês mudou' : ''}`);
}
if (problemas) {
  console.error(`conferir-vendas: ${problemas} problemas`);
  process.exit(1);
}
console.log('conferir-vendas: os mesmos pedidos o dia todo, número na ordem do horário, nenhum depois de agora');
