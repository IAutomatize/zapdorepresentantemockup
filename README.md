# Protótipos — Zap do Representante

Telas de demonstração para o cliente aprovar features antes de elas serem construídas no
sistema. O visual é idêntico ao do produto: o CSS é copiado do app, e a marcação de cada tela
base é capturada do app real rodando com dados fictícios. Não existe backend; o comportamento
é escrito à mão, em JavaScript inline em cada página.

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
index.html            lista dos protótipos (o que o cliente abre primeiro)
chat.html             tela de Conversas: captura do app + bloco inline do mockup no fim
css/                  cópia do CSS do app (não editar aqui; rode o sync)
*.png, *.svg, *.ico   logos e favicon do app
tools/sync.sh         atualiza css/ e imagens a partir do app
tools/capture/        gera a base estática de uma tela a partir do app real
```

## Mostrar uma feature nova ao cliente

1. Copie a tela base: `cp chat.html chat-nome-da-feature.html`. Ou edite o `chat.html`, se a
   feature for na própria tela de conversas.
2. Edite à vontade. A marcação de cima é a do app; o bloco `MOCKUP` no fim do arquivo tem os
   dados fictícios e o comportamento (trocar de conversa, enviar mensagem). Reaproveite as
   classes que já existem para o visual continuar igual ao produto.
3. Adicione um cartão em `index.html` apontando para a página nova.
4. `git add -A && git commit -m "..." && git push`. O Pages publica em cerca de 1 minuto.
5. Mande o link direto da página para o cliente.

Abrir localmente: `python3 -m http.server 8000` na raiz e acesse `http://localhost:8000`.

## Atualizar o visual quando o app mudar

```bash
./tools/sync.sh          # copia css/ e imagens de ../zap-empresarial
```

O sync atualiza só o CSS. A marcação das páginas fica como foi capturada; se o app mudar a
estrutura de uma tela, recapture (abaixo) e refaça a página a partir da base nova.

## Capturar uma tela nova do app

Precisa do Google Chrome, Node 22 e do app em `../zap-empresarial` (o `dist/` dele já vem
compilado).

```bash
node tools/capture/capture.mjs kanban "/kanban.html"
node tools/capture/capture.mjs chat "/chats.html?chat=c1"
```

O script sobe um servidor local com os arquivos do app, troca a API inteira por respostas
fixas (`tools/capture/mock-api.js`), abre a página no Chrome headless e salva em
`tools/capture/out/` (fora do git):

- `<nome>.raw.html`: o DOM exatamente como o navegador renderizou;
- `<nome>.html`: o mesmo DOM, sem nenhum `<script>` e com caminhos relativos;
- `<nome>.png`: print do estado capturado.

No fim ele lista as rotas da API que a página chamou e não tinham resposta preparada. Se a
tela vier vazia, acrescente a fixture dessa rota no `mock-api.js` e capture de novo.

A captura nunca escreve na raiz. Para começar a página, copie `out/<nome>.html` para a raiz
e escreva o bloco `MOCKUP` no fim, seguindo o do `chat.html`.
