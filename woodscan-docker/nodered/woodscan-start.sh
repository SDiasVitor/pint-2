#!/bin/sh
# Na primeira vez, prepara os fluxos do WoodScan dentro do container:
#   - caminhos C:\woodscan\... viram /data/woodscan/...
#   - o banco passa a ser o container "mysql"
# (a imagem oficial ja traz um flows.json vazio, por isso usamos um arquivo-marcador)
# Depois disso o Node-RED usa o que estiver salvo em /data (edicoes no editor nao se perdem).
set -e
mkdir -p /data/woodscan
if [ ! -f /data/.woodscan_preparado ]; then
  cp /seed/settings.js /data/settings.js
  # o flows.json de exemplo da imagem pertence ao root: apaga antes de gravar o nosso
  rm -f /data/flows.json /data/flows_cred.json
  node /seed/preparar_fluxos.js /seed/flows.json /data
  touch /data/.woodscan_preparado
fi
exec /usr/src/node-red/entrypoint.sh "$@"
