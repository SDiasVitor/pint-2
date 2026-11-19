FROM nodered/node-red:4.0

# no do MySQL usado nos fluxos
RUN npm install --no-fund --no-update-notifier node-red-node-mysql

# fluxos e configuracao iniciais (copiados para /data na primeira vez)
COPY --chown=node-red:node-red seed/ /seed/
COPY --chown=node-red:node-red --chmod=755 woodscan-start.sh /usr/src/node-red/woodscan-start.sh

ENTRYPOINT ["/usr/src/node-red/woodscan-start.sh"]
