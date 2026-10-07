/*
 * MÓDULO DE VENDAS DO PROTÓTIPO (recursos 001 a 005)
 *
 * Representadas, Clientes, Pedidos, finalizar conversa com pedido, vendedores e os
 * Indicadores de vendas leem e gravam tudo por aqui (window.vendas), para as telas
 * contarem a mesma história: o pedido registrado no chat aparece em Pedidos, mexe nos
 * Indicadores e na carteira do cliente.
 *
 * Dados 100% fictícios: o repositório é público.
 *   - Representadas, clientes e produtos são nomes inventados. CNPJ e CPF saem com o
 *     dígito verificador errado de propósito: não podem pertencer a ninguém.
 *   - Telefones seguem o padrão do protótipo (11 99000-0NNN); e-mails em exemplo.com.br.
 *   - Os contatos são os mesmos de tools/capture/fixtures/comum.js (espelho abaixo).
 *
 * Os dados-base são gerados a cada carga, com semente fixa e datas relativas a hoje: os
 * indicadores e as listas nunca envelhecem. O que o visitante cria, altera ou exclui
 * fica numa camada por cima, no localStorage deste navegador (CHAVE), e vale em todas
 * as telas e abas. vendas.resetar() volta ao estado inicial.
 *
 * Regras (as mesmas que o briefing de transporte leva para o sistema):
 *   venda          pedido com status pedido, faturado ou concluído (orçamento e
 *                  cancelado não contam para faturamento, carteira, ABC nem positivação)
 *   carteira       ativo: comprou nos últimos 90 dias; inativo recente: 91 a 180;
 *                  inativo antigo: mais de 180; prospect: nunca comprou (CONFIG)
 *   curva ABC      clientes ordenados por valor comprado no período; A até 80% do
 *                  acumulado, B até 95%, C o resto (o cliente que cruza a linha fica nela)
 *   positivação    cliente com ao menos uma venda no período; por dia, clientes
 *                  distintos que compraram naquele dia
 *   comissões      a da representada (percentual que a indústria paga ao representante)
 *                  e a do vendedor (percentual do vendedor sobre o valor do pedido),
 *                  gravadas no pedido no momento em que ele é criado
 */
