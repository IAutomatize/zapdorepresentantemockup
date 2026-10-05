# Protótipos — Zap do Representante

Telas de demonstração para o cliente aprovar features antes de elas serem construídas no
sistema. O visual é idêntico ao do produto: o CSS é copiado do app, e a marcação de cada tela
é capturada do app real rodando com dados fictícios. Não existe backend; o comportamento é
escrito à mão, em JavaScript inline no fim de cada página.

Publicado pelo GitHub Pages a partir da `main`:
**https://iautomatize.github.io/zapdorepresentantemockup/**

## Regras

- **Só dados fictícios.** O repositório é público. Nunca coloque nome, telefone, e-mail ou
  conversa de cliente real, nem print do sistema em produção.
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
tools/testar.mjs        abre uma tela como o Pages serve e aponta erros e 404
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
4. Confira: `node tools/testar.mjs chats-nome-da-feature`.
5. `git add -A && git commit -m "..." && git push`. O Pages publica em cerca de 1 minuto.
6. Mande o link direto da página para o cliente.

Abrir localmente: `python3 -m http.server 8000` na raiz e acesse `http://localhost:8000`.

## Atualizar quando o app mudar

```bash
./tools/sync.sh                                         # só o CSS e as imagens
node tools/capture/capture.mjs kanban "/kanban.html"    # recaptura a marcação
node tools/capture/montar.mjs kanban                    # troca a parte capturada, mantém o bloco MOCKUP
node tools/testar.mjs kanban
```

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

No fim ele lista as rotas da API que a tela chamou sem resposta preparada. Se a tela vier
vazia ou com erro, leia no app o formato que ela espera, acrescente a rota em
`fixtures/<tela>.js` e capture de novo. Para várias capturas ao mesmo tempo, use portas
diferentes: `PORTA_APP=47921 PORTA_CDP=9351`.

A captura nunca escreve na raiz. `node tools/capture/montar.mjs <tela>` cria a página (com um
bloco MOCKUP vazio) ou, se ela já existe, troca só a parte capturada.
