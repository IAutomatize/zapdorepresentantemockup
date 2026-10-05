#!/usr/bin/env bash
# Copia do app o CSS e as imagens que os mockups usam, para o visual ficar idêntico ao
# produto atual. Rode sempre que o CSS do app mudar.
#
#   ./tools/sync.sh                       # app em ../zap-empresarial
#   APP_DIR=/outro/caminho ./tools/sync.sh
#
# Copia só arquivo estático de visual. Nunca copia JS, .env, src/ ou qualquer coisa do
# backend: este repositório é público.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="${APP_DIR:-$RAIZ/../zap-empresarial}"

[ -d "$APP_DIR/css" ] || { echo "app não encontrado em $APP_DIR" >&2; exit 1; }

rm -rf "$RAIZ/css"
mkdir -p "$RAIZ/css"
cp "$APP_DIR"/css/*.css "$RAIZ/css/"

for arquivo in logo.png logosvg.svg secundary-logo.png favicon.svg favicon.ico; do
  cp "$APP_DIR/$arquivo" "$RAIZ/$arquivo"
done

echo "sincronizado de $APP_DIR ($(ls "$RAIZ/css" | wc -l | tr -d ' ') arquivos CSS)"
