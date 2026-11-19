// Configuracao do Node-RED do WoodScan (dentro do Docker)
module.exports = {
    uiPort: process.env.PORT || 1880,
    flowFile: 'flows.json',
    // credenciais (usuario/senha do MySQL) ficam em texto simples no flows_cred.json
    credentialSecret: false,
    // permite o "fs" nos nos function (gravar e ler os CSV)
    functionExternalModules: true,
    functionGlobalContext: {},
    // libera o acesso a API vindo de outros enderecos (Raspberry Pi, testes)
    httpNodeCors: {
        origin: '*',
        methods: 'GET,PUT,POST,DELETE'
    },
    logging: {
        console: { level: 'info', metrics: false, audit: false }
    },
    editorTheme: {
        projects: { enabled: false }
    }
};
