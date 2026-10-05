# Protótipos — Zap do Representante

Telas de demonstração para o cliente aprovar features antes de elas serem construídas no
sistema. O visual é idêntico ao do produto: o CSS é copiado do app, e a marcação de cada tela
é capturada do app real rodando com dados fictícios. Não existe backend; o comportamento é
escrito à mão, em JavaScript inline no fim de cada página.

Publicado pelo GitHub Pages a partir da `main`:
**https://iautomatize.github.io/zapdorepresentantemockup/**

## Regras

- **Só dados fictícios.** O repositório é público. Nunca coloque nome, telefone, e-mail ou
  conversa de cliente real, nem print do sistema em produção. Antes de todo push rode
  `node tools/verificar-dados.mjs`: ele falha se achar telefone, e-mail, link de WhatsApp ou
  domínio que não seja do universo fictício.
- **Nada do backend.** Não copie JS do app, `.env`, `src/` nem chaves. O `tools/sync.sh` só
  traz CSS e imagens.
- **Protótipo não é produto.** Feature aprovada aqui é construída do zero no
  `zap-empresarial`. O código daqui serve de referência visual, não é reaproveitado.

## Estrutura

```
index.html              lista das telas (o que o cliente abre primeiro)
<tela>.html             uma página por tela, com o MESMO nome do app (dashboard.html,
                        chats.html, kanban.html...), para os links da barra lateral funcionarem
mockup-comum.js         o que é igual em todas as telas: selo "Protótipo", avisos, menu do
                        celular, tema claro/escuro, "Sair", links para fora do protótipo
css/                    cópia do CSS do app (não editar aqui; rode o sync)
*.png, *.svg, *.ico     logos e favicon do app
tools/sync.sh           atualiza css/ e imagens a partir do app
tools/recapturar.sh     refaz a parte capturada de todas as telas, testa e confere os dados
tools/testar.mjs        abre uma tela como o Pages serve e aponta erros, 404 e bloqueio de CSP
tools/verificar-dados.mjs  garante que só há dado fictício (rode antes de todo push)
tools/capture/          gera e atualiza a parte capturada de cada tela
  mock-api.js           troca a API por um registro de rotas
  fixtures/comum.js     universo fictício: conta, equipe, 24 contatos, 14 conversas, Kanban
  fixtures/<tela>.js    rotas só daquela tela
  capture.mjs           roda a tela do app no Chrome headless e salva o DOM em out/
  montar.mjs            junta out/<tela>.html com o bloco MOCKUP da página
```

Cada `<tela>.html` tem duas partes: em cima, a marcação capturada do app; no fim, depois de
`<!-- MOCKUP:INICIO`, o bloco escrito à mão com os dados e o comportamento da tela.

## Mostrar uma feature nova ao cliente

1. Copie a tela: `cp chats.html chats-nome-da-feature.html`. Ou edite a própria tela.
2. Edite à vontade. Reaproveite as classes que já existem na marcação capturada para o
   visual continuar igual ao produto, e escreva o comportamento no bloco MOCKUP.
3. Se for uma página nova, acrescente o nome dela em `PAGINAS` no `mockup-comum.js` (senão
   o link mostra o aviso de "fora do protótipo") e um cartão em `index.html`.
4. Confira: `node tools/testar.mjs chats-nome-da-feature` e `node tools/verificar-dados.mjs`.
5. `git add -A && git commit -m "..." && git push`. O Pages publica em cerca de 1 minuto.
6. Mande o link direto da página para o cliente.

Abrir localmente: `python3 -m http.server 8000` na raiz e acesse `http://localhost:8000`.

## Atualizar quando o app mudar (ou as datas ficarem velhas)

As datas da parte capturada ficam congeladas no dia da captura: depois de algumas semanas,
"agendada para 07/10" vai parecer passado. Recapturar resolve:

```bash
./tools/sync.sh                  # CSS e imagens do app
./tools/recapturar.sh            # todas as telas: captura, montagem, testes e verificação de dados
./tools/recapturar.sh kanban     # só uma
```

O `recapturar.sh` tem o comando de captura de cada tela. Algumas precisam de cliques na
captura (eles deixam renderizados os modais que o bloco MOCKUP usa); os comandos estão também
no topo do bloco MOCKUP de cada página. Se mudar um, mude o outro.

A limpeza da captura também protege o repositório público: troca por `#` qualquer link para o
sistema real ou para `wa.me`, e troca celular com cara de real (como o exemplo de formato na
tela de Campanhas do app) pelo fictício.

## Capturar uma tela

Precisa do Google Chrome, Node 22 e do app em `../zap-empresarial` (o `dist/` dele já vem
compilado).

```bash
node tools/capture/capture.mjs <tela> "/<tela>.html" [espera_ms] [ações...]
node tools/capture/capture.mjs chats "/chats.html?chat=c1"
node tools/capture/capture.mjs settings "/settings.html" 7000 "@[data-tab=tags]" "~1500"
```

O script sobe um servidor local com os arquivos do app, injeta `mock-api.js`,
`fixtures/comum.js` e `fixtures/<tela>.js`, abre a página no Chrome headless, executa as
ações e salva em `tools/capture/out/` (fora do git):

- `<tela>.raw.html`: o DOM exatamente como o navegador renderizou;
- `<tela>.html`: o mesmo DOM sem os scripts do app, com caminhos relativos, gráficos de
  `<canvas>` convertidos em imagem e o `mockup-comum.js` no `<head>`;
- `<tela>.png`: print do estado capturado.

Ações: `@seletor` clica, `~ms` espera, `js:expressão` avalia na página. No zsh, ponha cada
ação entre aspas (`"~500"`), senão o `~` vira diretório.

Estados que só existem depois de um clique (um modal preenchido, um menu aberto) entram na
página como `<template>`: ou por capturas extras copiadas para o bloco MOCKUP, ou por uma
função na fixture da tela que percorre os estados durante a captura e grava cada um como
`<template>` (veja `capturarEstados` em `fixtures/dashboard.js` e `__capturarMoldes` em
`fixtures/settings.js`). O bloco MOCKUP só clona esses moldes: não escreve marcação do app à
mão.

No fim ele lista as rotas da API que a tela chamou sem resposta preparada. Se a tela vier
vazia ou com erro, leia no app o formato que ela espera, acrescente a rota em
`fixtures/<tela>.js` e capture de novo. Para várias capturas ao mesmo tempo, use portas
diferentes: `PORTA_APP=47921 PORTA_CDP=9351`.

A captura nunca escreve na raiz. `node tools/capture/montar.mjs <tela>` cria a página (com um
bloco MOCKUP vazio) ou, se ela já existe, troca só a parte capturada.