(function () {
  const CHAVE = 'zap-mockup:vendas:v1';
  const CHAVE_VER_COMO = 'zap-mockup:ver-como';
  const DIA = 86_400_000;

  // ---------------------------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------------------------
  function semente(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const aleatorio = semente(20261006);
  const entre = (min, max) => min + Math.floor(aleatorio() * (max - min + 1));
  const escolher = (lista) => lista[Math.floor(aleatorio() * lista.length)];
  const copia = (v) => JSON.parse(JSON.stringify(v));

  function hoje() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  /** Data local `dias` atrás, num horário comercial. */
  function diasAtras(dias, hora = 10, minuto = 0) {
    const d = hoje();
    d.setDate(d.getDate() - dias);
    d.setHours(hora, minuto, 0, 0);
    return d;
  }
  const inicioDoDia = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const fimDoDia = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  const chaveDoDia = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };

  /** Documento com dígito verificador errado de propósito: não existe na Receita. */
  function cnpjFicticio(base8) {
    const n = `${base8}0001`.split('').map(Number);
    const dv = (nums, pesos) => {
      const s = nums.reduce((acc, x, i) => acc + x * pesos[i], 0) % 11;
      return s < 2 ? 0 : 11 - s;
    };
    const d1 = dv(n, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = dv([...n, d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const s = `${base8}0001${d1}${(d2 + 1) % 10}`;
    return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`;
  }
  function cpfFicticio(base9) {
    const n = base9.split('').map(Number);
    const dv = (nums) => {
      const s = nums.reduce((acc, x, i) => acc + x * (nums.length + 1 - i), 0) % 11;
      return s < 2 ? 0 : 11 - s;
    };
    const d1 = dv(n);
    const d2 = dv([...n, d1]);
    const s = `${base9}${d1}${(d2 + 1) % 10}`;
    return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
  }

  // ---------------------------------------------------------------------------------
  // Equipe, contatos e marcadores (espelho de tools/capture/fixtures/comum.js)
  // ---------------------------------------------------------------------------------
  const USUARIOS = [
    { id: 'usr-ana', nome: 'Ana Souza', email: 'ana@exemplo.com.br', papel: 'owner', papelNome: 'Dono' },
    { id: 'usr-carla', nome: 'Carla Dias', email: 'carla@exemplo.com.br', papel: 'admin', papelNome: 'Administrador' },
    { id: 'usr-bruno', nome: 'Bruno Lima', email: 'bruno@exemplo.com.br', papel: 'member', papelNome: 'Vendedor' },
  ];

  /**
   * Quem vende, quanto ganha sobre o valor do pedido e a meta de vendas do mês (centavos).
   * A dona não tira comissão de si.
   */
  const VENDEDORES = {
    'usr-ana': { vendedor: true, comissao: 0, meta: 15000000 },
    'usr-carla': { vendedor: true, comissao: 2.5, meta: 14000000 },
    'usr-bruno': { vendedor: true, comissao: 3, meta: 1500000 },
  };

  const MARCADORES = [
    { id: 'tag-cliente', nome: 'Cliente ativo', cor: '#16a34a' },
    { id: 'tag-orcamento', nome: 'Orçamento', cor: '#f59e0b' },
    { id: 'tag-vip', nome: 'VIP', cor: '#7c3aed' },
    { id: 'tag-atacado', nome: 'Atacado', cor: '#0ea5e9' },
    { id: 'tag-reativar', nome: 'Reativar', cor: '#ef4444' },
  ];

  // [id, nome, sufixo do telefone, e-mail, cidade, uf, marcadores, conversa]
  const CONTATOS = [
    ['ct-01', 'Mariana Costa', '01', 'mariana.costa@exemplo.com.br', 'São Paulo', 'SP', ['tag-cliente', 'tag-vip'], 'c1'],
    ['ct-02', 'Mercado Bom Preço', '02', 'compras@bompreco.exemplo.com.br', 'Guarulhos', 'SP', ['tag-orcamento'], 'c2'],
    ['ct-03', 'Pedro Almeida', '03', null, 'Campinas', 'SP', ['tag-cliente'], 'c3'],
    ['ct-04', 'Distribuidora Litoral', '04', 'pedidos@litoral.exemplo.com.br', 'Santos', 'SP', ['tag-atacado', 'tag-cliente'], 'c4'],
    ['ct-05', 'Juliana Ribeiro', '05', 'juliana.ribeiro@exemplo.com.br', 'São Paulo', 'SP', ['tag-orcamento'], 'c5'],
    ['ct-06', 'Empório Central', '06', 'contato@emporio.exemplo.com.br', 'Jundiaí', 'SP', ['tag-cliente'], 'c6'],
    ['ct-07', 'Carlos Mendes', '07', null, 'Sorocaba', 'SP', [], 'c7'],
    ['ct-08', 'Padaria Estrela', '08', null, 'São Paulo', 'SP', ['tag-cliente'], 'c8'],
    ['ct-09', 'Fernanda Oliveira', '09', 'fernanda.o@exemplo.com.br', 'Osasco', 'SP', ['tag-orcamento'], 'c9'],
    ['ct-10', 'Supermercado Avenida', '10', 'compras@avenida.exemplo.com.br', 'Santo André', 'SP', ['tag-atacado'], 'c10'],
    ['ct-11', 'Ricardo Santos', '11', null, 'São Bernardo do Campo', 'SP', ['tag-reativar'], null],
    ['ct-12', 'Loja da Esquina', '12', null, 'São Paulo', 'SP', [], null],
    ['ct-13', 'Patrícia Gomes', '13', 'patricia.gomes@exemplo.com.br', 'Campinas', 'SP', ['tag-vip', 'tag-cliente'], 'c11'],
    ['ct-14', 'Atacadão do Vale', '14', 'pedidos@atacadaovale.exemplo.com.br', 'São José dos Campos', 'SP', ['tag-atacado'], 'c12'],
    ['ct-15', 'Lucas Ferreira', '15', null, 'Mogi das Cruzes', 'SP', [], null],
    ['ct-16', 'Mercearia São José', '16', null, 'Taubaté', 'SP', ['tag-reativar'], null],
    ['ct-17', 'Camila Rocha', '17', 'camila.rocha@exemplo.com.br', 'São Paulo', 'SP', ['tag-cliente'], 'c13'],
    ['ct-18', 'Hortifruti Verde Vida', '18', null, 'Barueri', 'SP', ['tag-orcamento'], null],
    ['ct-19', 'Thiago Martins', '19', null, 'Piracicaba', 'SP', [], null],
    ['ct-20', 'Conveniência 24h Centro', '20', null, 'São Paulo', 'SP', ['tag-cliente'], null],
    ['ct-21', 'Beatriz Lima', '21', 'beatriz.lima@exemplo.com.br', 'Ribeirão Preto', 'SP', ['tag-vip'], null],
    ['ct-22', 'Rede Econômica', '22', 'compras@economica.exemplo.com.br', 'Campinas', 'SP', ['tag-atacado', 'tag-cliente'], 'c14'],
    ['ct-23', 'Gustavo Pereira', '23', null, 'Santos', 'SP', [], null],
    ['ct-24', 'Café Aroma', '24', 'cafe.aroma@exemplo.com.br', 'São Paulo', 'SP', ['tag-orcamento'], null],
  ].map(([id, nome, sufixo, email, cidade, uf, tags, conversaId]) => ({
    id, nome, telefone: `55119900001${sufixo}`, email, cidade, uf, tags, conversaId, bloqueado: false,
  }));

  // ---------------------------------------------------------------------------------
  // Representadas e catálogo
  // ---------------------------------------------------------------------------------
  // [id, razão social, nome fantasia, base do CNPJ, comissão %, cor, sufixo telefone, e-mail, site, produtos]
  // produto: [código, nome, embalagem, preço da embalagem em centavos]
  const BASE_REPRESENTADAS = [
    ['rep-lumiar', 'Biscoitos Lumiar Indústria de Alimentos Ltda', 'Biscoitos Lumiar', '41257368', 4, '#d97706', '201',
      'comercial@lumiar.exemplo.com.br', 'lumiar.exemplo.com.br', [
        ['LUM-001', 'Biscoito sortido 400g', 'cx 20 un', 16800],
        ['LUM-002', 'Cream cracker 350g', 'cx 24 un', 17280],
        ['LUM-003', 'Wafer de chocolate 140g', 'cx 30 un', 11700],
        ['LUM-004', 'Rosquinha de coco 300g', 'cx 20 un', 9800],
        ['LUM-005', 'Biscoito maisena 400g', 'cx 20 un', 12400],
        ['LUM-006', 'Cookies gotas de chocolate 120g', 'cx 36 un', 15120],
      ]],
    ['rep-orvalho', 'Laticínios Orvalho Ltda', 'Laticínios Orvalho', '38412590', 3.5, '#2563eb', '202',
      'pedidos@orvalho.exemplo.com.br', 'orvalho.exemplo.com.br', [
        ['ORV-010', 'Achocolatado em pó 400g', 'cx 24 un', 21120],
        ['ORV-011', 'Leite UHT integral 1L', 'cx 12 un', 5988],
        ['ORV-012', 'Creme de leite 200g', 'cx 27 un', 8370],
        ['ORV-013', 'Leite condensado 395g', 'cx 27 un', 16200],
        ['ORV-014', 'Achocolatado líquido 200ml', 'cx 27 un', 6210],
        ['ORV-015', 'Requeijão cremoso 200g', 'cx 24 un', 16800],
      ]],
    ['rep-tropeiro', 'Grãos Tropeiro Comércio de Alimentos Ltda', 'Grãos Tropeiro', '29684317', 5, '#16a34a', '203',
      'vendas@tropeiro.exemplo.com.br', 'tropeiro.exemplo.com.br', [
        ['TRO-101', 'Café torrado e moído 500g', 'fardo 10 un', 18900],
        ['TRO-102', 'Farinha de mandioca 1kg', 'fardo 10 un', 6990],
        ['TRO-103', 'Feijão carioca 1kg', 'fardo 10 un', 8490],
        ['TRO-104', 'Arroz agulhinha 5kg', 'fardo 6 un', 14940],
        ['TRO-105', 'Tempero completo 300g', 'cx 24 un', 8640],
      ]],
    ['rep-pedrafina', 'Bebidas Pedra Fina Ltda', 'Bebidas Pedra Fina', '17530842', 0.75, '#0891b2', '204',
      'comercial@pedrafina.exemplo.com.br', 'pedrafina.exemplo.com.br', [
        ['PFI-201', 'Água mineral 500ml', 'fardo 12 un', 1440],
        ['PFI-202', 'Refrigerante guaraná 2L', 'fardo 6 un', 4194],
        ['PFI-203', 'Suco de uva integral 1L', 'cx 6 un', 7740],
        ['PFI-204', 'Chá gelado de limão 1,5L', 'fardo 6 un', 3594],
        ['PFI-205', 'Energético 269ml', 'fardo 6 un', 3894],
      ]],
    ['rep-bemcuidar', 'Bem-Cuidar Higiene e Limpeza Ltda', 'Bem-Cuidar', '52073196', 6, '#7c3aed', '205',
      'atendimento@bemcuidar.exemplo.com.br', 'bemcuidar.exemplo.com.br', [
        ['BEM-301', 'Sabonete em barra 90g', 'cx 12 un', 2280],
        ['BEM-302', 'Creme dental 90g', 'cx 12 un', 3480],
        ['BEM-303', 'Papel higiênico folha dupla 12 rolos', 'fardo 4 un', 7960],
        ['BEM-304', 'Shampoo 350ml', 'cx 12 un', 11880],
        ['BEM-305', 'Detergente líquido 500ml', 'cx 24 un', 5280],
      ]],
  ];

  const REPRESENTADAS = [];
  const PRODUTOS = [];
  // Meta de vendas do mês de cada representada (centavos): um pouco acima do que a base vende
  // por mês (R$ 250 a 290 mil no total), para o Dashboard mostrar quanto falta.
  const META_DA_REPRESENTADA = { 'rep-orvalho': 9000000, 'rep-lumiar': 8500000, 'rep-tropeiro': 6500000, 'rep-pedrafina': 4500000, 'rep-bemcuidar': 4500000 };
  BASE_REPRESENTADAS.forEach(([id, razao, fantasia, base, comissao, cor, sufixo, email, site, produtos], i) => {
    REPRESENTADAS.push({
      id, razaoSocial: razao, nomeFantasia: fantasia, cnpj: cnpjFicticio(base), comissao, metaMensal: META_DA_REPRESENTADA[id] || 0, cor,
      logo: null, telefones: [`55119900002${sufixo.slice(1)}`], emails: [email], site: `https://${site}`,
      ativa: true, origem: i < 2 ? 'pdf' : 'manual', criadoEm: diasAtras(320 - i * 20).toISOString(),
    });
    produtos.forEach(([codigo, nome, embalagem, preco]) => {
      PRODUTOS.push({ id: `prd-${codigo.toLowerCase()}`, representadaId: id, codigo, nome, embalagem, preco, ativo: true });
    });
  });

  // ---------------------------------------------------------------------------------
  // Clientes
  // ---------------------------------------------------------------------------------
  const SEGMENTOS = ['Supermercado', 'Mercearia', 'Padaria', 'Distribuidor', 'Atacarejo', 'Empório', 'Conveniência', 'Hortifruti', 'Cafeteria'];
  const REDES = ['Rede Econômica', 'Rede Avenida', 'Associação Mercados do Vale'];
  const RUAS = ['Rua das Acácias', 'Avenida dos Ipês', 'Rua do Comércio', 'Rua Sete de Setembro', 'Avenida Central',
    'Rua das Palmeiras', 'Rua Quinze de Novembro', 'Avenida das Nações', 'Rua do Mercado', 'Rua Boa Vista'];
  const BAIRROS = ['Centro', 'Jardim América', 'Vila Nova', 'Vila Industrial', 'Jardim das Flores', 'Parque Industrial', 'Vila Rica'];

  // perfil: a = ativo, r = inativo recente, o = inativo antigo, p = prospect
  // porte: 1 (pequeno) a 5 (grande), define tamanho e frequência dos pedidos
  // [id, tipo, razão social, nome fantasia, segmento, rede, cidade, contatos, vendedor, perfil, porte, representadas]
  const BASE_CLIENTES = [
    ['cli-01', 'PJ', 'Mercado Bom Preço Ltda', 'Mercado Bom Preço', 'Supermercado', null, 'Guarulhos', ['ct-02'], 'usr-carla', 'a', 3, ['lumiar', 'orvalho', 'pedrafina']],
    ['cli-02', 'PJ', 'Distribuidora Litoral Comércio Ltda', 'Distribuidora Litoral', 'Distribuidor', null, 'Santos', ['ct-04'], 'usr-ana', 'a', 5, ['orvalho', 'tropeiro', 'pedrafina']],
    ['cli-03', 'PJ', 'Empório Central Ltda', 'Empório Central', 'Empório', null, 'Jundiaí', ['ct-06'], 'usr-bruno', 'a', 2, ['lumiar', 'tropeiro']],
    ['cli-04', 'PJ', 'Panificadora Estrela Ltda', 'Padaria Estrela', 'Padaria', null, 'São Paulo', ['ct-08'], 'usr-carla', 'a', 2, ['orvalho', 'lumiar']],
    ['cli-05', 'PJ', 'Supermercado Avenida Ltda', 'Supermercado Avenida', 'Supermercado', 'Rede Avenida', 'Santo André', ['ct-10'], 'usr-carla', 'a', 4, ['lumiar', 'orvalho', 'bemcuidar', 'pedrafina']],
    ['cli-06', 'PJ', 'Loja da Esquina Comércio Ltda', 'Loja da Esquina', 'Mercearia', null, 'São Paulo', ['ct-12'], 'usr-bruno', 'r', 1, ['lumiar']],
    ['cli-07', 'PJ', 'Atacadão do Vale Comércio Atacadista Ltda', 'Atacadão do Vale', 'Atacarejo', 'Associação Mercados do Vale', 'São José dos Campos', ['ct-14'], 'usr-ana', 'a', 5, ['lumiar', 'orvalho', 'tropeiro', 'bemcuidar']],
    ['cli-08', 'PJ', 'Mercearia São José Ltda', 'Mercearia São José', 'Mercearia', null, 'Taubaté', ['ct-16'], 'usr-bruno', 'o', 1, ['tropeiro']],
    ['cli-09', 'PJ', 'Verde Vida Hortifruti Ltda', 'Hortifruti Verde Vida', 'Hortifruti', null, 'Barueri', ['ct-18'], 'usr-bruno', 'p', 2, ['pedrafina']],
    ['cli-10', 'PJ', 'Conveniência 24h Centro Ltda', 'Conveniência 24h Centro', 'Conveniência', null, 'São Paulo', ['ct-20'], 'usr-carla', 'a', 1, ['pedrafina', 'lumiar']],
    ['cli-11', 'PJ', 'Rede Econômica Supermercados Ltda', 'Rede Econômica', 'Supermercado', 'Rede Econômica', 'Campinas', ['ct-22'], 'usr-carla', 'a', 5, ['orvalho', 'lumiar', 'bemcuidar', 'tropeiro']],
    ['cli-12', 'PJ', 'Café Aroma Ltda', 'Café Aroma', 'Cafeteria', null, 'São Paulo', ['ct-24'], 'usr-bruno', 'p', 1, ['tropeiro', 'orvalho']],
    ['cli-13', 'PJ', 'Supermercado Costa Lima Ltda', 'Supermercado Costa Lima', 'Supermercado', null, 'São Paulo', ['ct-01'], 'usr-ana', 'a', 4, ['lumiar', 'orvalho']],
    ['cli-14', 'PJ', 'Almeida & Filhos Mercearia Ltda', 'Almeida & Filhos', 'Mercearia', null, 'Campinas', ['ct-03'], 'usr-bruno', 'a', 2, ['tropeiro', 'lumiar']],
    ['cli-15', 'PF', 'Juliana Ribeiro', 'Ribeiro Doces', 'Padaria', null, 'São Paulo', ['ct-05'], 'usr-ana', 'p', 1, ['orvalho']],
    ['cli-16', 'PJ', 'Mendes Atacado de Alimentos Ltda', 'Mendes Atacado', 'Distribuidor', null, 'Sorocaba', ['ct-07'], 'usr-ana', 'a', 3, ['tropeiro', 'pedrafina']],
    ['cli-17', 'PJ', 'Mercadinho Oliveira Ltda', 'Mercadinho da Fernanda', 'Mercearia', null, 'Osasco', ['ct-09'], 'usr-bruno', 'p', 1, ['lumiar']],
    ['cli-18', 'PJ', 'Santos & Santos Supermercados Ltda', 'Santos Supermercados', 'Supermercado', null, 'São Bernardo do Campo', ['ct-11'], 'usr-carla', 'o', 3, ['orvalho', 'bemcuidar']],
    ['cli-19', 'PJ', 'Empório Gomes Ltda', 'Empório Gomes', 'Empório', null, 'Campinas', ['ct-13'], 'usr-carla', 'a', 3, ['lumiar', 'orvalho', 'bemcuidar']],
    ['cli-20', 'PF', 'Lucas Ferreira', 'Lucas Ferreira', 'Conveniência', null, 'Mogi das Cruzes', ['ct-15'], 'usr-bruno', 'p', 1, ['pedrafina']],
    ['cli-21', 'PJ', 'Rocha Conveniências Ltda', 'Rocha Conveniências', 'Conveniência', null, 'São Paulo', ['ct-17'], 'usr-bruno', 'a', 1, ['pedrafina', 'bemcuidar']],
    ['cli-22', 'PJ', 'Martins Distribuidora de Alimentos Ltda', 'Martins Distribuidora', 'Distribuidor', null, 'Piracicaba', ['ct-19'], 'usr-ana', 'r', 4, ['tropeiro', 'orvalho']],
    ['cli-23', 'PJ', 'Lima Supermercado Ltda', 'Lima Supermercado', 'Supermercado', null, 'Ribeirão Preto', ['ct-21'], 'usr-carla', 'a', 4, ['lumiar', 'orvalho', 'pedrafina']],
    ['cli-24', 'PJ', 'Pereira Panificadora Ltda', 'Panificadora Pereira', 'Padaria', null, 'Santos', ['ct-23'], 'usr-bruno', 'r', 2, ['orvalho', 'lumiar']],
    ['cli-25', 'PJ', 'Supermercado Bela Vista Ltda', 'Supermercado Bela Vista', 'Supermercado', null, 'Guarulhos', [], 'usr-carla', 'a', 3, ['lumiar', 'bemcuidar']],
    ['cli-26', 'PJ', 'Mercearia Dois Irmãos Ltda', 'Mercearia Dois Irmãos', 'Mercearia', null, 'Osasco', [], 'usr-bruno', 'r', 1, ['tropeiro']],
    ['cli-27', 'PJ', 'Atacarejo Nova Era Ltda', 'Nova Era Atacarejo', 'Atacarejo', 'Associação Mercados do Vale', 'Sorocaba', [], 'usr-ana', 'a', 4, ['orvalho', 'tropeiro', 'bemcuidar', 'pedrafina']],
    ['cli-28', 'PJ', 'Empório Serra Azul Ltda', 'Empório Serra Azul', 'Empório', null, 'Jundiaí', [], 'usr-carla', 'r', 2, ['lumiar']],
    ['cli-29', 'PJ', 'Mini Mercado Jardim Ltda', 'Mercado Jardim', 'Mercearia', null, 'Santo André', [], 'usr-bruno', 'a', 1, ['lumiar', 'pedrafina']],
    ['cli-30', 'PJ', 'Posto Sul Conveniência Ltda', 'Conveniência Posto Sul', 'Conveniência', null, 'Santos', [], 'usr-bruno', 'r', 1, ['pedrafina']],
    ['cli-31', 'PJ', 'Distribuidora Alvorada Ltda', 'Distribuidora Alvorada', 'Distribuidor', null, 'Campinas', [], 'usr-ana', 'a', 4, ['tropeiro', 'lumiar', 'orvalho']],
    ['cli-32', 'PJ', 'Supermercado Ponte Alta Ltda', 'Supermercado Ponte Alta', 'Supermercado', null, 'Taubaté', [], 'usr-carla', 'r', 3, ['orvalho', 'bemcuidar']],
    ['cli-33', 'PJ', 'Padaria Trigo de Ouro Ltda', 'Padaria Trigo de Ouro', 'Padaria', null, 'São Paulo', [], 'usr-bruno', 'a', 2, ['orvalho', 'tropeiro']],
    ['cli-34', 'PJ', 'Mercado Vila Nova Ltda', 'Mercado Vila Nova', 'Supermercado', null, 'São José dos Campos', [], 'usr-carla', 'a', 3, ['lumiar', 'orvalho', 'pedrafina']],
    ['cli-35', 'PJ', 'Bom Sabor Hortifruti Ltda', 'Hortifruti Bom Sabor', 'Hortifruti', null, 'Barueri', [], 'usr-bruno', 'o', 1, ['pedrafina']],
    ['cli-36', 'PJ', 'Empório Recanto Ltda', 'Empório Recanto', 'Empório', null, 'Ribeirão Preto', [], 'usr-carla', 'r', 2, ['lumiar', 'bemcuidar']],
    ['cli-37', 'PJ', 'Mercearia Estrela do Sul Ltda', 'Mercearia Estrela do Sul', 'Mercearia', null, 'Mogi das Cruzes', [], 'usr-bruno', 'a', 1, ['tropeiro']],
    ['cli-38', 'PJ', 'Armazém Santa Fé Ltda', 'Armazém Santa Fé', 'Mercearia', null, 'Piracicaba', [], 'usr-ana', 'r', 2, ['tropeiro', 'orvalho']],
    ['cli-39', 'PJ', 'Supermercado Primavera Ltda', 'Supermercado Primavera', 'Supermercado', null, 'São Bernardo do Campo', [], 'usr-carla', 'a', 3, ['orvalho', 'lumiar', 'bemcuidar']],
    ['cli-40', 'PJ', 'Rede Econômica Supermercados Ltda', 'Rede Econômica - Loja Taquaral', 'Supermercado', 'Rede Econômica', 'Campinas', [], 'usr-carla', 'a', 4, ['orvalho', 'lumiar']],
  ];

  const MARCADORES_DO_PERFIL = { a: ['tag-cliente'], r: ['tag-reativar'], o: ['tag-reativar'], p: ['tag-orcamento'] };
  const CLIENTES = BASE_CLIENTES.map(([id, tipo, razao, fantasia, segmento, rede, cidade, contatoIds, vendedorId, perfil, porte, reps], i) => {
    const n = i + 1;
    const contato = CONTATOS.find((c) => c.id === contatoIds[0]);
    const tags = contato ? [...contato.tags] : [...MARCADORES_DO_PERFIL[perfil]];
    if (porte >= 4 && !tags.includes('tag-atacado') && ['Distribuidor', 'Atacarejo'].includes(segmento)) tags.push('tag-atacado');
    return {
      id, tipo,
      documento: tipo === 'PJ' ? cnpjFicticio(String(31000000 + n * 7919).slice(0, 8)) : cpfFicticio(String(214000000 + n * 104729).slice(0, 9)),
      razaoSocial: razao, nomeFantasia: fantasia,
      inscricaoEstadual: tipo === 'PJ' ? `${String(110 + n).padStart(3, '0')}.${String(200 + n * 3).padStart(3, '0')}.${String(500 + n * 7).padStart(3, '0')}.${String(100 + n).padStart(3, '0')}` : '',
      suframa: '',
      segmento, rede,
      endereco: {
        cep: `${String(1000 + n * 113).padStart(5, '0')}-${String(n * 7 % 1000).padStart(3, '0')}`,
        logradouro: RUAS[n % RUAS.length], numero: String(40 + n * 17), complemento: n % 5 === 0 ? 'Loja 2' : '',
        bairro: BAIRROS[n % BAIRROS.length], cidade, uf: 'SP',
      },
      informacoes: '',
      vendedorId,
      representadaIds: reps.map((r) => `rep-${r}`),
      tags, contatoIds: [...contatoIds],
      bloqueado: false, bloqueadoEm: null,
      criadoEm: diasAtras(perfil === 'p' ? entre(2, 40) : entre(210, 420)).toISOString(),
      _perfil: perfil, _porte: porte,
    };
  });
  // Dois clientes bloqueados (pararam de pagar e saíram do atendimento), para o filtro de
  // bloqueio ter o que mostrar. Nenhum dos dois tem contato vinculado, então nada muda nas
  // conversas. Sem sorteio aqui: os pedidos gerados depois continuam os mesmos.
  [['cli-30', 21], ['cli-38', 48]].forEach(([id, dias]) => {
    const cliente = CLIENTES.find((c) => c.id === id);
    cliente.bloqueado = true;
    cliente.bloqueadoEm = diasAtras(dias).toISOString();
  });

  // ---------------------------------------------------------------------------------
  // Pedidos
  // ---------------------------------------------------------------------------------
  const STATUS = {
    orcamento: { nome: 'Em orçamento', cor: '#d97706', venda: false },
    pedido: { nome: 'Pedido', cor: '#2563eb', venda: true },
    faturado: { nome: 'Faturado', cor: '#7c3aed', venda: true },
    concluido: { nome: 'Concluído', cor: '#16a34a', venda: true },
    cancelado: { nome: 'Cancelado', cor: '#64748b', venda: false },
  };
  const ehVenda = (pedido) => Boolean(STATUS[pedido.status]?.venda);

  const TICKET_DO_PORTE = { 1: 70000, 2: 140000, 3: 260000, 4: 520000, 5: 950000 };
  const INTERVALO_DO_PORTE = { 1: 26, 2: 19, 3: 13, 4: 9, 5: 6 };

  // Fisher–Yates com o sorteio da semente: o sort com comparador aleatório depende do motor
  // (Chrome ordena diferente de Safari e Firefox) e daria pedidos diferentes no iPhone.
  function embaralhar(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = Math.floor(aleatorio() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  function itensPara(representadaId, valorAlvo) {
    const catalogo = PRODUTOS.filter((p) => p.representadaId === representadaId);
    const quantos = Math.min(catalogo.length, entre(2, 5));
    const escolhidos = embaralhar(catalogo).slice(0, quantos);
    return escolhidos.map((produto) => {
      const fatia = valorAlvo / quantos;
      const quantidade = Math.max(1, Math.round(fatia / produto.preco));
      return { produtoId: produto.id, descricao: produto.nome, embalagem: produto.embalagem, quantidade, precoUnitario: produto.preco };
    });
  }
  const totalDosItens = (itens) => itens.reduce((acc, it) => acc + it.quantidade * it.precoUnitario, 0);

  function statusPorIdade(dias) {
    const x = aleatorio();
    if (dias <= 1) return x < 0.55 ? 'pedido' : x < 0.85 ? 'orcamento' : 'faturado';
    if (dias <= 12) return x < 0.65 ? 'faturado' : x < 0.9 ? 'concluido' : 'pedido';
    return x < 0.93 ? 'concluido' : x < 0.97 ? 'cancelado' : 'faturado';
  }

  const PEDIDOS_GERADOS = [];
  function novoPedidoBase(cliente, dias, extra = {}) {
    if (dias < 0) return null;
    const data = diasAtras(dias, entre(8, 17), entre(0, 59));
    if (data.getDay() === 0) data.setDate(data.getDate() - 1); // domingo não vende
    // Nada aqui pode depender da hora em que a página abre: um sorteio a mais ou a menos muda
    // todos os pedidos seguintes. O horário sorteado (mesmo depois de agora) fica em `_ordem`,
    // que numera os pedidos; os de mais tarde hoje são acertados no fim (antesDeAgora).
    const ordem = data.getTime();
    const representadaId = extra.representadaId || escolher(cliente.representadaIds);
    const alvo = TICKET_DO_PORTE[cliente._porte] * (0.65 + aleatorio() * 0.7);
    const itens = extra.itens || itensPara(representadaId, alvo);
    const representada = REPRESENTADAS.find((r) => r.id === representadaId);
    const contato = CONTATOS.find((c) => cliente.contatoIds.includes(c.id) && c.conversaId);
    const daConversa = Boolean(contato) && aleatorio() < 0.35;
    const pedido = {
      id: null, numero: 0,
      clienteId: cliente.id, representadaId, vendedorId: cliente.vendedorId,
      status: extra.status || statusPorIdade(Math.round((hoje() - inicioDoDia(data)) / DIA)),
      emitidoEm: data.toISOString(),
      itens, valorTotal: totalDosItens(itens),
      origem: extra.origem || (daConversa ? 'conversa' : 'pedidos'),
      conversaId: extra.conversaId || (daConversa ? contato.conversaId : null),
      condicaoPagamento: escolher(['28 dias', '28/42 dias', '30/60/90 dias', 'À vista', '21 dias']),
      observacoes: extra.observacoes || '',
      notaFiscal: null,
      comissaoRepresentada: representada.comissao,
      comissaoVendedor: VENDEDORES[cliente.vendedorId].comissao,
      _ordem: ordem,
    };
    if (['faturado', 'concluido'].includes(pedido.status)) pedido.notaFiscal = String(entre(10000, 99999));
    PEDIDOS_GERADOS.push(pedido);
    return pedido;
  }

  // Os dois clientes que voltam a comprar neste mês (mais abaixo) precisam estar inativos no
  // início do mês em qualquer dia dele: o inativo recente com a última compra a pelo menos
  // 125 dias de hoje (no dia 31, 94 antes do mês) e o antigo a pelo menos 212 (181). O
  // histórico deles é empurrado para trás inteiro, com o mesmo número de sorteios, para os
  // outros pedidos não mudarem.
  const ULTIMA_COMPRA_MINIMA = { 'cli-06': 125, 'cli-35': 212 };
  CLIENTES.forEach((cliente) => {
    const perfil = cliente._perfil;
    if (perfil === 'p') return;
    const intervalo = INTERVALO_DO_PORTE[cliente._porte];
    let ultima; let inicio;
    if (perfil === 'a') { ultima = entre(0, Math.min(60, intervalo * 2)); inicio = 260; }
    else if (perfil === 'r') { ultima = entre(96, 172); inicio = 320; }
    else { ultima = entre(190, 280); inicio = 380; }
    const recuo = Math.max(0, (ULTIMA_COMPRA_MINIMA[cliente.id] || 0) - ultima);
    for (let dias = ultima + recuo; dias <= inicio + recuo; dias += Math.max(2, intervalo + entre(-3, 4))) novoPedidoBase(cliente, dias);
  });

  // Pedidos que as conversas do protótipo citam (chats.html), para a história fechar.
  const porId = (id) => CLIENTES.find((c) => c.id === id);
  const itemDe = (codigo, quantidade) => {
    const p = PRODUTOS.find((x) => x.codigo === codigo);
    return { produtoId: p.id, descricao: p.nome, embalagem: p.embalagem, quantidade, precoUnitario: p.preco };
  };
  // c4: "O pedido de vocês foi faturado hoje cedo."
  novoPedidoBase(porId('cli-02'), 0, { status: 'faturado', representadaId: 'rep-orvalho', origem: 'conversa', conversaId: 'c4',
    itens: [itemDe('ORV-011', 60), itemDe('ORV-010', 18), itemDe('ORV-013', 12)] });
  // c8: "Pedido confirmado: 12 caixas de biscoito sortido. A nota sai na segunda."
  novoPedidoBase(porId('cli-04'), 2, { status: 'pedido', representadaId: 'rep-lumiar', origem: 'conversa', conversaId: 'c8',
    itens: [itemDe('LUM-001', 12)] });
  // c10: "Segue o pedido da semana em anexo"
  novoPedidoBase(porId('cli-05'), 0, { status: 'pedido', representadaId: 'rep-lumiar', origem: 'conversa', conversaId: 'c10',
    itens: [itemDe('LUM-001', 15), itemDe('LUM-002', 10), itemDe('LUM-005', 12)] });
  // c12: "Consegue fazer 8% no volume de 200 caixas?"
  novoPedidoBase(porId('cli-07'), 0, { status: 'orcamento', representadaId: 'rep-orvalho', origem: 'conversa', conversaId: 'c12',
    itens: [itemDe('ORV-010', 200)], observacoes: 'Cliente pediu 8% de desconto pelo volume.' });
  // c14: "Vamos fechar o contrato trimestral"
  novoPedidoBase(porId('cli-11'), 2, { status: 'pedido', representadaId: 'rep-bemcuidar', origem: 'conversa', conversaId: 'c14',
    itens: [itemDe('BEM-303', 120), itemDe('BEM-301', 80), itemDe('BEM-302', 60)] });
  // Prospects com orçamento aberto: c5 ("vou ver com meu sócio"), Café Aroma e Hortifruti.
  novoPedidoBase(porId('cli-15'), 0, { status: 'orcamento', representadaId: 'rep-orvalho', origem: 'conversa', conversaId: 'c5',
    itens: [itemDe('ORV-013', 10), itemDe('ORV-012', 6)], observacoes: 'Ofereci 5% à vista; ela vai ver com o sócio.' });
  novoPedidoBase(porId('cli-12'), 3, { status: 'orcamento', representadaId: 'rep-tropeiro', itens: [itemDe('TRO-101', 6)] });
  novoPedidoBase(porId('cli-09'), 5, { status: 'orcamento', representadaId: 'rep-pedrafina', itens: [itemDe('PFI-203', 20), itemDe('PFI-201', 40)] });
  // Um cliente novo (primeira compra), um reativado de inativo recente e um de inativo
  // antigo no mês corrente, para a positivação mostrar as quatro situações.
  const noMes = (dias) => Math.max(0, Math.min(dias, hoje().getDate() - 1));
  novoPedidoBase(porId('cli-20'), noMes(3), { status: 'faturado', representadaId: 'rep-pedrafina',
    itens: [itemDe('PFI-201', 30), itemDe('PFI-205', 10)], observacoes: 'Primeira compra.' });
  novoPedidoBase(porId('cli-06'), noMes(2), { status: 'pedido', representadaId: 'rep-lumiar',
    itens: [itemDe('LUM-001', 6), itemDe('LUM-004', 5)], observacoes: 'Voltou a comprar depois de quatro meses.' });
  novoPedidoBase(porId('cli-35'), noMes(4), { status: 'concluido', representadaId: 'rep-pedrafina',
    itens: [itemDe('PFI-203', 8), itemDe('PFI-204', 10)] });
  // Movimento de hoje e ontem, para a lista e os indicadores do dia não ficarem vazios.
  [['cli-23', 0, 'pedido'], ['cli-31', 0, 'orcamento'], ['cli-19', 1, 'pedido'], ['cli-27', 1, 'faturado'],
    ['cli-13', 1, 'faturado'], ['cli-34', 1, 'pedido']].forEach(([id, dias, status]) => novoPedidoBase(porId(id), dias, { status }));

  // Pedidos sorteados para mais tarde hoje ainda não aconteceram: ficam nos minutos antes de
  // agora, na ordem do sorteio e depois do último que já passou. Assim o número (pela ordem
  // sorteada, igual o dia todo) acompanha o horário mostrado na lista.
  (function antesDeAgora() {
    const agora = Date.now();
    const futuros = PEDIDOS_GERADOS.filter((p) => p._ordem > agora).sort((a, b) => a._ordem - b._ordem);
    if (!futuros.length) return;
    const ultimoQueJaPassou = PEDIDOS_GERADOS.reduce((max, p) => (p._ordem <= agora && p._ordem > max ? p._ordem : max), 0);
    const de = Math.max(ultimoQueJaPassou, agora - 90 * 60_000);
    const passo = (agora - de) / (futuros.length + 1);
    futuros.forEach((p, i) => { p.emitidoEm = new Date(de + passo * (i + 1)).toISOString(); });
  })();

  PEDIDOS_GERADOS.sort((a, b) => a._ordem - b._ordem);
  PEDIDOS_GERADOS.forEach((p, i) => { p.numero = 1001 + i; p.id = `ped-${p.numero}`; delete p._ordem; });

  const CONFIG = {
    diasAtivo: 90,
    diasInativoRecente: 180,
    curvaA: 80,
    curvaB: 95,
    usuarioAtual: 'usr-ana',
  };

  /**
   * O que cada papel pode no módulo. "carteira" = só os clientes e pedidos em que a pessoa
   * é a vendedora; "todos" = a conta inteira. Dono e administrador podem tudo.
   */
  const PERMISSOES = {
    owner: { clientes: ['ver', 'editar', 'excluir', 'bloquear'], pedidos: ['ver', 'editar', 'excluir'], representadas: ['ver', 'editar', 'excluir'], indicadores: ['ver'], escopo: 'todos' },
    admin: { clientes: ['ver', 'editar', 'excluir', 'bloquear'], pedidos: ['ver', 'editar', 'excluir'], representadas: ['ver', 'editar', 'excluir'], indicadores: ['ver'], escopo: 'todos' },
    member: { clientes: ['ver', 'editar'], pedidos: ['ver', 'editar'], representadas: ['ver'], indicadores: ['ver'], escopo: 'carteira' },
  };

  // ---------------------------------------------------------------------------------
  // Camada do visitante (localStorage)
  // ---------------------------------------------------------------------------------
  const TIPOS = ['representadas', 'produtos', 'clientes', 'pedidos', 'contatos', 'vendedores', 'permissoes', 'config'];
  function estadoVazio() {
    const e = { criados: {}, alterados: {}, excluidos: {} };
    TIPOS.forEach((t) => { e.criados[t] = []; e.alterados[t] = {}; e.excluidos[t] = []; });
    return e;
  }
  function lerEstado() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      if (salvo && salvo.criados) {
        const base = estadoVazio();
        TIPOS.forEach((t) => {
          base.criados[t] = salvo.criados[t] || [];
          base.alterados[t] = salvo.alterados?.[t] || {};
          base.excluidos[t] = salvo.excluidos?.[t] || [];
        });
        return base;
      }
    } catch { /* navegação privada ou valor corrompido: começa do zero */ }
    return estadoVazio();
  }
  let estado = lerEstado();
  function gravarEstado() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch { /* sem armazenamento: vale só nesta aba */ }
  }

  const BASE = {
    representadas: REPRESENTADAS, produtos: PRODUTOS, clientes: CLIENTES, pedidos: PEDIDOS_GERADOS, contatos: CONTATOS,
  };

  // Estado combinado (base + camada do visitante) guardado até a próxima mudança: os
  // indicadores consultam dezenas de vezes por tela. Uso interno, sem cópia; o que sai
  // pela API pública é sempre cópia, para a tela não alterar o dado sem querer.
  const cache = new Map();
  function bruto(tipo) {
    if (!cache.has(tipo)) {
      const alterados = estado.alterados[tipo];
      const excluidos = new Set(estado.excluidos[tipo]);
      const base = (BASE[tipo] || []).filter((x) => !excluidos.has(x.id))
        .map((x) => (alterados[x.id] ? { ...x, ...alterados[x.id] } : x));
      cache.set(tipo, [...base, ...estado.criados[tipo].filter((x) => !excluidos.has(x.id))]);
    }
    return cache.get(tipo);
  }
  const combinado = (tipo) => bruto(tipo).map(copia);

  function avisar(tipo, id) {
    cache.clear();
    window.dispatchEvent(new CustomEvent('vendas:mudou', { detail: { tipo, id } }));
  }
  window.addEventListener('storage', (ev) => {
    if (ev.key !== CHAVE && ev.key !== CHAVE_VER_COMO) return;
    estado = lerEstado();
    avisar('todos', null);
  });

  const PREFIXO = { representadas: 'rep', produtos: 'prd', clientes: 'cli', pedidos: 'ped', contatos: 'ct' };
  function novoId(tipo) {
    return `${PREFIXO[tipo] || tipo}-n${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  }

  function salvar(tipo, obj) {
    if (!TIPOS.includes(tipo)) throw new Error(`tipo desconhecido: ${tipo}`);
    const registro = copia(obj);
    const naBase = (BASE[tipo] || []).some((x) => x.id === registro.id);
    const criado = estado.criados[tipo].findIndex((x) => x.id === registro.id);
    if (registro.id && naBase) {
      estado.alterados[tipo][registro.id] = { ...(estado.alterados[tipo][registro.id] || {}), ...registro };
    } else if (registro.id && criado >= 0) {
      estado.criados[tipo][criado] = { ...estado.criados[tipo][criado], ...registro };
    } else {
      registro.id = novoId(tipo);
      registro.criadoEm = registro.criadoEm || new Date().toISOString();
      if (tipo === 'pedidos') {
        registro.numero = Math.max(...bruto('pedidos').map((p) => p.numero || 0)) + 1;
        const representada = bruto('representadas').find((r) => r.id === registro.representadaId);
        registro.comissaoRepresentada ??= representada ? representada.comissao : 0;
        registro.comissaoVendedor ??= vendedor(registro.vendedorId)?.comissao ?? 0;
        registro.emitidoEm = registro.emitidoEm || new Date().toISOString();
        registro.itens = registro.itens || [];
        registro.valorTotal = registro.valorTotal ?? totalDosItens(registro.itens);
      }
      estado.criados[tipo].push(registro);
    }
    gravarEstado();
    avisar(tipo, registro.id);
    return copia(bruto(tipo).find((x) => x.id === registro.id));
  }

  function excluir(tipo, id) {
    const criado = estado.criados[tipo].findIndex((x) => x.id === id);
    if (criado >= 0) estado.criados[tipo].splice(criado, 1);
    else if (!estado.excluidos[tipo].includes(id)) estado.excluidos[tipo].push(id);
    gravarEstado();
    avisar(tipo, id);
  }

  // ---------------------------------------------------------------------------------
  // Leitura
  // ---------------------------------------------------------------------------------
  const config = () => ({ ...CONFIG, ...(estado.alterados.config.geral || {}) });

  function vendedores() {
    return USUARIOS.map((u) => ({
      ...u, ...VENDEDORES[u.id], ...(estado.alterados.vendedores[u.id] || {}),
    }));
  }
  function vendedor(id) { return vendedores().find((v) => v.id === id) || null; }

  function permissoesDoPapel(papel) {
    return { ...copia(PERMISSOES[papel] || PERMISSOES.member), ...(estado.alterados.permissoes[papel] || {}) };
  }
  function verComo() {
    let id = null;
    try { id = localStorage.getItem(CHAVE_VER_COMO); } catch { /* sem armazenamento */ }
    return USUARIOS.find((u) => u.id === id) || USUARIOS[0];
  }
  function definirVerComo(id) {
    try { localStorage.setItem(CHAVE_VER_COMO, id); } catch { /* sem armazenamento */ }
    avisar('ver-como', id);
  }
  /** Pode `acao` ('ver', 'editar', 'excluir', 'bloquear') em `recurso`? */
  function pode(recurso, acao) {
    const p = permissoesDoPapel(verComo().papel);
    return (p[recurso] || []).includes(acao);
  }
  /** Vê o registro? Escopo "carteira" só enxerga o que é seu (vendedorId). */
  function enxerga(registro) {
    const p = permissoesDoPapel(verComo().papel);
    return p.escopo !== 'carteira' || !registro || registro.vendedorId === verComo().id;
  }

  // ---------------------------------------------------------------------------------
  // Regras do módulo
  // ---------------------------------------------------------------------------------
  function periodoDoMes(referencia = new Date()) {
    const de = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
    const ate = fimDoDia(new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0));
    return { de, ate };
  }

  /**
   * Filtros: { de, ate, representadaId, vendedorId, clienteIds, respeitarPermissao (padrão
   * true) }. `clienteIds` é o recorte por atributo do cliente (rede, cidade, bloqueio,
   * situação), já resolvido em ids por quem chama.
   */
  function pedidosFiltrados(f = {}) {
    const de = f.de ? new Date(f.de) : null;
    const ate = f.ate ? new Date(f.ate) : null;
    const clienteIds = f.clienteIds ? new Set(f.clienteIds) : null;
    return bruto('pedidos').filter((p) => {
      const em = new Date(p.emitidoEm);
      if (de && em < de) return false;
      if (ate && em > ate) return false;
      if (f.representadaId && p.representadaId !== f.representadaId) return false;
      if (f.vendedorId && p.vendedorId !== f.vendedorId) return false;
      if (clienteIds && !clienteIds.has(p.clienteId)) return false;
      if (f.respeitarPermissao !== false && !enxerga(p)) return false;
      return true;
    });
  }

  /** Situação do cliente na carteira numa data: ativo, inativo_recente, inativo_antigo ou prospect. */
  function situacaoDoCliente(clienteId, referencia = new Date(), f = {}) {
    const ate = fimDoDia(referencia);
    const vendas = pedidosFiltrados({ ...f, ate, respeitarPermissao: false })
      .filter((p) => p.clienteId === clienteId && ehVenda(p));
    if (!vendas.length) return { situacao: 'prospect', ultimaCompra: null, dias: null };
    const ultima = new Date(Math.max(...vendas.map((p) => new Date(p.emitidoEm).getTime())));
    const dias = Math.floor((inicioDoDia(ate) - inicioDoDia(ultima)) / DIA);
    const c = config();
    const situacao = dias <= c.diasAtivo ? 'ativo' : dias <= c.diasInativoRecente ? 'inativo_recente' : 'inativo_antigo';
    return { situacao, ultimaCompra: ultima.toISOString(), dias };
  }
  const NOMES_DA_SITUACAO = {
    ativo: 'Ativo', inativo_recente: 'Inativo recente', inativo_antigo: 'Inativo antigo', prospect: 'Prospect',
  };

  function clientesVisiveis(f = {}) {
    const clienteIds = f.clienteIds ? new Set(f.clienteIds) : null;
    return bruto('clientes').filter((c) => {
      if (f.vendedorId && c.vendedorId !== f.vendedorId) return false;
      if (f.representadaId && !c.representadaIds.includes(f.representadaId)) return false;
      if (clienteIds && !clienteIds.has(c.id)) return false;
      if (f.respeitarPermissao !== false && !enxerga(c)) return false;
      return true;
    });
  }

  /** Carteira na data `ate` do filtro (padrão: hoje). Prospects contam à parte, como no total. */
  function carteira(f = {}) {
    const referencia = f.ate ? new Date(f.ate) : new Date();
    const contagem = { ativo: 0, inativo_recente: 0, inativo_antigo: 0, prospect: 0 };
    const lista = clientesVisiveis(f).map((c) => {
      const s = situacaoDoCliente(c.id, referencia, { representadaId: f.representadaId });
      contagem[s.situacao] += 1;
      return { cliente: c, ...s };
    });
    const total = contagem.ativo + contagem.inativo_recente + contagem.inativo_antigo;
    return { total, ...contagem, lista };
  }

  function curvaABC(f = {}) {
    const periodo = f.de || f.ate ? f : { ...f, ...periodoDoMes() };
    const valores = new Map();
    pedidosFiltrados(periodo).filter(ehVenda).forEach((p) => {
      valores.set(p.clienteId, (valores.get(p.clienteId) || 0) + p.valorTotal);
    });
    const total = [...valores.values()].reduce((a, b) => a + b, 0);
    const clientes = bruto('clientes');
    const c = config();
    let acumulado = 0;
    const lista = [...valores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([clienteId, valor]) => {
        const antes = acumulado;
        acumulado += valor;
        const pctAntes = total ? (antes / total) * 100 : 0;
        const curva = pctAntes < c.curvaA ? 'A' : pctAntes < c.curvaB ? 'B' : 'C';
        return {
          cliente: clientes.find((x) => x.id === clienteId), valor,
          participacao: total ? (valor / total) * 100 : 0,
          acumulado: total ? (acumulado / total) * 100 : 0,
          curva,
        };
      });
    const contagem = { A: 0, B: 0, C: 0 };
    lista.forEach((l) => { contagem[l.curva] += 1; });
    return { total, ...contagem, lista };
  }

  /** Clientes positivados no período, por situação antes da compra, e a série diária. */
  function positivacoes(f = {}) {
    const periodo = f.de || f.ate ? f : { ...f, ...periodoDoMes() };
    const de = inicioDoDia(periodo.de);
    const ate = fimDoDia(periodo.ate);
    const vendas = pedidosFiltrados({ ...periodo, de, ate }).filter(ehVenda);
    const porCliente = new Map();
    const porDia = new Map();
    vendas.forEach((p) => {
      const dia = chaveDoDia(p.emitidoEm);
      if (!porDia.has(dia)) porDia.set(dia, new Set());
      porDia.get(dia).add(p.clienteId);
      if (!porCliente.has(p.clienteId)) porCliente.set(p.clienteId, p.emitidoEm);
      else if (p.emitidoEm < porCliente.get(p.clienteId)) porCliente.set(p.clienteId, p.emitidoEm);
    });
    const contagem = { novo: 0, ativo: 0, inativo_recente: 0, inativo_antigo: 0 };
    const vespera = new Date(de.getTime() - 1);
    porCliente.forEach((_, clienteId) => {
      const antes = situacaoDoCliente(clienteId, vespera, { representadaId: periodo.representadaId });
      contagem[antes.situacao === 'prospect' ? 'novo' : antes.situacao] += 1;
    });
    const ativosAntes = carteira({ ...periodo, ate: vespera }).ativo;
    const serie = [];
    for (let d = new Date(de); d <= ate; d.setDate(d.getDate() + 1)) {
      const chave = chaveDoDia(d);
      serie.push({ dia: chave, clientes: porDia.has(chave) ? porDia.get(chave).size : 0 });
    }
    return {
      total: porCliente.size, ...contagem,
      percentualDosAtivos: ativosAntes ? (contagem.ativo / ativosAntes) * 100 : 0,
      ativosNoInicio: ativosAntes,
      serie,
    };
  }

  function comissoes(pedido) {
    return {
      representada: Math.round(pedido.valorTotal * (pedido.comissaoRepresentada || 0) / 100),
      vendedor: Math.round(pedido.valorTotal * (pedido.comissaoVendedor || 0) / 100),
    };
  }

  /** Números do período: pedidos por status, vendas, ticket médio, série diária, comissões. */
  function resumo(f = {}) {
    const periodo = f.de || f.ate ? f : { ...f, ...periodoDoMes() };
    const pedidos = pedidosFiltrados(periodo);
    const vendas = pedidos.filter(ehVenda);
    const porStatus = Object.fromEntries(Object.keys(STATUS).map((s) => [s, 0]));
    pedidos.forEach((p) => { porStatus[p.status] += 1; });
    const valor = vendas.reduce((a, p) => a + p.valorTotal, 0);
    const porDia = new Map();
    vendas.forEach((p) => {
      const dia = chaveDoDia(p.emitidoEm);
      porDia.set(dia, (porDia.get(dia) || 0) + p.valorTotal);
    });
    const serie = [];
    if (periodo.de && periodo.ate) {
      for (let d = inicioDoDia(periodo.de); d <= fimDoDia(periodo.ate); d.setDate(d.getDate() + 1)) {
        const chave = chaveDoDia(d);
        serie.push({ dia: chave, valor: porDia.get(chave) || 0 });
      }
    }
    const somar = (campo) => vendas.reduce((a, p) => a + comissoes(p)[campo], 0);
    const agrupar = (campo) => {
      const m = new Map();
      vendas.forEach((p) => m.set(p[campo], (m.get(p[campo]) || 0) + p.valorTotal));
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([id, v]) => ({ id, valor: v }));
    };
    return {
      pedidos: pedidos.length, vendas: vendas.length, valor,
      ticketMedio: vendas.length ? Math.round(valor / vendas.length) : 0,
      porStatus, serie,
      comissaoRepresentadas: somar('representada'), comissaoVendedores: somar('vendedor'),
      porRepresentada: agrupar('representadaId'), porVendedor: agrupar('vendedorId'),
    };
  }

  // ---------------------------------------------------------------------------------
  // Formatos
  // ---------------------------------------------------------------------------------
  const fmt = {
    /** Centavos → "R$ 1.234,56". */
    brl: (centavos) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((centavos || 0) / 100),
    /** 0.75 → "0,75%". */
    pct: (n, casas = 2) => `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(n || 0)}%`,
    numero: (n) => new Intl.NumberFormat('pt-BR').format(n || 0),
    data: (iso) => new Date(iso).toLocaleDateString('pt-BR'),
    dataHora: (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    hora: (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    /** "Hoje", "Ontem", "segunda-feira" (até 6 dias) ou a data. */
    dia: (iso) => {
      const dias = Math.round((hoje() - inicioDoDia(iso)) / DIA);
      if (dias === 0) return 'Hoje';
      if (dias === 1) return 'Ontem';
      if (dias > 1 && dias < 7) return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^./, (l) => l.toUpperCase());
      return new Date(iso).toLocaleDateString('pt-BR');
    },
    /** "5511990000101" → "(11) 99000-0101". */
    telefone: (digitos) => {
      const d = String(digitos || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
      if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
      if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return String(digitos || '');
    },
    iniciais: (nome) => String(nome || '?').split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase(),
  };

  /** Avatar de representada sem logo: quadrado arredondado com as iniciais, na cor dela. */
  function logoDaRepresentada(representada) {
    if (representada.logo) return representada.logo;
    const letras = fmt.iniciais(representada.nomeFantasia);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="${representada.cor || '#2563eb'}"/><text x="48" y="58" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">${letras}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  /** Nome para um contato novo criado a partir do cliente: "Bom Preço 1", "Bom Preço 2"... */
  /** Nome do próximo contato novo do cliente ("Padaria Bom Jardim 1", "… 2"), sem repetir um
   * nome que já existe: depois de renomear o "… 1", a contagem sozinha sugeriria o "… 2" de novo. */
  function proximoNomeDeContato(cliente) {
    const base = cliente.nomeFantasia || cliente.razaoSocial;
    const normalizar = (nome) => String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const nomes = bruto('contatos').map((c) => c.nome);
    const usados = new Set(nomes.map(normalizar));
    let n = nomes.filter((nome) => nome.startsWith(`${base} `)).length + 1;
    while (usados.has(normalizar(`${base} ${n}`))) n += 1;
    return `${base} ${n}`;
  }

  /** Bloqueia ou desbloqueia o cliente e todos os contatos vinculados a ele. */
  function bloquearCliente(clienteId, bloquear = true) {
    const cliente = copia(bruto('clientes').find((c) => c.id === clienteId) || null);
    if (!cliente) return null;
    cliente.contatoIds.forEach((contatoId) => {
      const contato = bruto('contatos').find((c) => c.id === contatoId);
      if (contato) salvar('contatos', { ...contato, bloqueado: bloquear });
    });
    return salvar('clientes', { ...cliente, bloqueado: bloquear, bloqueadoEm: bloquear ? new Date().toISOString() : null });
  }

  window.vendas = {
    CHAVE, STATUS, NOMES_DA_SITUACAO, SEGMENTOS, REDES, MARCADORES,
    // leitura
    usuarios: () => copia(USUARIOS),
    vendedores, vendedor,
    representadas: () => combinado('representadas'),
    representada: (id) => copia(bruto('representadas').find((r) => r.id === id) || null),
    produtos: (representadaId) => combinado('produtos').filter((p) => !representadaId || p.representadaId === representadaId),
    /** Clientes visíveis para quem está vendo (escopo "carteira" só vê os seus). */
    clientes: (f) => clientesVisiveis(f || {}).map(copia),
    cliente: (id) => copia(bruto('clientes').find((c) => c.id === id) || null),
    /** Pedidos do mais novo para o mais antigo, já no escopo de quem está vendo. */
    pedidos: (f) => pedidosFiltrados(f || {}).map(copia).sort((a, b) => b.emitidoEm.localeCompare(a.emitidoEm)),
    pedido: (id) => copia(bruto('pedidos').find((p) => p.id === id) || null),
    contatos: () => combinado('contatos'),
    contato: (id) => copia(bruto('contatos').find((c) => c.id === id) || null),
    contatosDoCliente: (clienteId) => {
      const cliente = bruto('clientes').find((c) => c.id === clienteId);
      return cliente ? cliente.contatoIds.map((id) => bruto('contatos').find((c) => c.id === id)).filter(Boolean).map(copia) : [];
    },
    config,
    // escrita
    salvar, excluir, bloquearCliente, proximoNomeDeContato,
    /** Liga ou desliga a função de vendedor e a comissão (% sobre o valor do pedido). */
    salvarVendedor: (id, dados) => {
      estado.alterados.vendedores[id] = { ...(estado.alterados.vendedores[id] || {}), ...dados };
      gravarEstado();
      avisar('vendedores', id);
    },
    salvarConfig: (parcial) => { estado.alterados.config.geral = { ...(estado.alterados.config.geral || {}), ...parcial }; gravarEstado(); avisar('config', 'geral'); },
    resetar: () => { estado = estadoVazio(); gravarEstado(); avisar('todos', null); },
    // permissões
    verComo, definirVerComo, pode, enxerga, permissoesDoPapel,
    /** O padrão de fábrica do papel, sem o que o visitante alterou (para "restaurar padrão"). */
    permissoesPadrao: (papel) => copia(PERMISSOES[papel] || PERMISSOES.member),
    salvarPermissoes: (papel, parcial) => { estado.alterados.permissoes[papel] = { ...(estado.alterados.permissoes[papel] || {}), ...parcial }; gravarEstado(); avisar('permissoes', papel); },
    // regras
    ehVenda, situacaoDoCliente, carteira, curvaABC, positivacoes, resumo, comissoes, periodoDoMes, totalDosItens,
    // formatos
    fmt, logoDaRepresentada,
    /** Avisa quando qualquer dado do módulo muda (nesta aba ou em outra). */
    aoMudar: (fn) => window.addEventListener('vendas:mudou', (ev) => fn(ev.detail)),
  };

  // ---------------------------------------------------------------------------------
  // "Ver como": anotação do protótipo (não é tela do produto) para mostrar as
  // permissões. Troca quem está usando o sistema; as telas do módulo se redesenham
  // com o que essa pessoa pode ver e fazer.
  // ---------------------------------------------------------------------------------
  function montarVerComo() {
    if (document.getElementById('mockup-ver-como')) return;
    const estilo = document.createElement('style');
    estilo.textContent = `
      /* Abaixo de qualquer modal do app (que começam em z-index 50) e acima da página. */
      .mockup-ver-como {
        position: fixed; left: 118px; bottom: 12px; z-index: 45;
        display: inline-flex; align-items: center; gap: 6px; padding: 3px 6px 3px 10px; border-radius: 999px;
        background: rgba(15, 23, 42, .78); color: #fff; font: 600 11px/1.6 Inter, system-ui, sans-serif;
      }
      .mockup-ver-como select {
        max-width: 170px; border: 0; border-radius: 999px; padding: 1px 6px; background: rgba(255, 255, 255, .16); color: #fff;
        font: 600 11px/1.6 Inter, system-ui, sans-serif !important; text-overflow: ellipsis; cursor: pointer;
      }
      .mockup-ver-como option { color: #0f172a; }
      @media (max-width: 768px) {
        .mockup-ver-como { left: auto; right: 12px; bottom: calc(118px + env(safe-area-inset-bottom)); }
        .mockup-ver-como select { max-width: 120px; }
      }
    `;
    document.head.appendChild(estilo);
    const caixa = document.createElement('label');
    caixa.id = 'mockup-ver-como';
    caixa.className = 'mockup-ver-como';
    caixa.title = 'Protótipo: troque a pessoa para ver as permissões de cada função';
    caixa.append('Ver como');
    const seletor = document.createElement('select');
    USUARIOS.forEach((u) => {
      const opcao = document.createElement('option');
      opcao.value = u.id;
      opcao.textContent = `${u.nome} (${u.papelNome})`;
      seletor.append(opcao);
    });
    seletor.value = verComo().id;
    seletor.addEventListener('change', () => {
      definirVerComo(seletor.value);
      window.mockup?.avisar?.(`Agora vendo como ${verComo().nome}`);
    });
    window.addEventListener('vendas:mudou', () => { seletor.value = verComo().id; });
    caixa.append(seletor);
    document.body.append(caixa);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarVerComo);
  else montarVerComo();
})();
