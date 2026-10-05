#!/usr/bin/env bash
# Recaptura a parte do app de cada tela (marcação e datas atuais), preserva o bloco MOCKUP,
# testa e confere que só há dado fictício. Rode quando o app mudar ou quando as datas
# capturadas ficarem velhas ("agendada para" já no passado).
#
#   ./tools/recapturar.sh                 # todas as telas
#   ./tools/recapturar.sh kanban chats    # só estas
#
# Precisa do Chrome, do Node 22 e do app em ../zap-empresarial.
# Os comandos de cada tela são os documentados no topo do bloco MOCKUP dela: as ações
# deixam renderizados (e escondidos) os estados que o bloco usa. Mudou um, mude o outro.
set -euo pipefail
cd "$(dirname "$0")/.."

TELAS=(dashboard chats kanban contacts stories campaigns agendadas tasks calendar settings ajuda)
[ $# -gt 0 ] && TELAS=("$@")

# O CSS do calendário (Vue) não existe no protótipo: a captura troca o <link> por <style>.
CSS_CALENDARIO='js:(async()=>{const l=[...document.querySelectorAll("link")].find(x=>x.href.includes("calendar/calendar.css"));const css=await (await fetch(l.href)).text();const s=document.createElement("style");s.setAttribute("data-mockup-css","dist/calendar/calendar.css");s.textContent=css;l.replaceWith(s);return 1})()'

capturar() {
  local tela="$1"
  local cap=(node tools/capture/capture.mjs)
  case "$tela" in
    dashboard) "${cap[@]}" dashboard "/dashboard.html" 7000 "js:window.__mockDashboard.capturarEstados()" ;;
    chats)     "${cap[@]}" chats "/chats.html?chat=c1" 8000 ;;
    kanban)    "${cap[@]}" kanban "/kanban.html" ;;
    tasks)     "${cap[@]}" tasks "/tasks.html" ;;
    stories)   "${cap[@]}" stories "/stories.html" ;;
    agendadas) "${cap[@]}" agendadas "/agendadas.html" 7000 "js:window.__mockAgendadas.capturarEstados()" ;;
    calendar)  "${cap[@]}" calendar "/calendar.html" 7000 "$CSS_CALENDARIO" ;;
    settings)  "${cap[@]}" settings "/settings.html" 8000 "js:__capturarMoldes()" ;;
    ajuda)     "${cap[@]}" ajuda "/ajuda.html" 6000 ;;
    contacts)
      "${cap[@]}" contacts "/contacts.html" 7000 "@#filters-btn" "~300" \
        "@#filters-btn" "@#import-whatsapp-btn" "~600" "@#whatsapp-import-cancel" "@.btn-chat" \
        "~800" "@#start-chat-cancel" "@.delete-contact-btn" "~300" "@.confirm-cancel" "~400" \
        "@#add-contact-btn" "@.contact-modal-close-btn" "js:__mock.abrirPlanilha()" "~600" \
        "@#csv-mapping-cancel" "@#groups-tab-btn" "~1200" "@#contacts-tab-btn" "~300" ;;
    campaigns)
      "${cap[@]}" campaigns "/campaigns.html" 7000 "@#new-campaign-btn" \
        "~1500" "@input[name=audience_type][value=manual]" "~900" \
        "@input[name=audience_type][value=kanban]" "~400" "@#campaign-quick-replies-btn" \
        "~1200" "@[data-campaign-quick-close]" "~300" "@#campaign-modal .cancel-btn" "~300" \
        "@#new-category-btn" "~900" "@.hub-edit-category" "~900" \
        "@#edit-category-modal .modal-close" "~300" "@#new-category-btn" "~900" \
        "@#categories-hub-new" "~900" "@#new-category-modal .modal-close" "~300" \
        "@#new-category-btn" "~700" "@#categories-hub-close" "~300" "@.btn-details" "~900" \
        "@#campaign-details-modal .campaigns-report-close" "~300" ;;
    *) echo "tela desconhecida: $tela" >&2; return 1 ;;
  esac
}

for tela in "${TELAS[@]}"; do
  echo "==> $tela"
  capturar "$tela"
  node tools/capture/montar.mjs "$tela"
done

echo "==> testes"
for tela in "${TELAS[@]}"; do node tools/testar.mjs "$tela"; done

echo "==> dados"
node tools/verificar-dados.mjs
