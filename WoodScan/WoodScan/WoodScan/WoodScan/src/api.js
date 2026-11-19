// src/api.js
// Troque pelo IP real do Node-RED (Tailscale ou rede local).
const BASE_URL = 'http://localhost:1880';

async function chamarApi(caminho, opcoes = {}) {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro ${resposta.status}`);
  }
  return dados;
}

// --- Autenticação ---
export function login(loginUsuario, senha) {
  return chamarApi('/api/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginUsuario, senha }),
  });
}

export function cadastrarUsuario({ nome, login: loginUsuario, senha, perfil }) {
  return chamarApi('/api/usuarios', {
    method: 'POST',
    body: JSON.stringify({ nome, login: loginUsuario, senha, perfil }),
  });
}

// --- Esteiras ---
export function getEsteiras() {
  return chamarApi('/api/esteiras');
}

export function getEsteira(esteiraId) {
  return chamarApi(`/api/esteiras/${esteiraId}`);
}

export function cadastrarEsteira({ codigo, nome }) {
  return chamarApi('/api/esteiras', {
    method: 'POST',
    body: JSON.stringify({ codigo, nome }),
  });
}

export function excluirEsteira(esteiraId) {
  return chamarApi(`/api/esteiras/${esteiraId}`, {
    method: 'DELETE',
  });
}

// --- Histórico ---
export function getHistorico(dias = 7) {
  return chamarApi(`/api/historico?dias=${dias}`);
}

// --- Manutenção ---
// Confere se o login/senha são de alguém com perfil de manutenção
export function loginManutencao(loginUsuario, senha) {
  return chamarApi('/api/manutencao/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginUsuario, senha }),
  });
}

// Devolve { ultimas: { esteira1: { data_hora, responsavel, observacao } }, registros: [...] }
export function getManutencoes() {
  return chamarApi('/api/manutencoes');
}

// O login e a senha vão junto: o Node-RED confere de novo antes de gravar
export function registrarManutencao({ login: loginUsuario, senha, esteira, dataHora, observacao }) {
  return chamarApi('/api/manutencoes', {
    method: 'POST',
    body: JSON.stringify({
      login: loginUsuario,
      senha,
      esteira,
      data_hora: dataHora,
      observacao,
    }),
  });
}

// --- Parada para manutenção ---
// Devolve { esteiras: { esteira1: { parada: false, parada_em: null }, ... } }
export function getStatusEsteiras() {
  return chamarApi('/api/status-esteiras');
}

// Para a produção da esteira (qualquer usuário logado pode parar)
export function pararEsteira(esteiraId) {
  return chamarApi(`/api/esteiras/${esteiraId}/parada`, {
    method: 'POST',
    body: JSON.stringify({ parada: true }),
  });
}

// Libera a esteira: só a manutenção (o Node-RED confere login e senha no banco)
export function liberarEsteira({ esteira, login: loginUsuario, senha, tipoManutencao, defeito, observacao }) {
  return chamarApi(`/api/esteiras/${esteira}/liberar`, {
    method: 'POST',
    body: JSON.stringify({
      login: loginUsuario,
      senha,
      tipo_manutencao: tipoManutencao,
      defeito,
      observacao,
    }),
  });
}

// Histórico das paradas: { registros: [...], total_min_por_esteira: { esteira1: 95 } }
export function getParadas() {
  return chamarApi('/api/paradas');
}

// --- Dashboard ---
// data no formato AAAA-MM-DD. Devolve { data, ultima_hora, total, por_hora: { esteira1: [24 números] } }
export function getDashboard(data) {
  return chamarApi(`/api/dashboard?data=${data}`);
}

// Manutenção no dashboard: tempo parado e defeitos entre duas datas (AAAA-MM-DD).
// Sem datas = todo o período.
export function getDashboardManutencao(inicio, fim) {
  const parametros = new URLSearchParams();
  if (inicio) parametros.set('inicio', inicio);
  if (fim) parametros.set('fim', fim);
  return chamarApi(`/api/dashboard/manutencao?${parametros.toString()}`);
}

// Tipo da máquina (serra, guilhotina, laminadora): a Raspberry usa para criar o objeto certo
export function definirTipoEsteira(esteiraId, tipo) {
  return chamarApi(`/api/esteiras/${esteiraId}/tipo`, {
    method: 'POST',
    body: JSON.stringify({ tipo }),
  });
}

// --- Análise de dados ---
// Devolve { data, ultima_hora, esteiras: { esteira1: { brutas, descartadas,
//   temperatura: { "25.3": 12 }, umidade: { ... }, laminas_por_hora: [24 números] } } }
export function getAnalise(data) {
  return chamarApi(`/api/analise?data=${data}`);
}
