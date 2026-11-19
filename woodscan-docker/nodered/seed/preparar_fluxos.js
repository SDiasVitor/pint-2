// Adapta um flows.json exportado do Windows para rodar no Docker.
// Uso: node preparar_fluxos.js <flows.json de origem> <pasta de destino>
const fs = require('fs');
const path = require('path');

const [origem, destino] = process.argv.slice(2);
let dados = JSON.parse(fs.readFileSync(origem, 'utf8'));
const fluxos = Array.isArray(dados) ? dados : dados.flows;

// C:\woodscan\arquivo.csv  ->  /data/woodscan/arquivo.csv  (aceita \, \\ ou /)
const trocaCaminho = (texto) => texto.replace(/C:[\\/]+woodscan[\\/]+/gi, '/data/woodscan/');

const credenciais = {};
let arquivos = 0;
let bancos = 0;

for (const no of fluxos) {
    if (no.type === 'MySQLdatabase') {
        no.host = 'mysql';
        no.port = '3306';
        no.db = 'woodscan';
        credenciais[no.id] = { user: 'root', password: 'woodscan' };
        bancos++;
    }
    if ((no.type === 'file' || no.type === 'file in') && typeof no.filename === 'string') {
        const novo = trocaCaminho(no.filename);
        if (novo !== no.filename) arquivos++;
        no.filename = novo;
    }
    if (no.type === 'function') {
        for (const campo of ['func', 'initialize', 'finalize']) {
            if (typeof no[campo] === 'string') {
                const novo = trocaCaminho(no[campo]);
                if (novo !== no[campo]) arquivos++;
                no[campo] = novo;
            }
        }
    }
}

fs.writeFileSync(path.join(destino, 'flows.json'), JSON.stringify(fluxos, null, 2));
fs.writeFileSync(path.join(destino, 'flows_cred.json'), JSON.stringify(credenciais, null, 2));
console.log(`[WoodScan] fluxos preparados: ${fluxos.length} nos, ${arquivos} caminhos de CSV ajustados, ${bancos} conexao(oes) MySQL apontando para o container "mysql".`);
