// src/pages/Dashboard.jsx
// Dashboard: produção (por hora e total do dia) e manutenção (tempo parado e defeitos).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GraficoLinhas from '../components/GraficoLinhas';
import GraficoColunas from '../components/GraficoColunas';
import GraficoBarrasEmpilhadas from '../components/GraficoBarrasEmpilhadas';
import { formatarDuracao } from './Manutencao';
import * as api from '../api';

const TOTAL_CORES = 8; // cores definidas no App.css (--serie-1 a --serie-8)

const PERIODOS_MANUTENCAO = [
  { id: 'dia', nome: 'Dia selecionado' },
  { id: '7', nome: 'Últimos 7 dias' },
  { id: '30', nome: 'Últimos 30 dias' },
  { id: 'tudo', nome: 'Todo o período' },
];

function dataLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const hojeLocal = () => dataLocal(new Date());

function diasAtras(quantidade) {
  const d = new Date();
  d.setDate(d.getDate() - quantidade);
  return dataLocal(d);
}

function inicioDoDia(texto) {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

const rotuloHora = (h) => `${String(h).padStart(2, '0')}h`;
const numero = (n) => (n ?? 0).toLocaleString('pt-BR');
// 120 -> "2h", 95 -> "1h 35min", 0 -> "0min"
const minutosEmTexto = (minutos) =>
  minutos > 0 ? formatarDuracao(minutos * 60000).replace(/ 0min$/, '') : '0min';
const nomeDefeito = (texto) => (texto === 'Nao informado' ? 'Não informado' : texto);

export default function Dashboard() {
  const [data, setData] = useState(hojeLocal);
  const [dados, setDados] = useState(null); // resposta do /api/dashboard
  const [cadastro, setCadastro] = useState([]); // esteiras cadastradas (nome e ordem)
  const [ocultas, setOcultas] = useState([]); // códigos das esteiras escondidas nos gráficos
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  // manutenção
  const [periodo, setPeriodo] = useState('dia');
  const [manutencao, setManutencao] = useState(null); // resposta do /api/dashboard/manutencao
  const [situacoes, setSituacoes] = useState({}); // paradas em andamento
  const [erroManutencao, setErroManutencao] = useState('');

  useEffect(() => {
    api
      .getEsteiras()
      .then(setCadastro)
      .catch(() => setCadastro([]));
  }, []);

  useEffect(() => {
    setCarregando(true);
    carregar();
    if (data !== hojeLocal()) return undefined;
    const intervalo = setInterval(carregar, 30000); // hoje continua mudando
    return () => clearInterval(intervalo);
  }, [data]);

  // período da parte de manutenção
  let periodoInicio = null;
  let periodoFim = null;
  if (periodo === 'dia') {
    periodoInicio = data;
    periodoFim = data;
  } else if (periodo === '7') {
    periodoInicio = diasAtras(6);
    periodoFim = hojeLocal();
  } else if (periodo === '30') {
    periodoInicio = diasAtras(29);
    periodoFim = hojeLocal();
  }

  useEffect(() => {
    carregarManutencao();
    const intervalo = setInterval(carregarManutencao, 30000);
    return () => clearInterval(intervalo);
  }, [periodo, data]);

  async function carregar() {
    try {
      setDados(await api.getDashboard(data));
      setErro('');
    } catch (e) {
      setErro('Não foi possível carregar o dashboard. Confira se o Node-RED está rodando no PC.');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarManutencao() {
    try {
      const [resposta, status] = await Promise.all([
        api.getDashboardManutencao(periodoInicio, periodoFim),
        api.getStatusEsteiras().catch(() => ({ esteiras: {} })),
      ]);
      setManutencao(resposta);
      setSituacoes(status.esteiras || {});
      setErroManutencao('');
    } catch (e) {
      setErroManutencao(
        'Não foi possível carregar os dados de manutenção. Confira se o fluxo do dashboard foi atualizado no Node-RED.'
      );
    }
  }

  // ---------- ordem e cores fixas das esteiras ----------
  const porHora = dados?.por_hora || {};
  const codigosManutencao = [
    ...Object.keys(manutencao?.tempo_parado_min || {}),
    ...Object.values(manutencao?.defeitos || {}).flatMap((porEsteira) => Object.keys(porEsteira)),
  ];
  const codigos = [
    ...cadastro.map((e) => e.esteira),
    ...[...new Set([...Object.keys(porHora), ...codigosManutencao])]
      .filter((c) => !cadastro.some((e) => e.esteira === c))
      .sort(),
  ];
  const nomeDe = (codigo) => cadastro.find((e) => e.esteira === codigo)?.nome || codigo;
  const corDe = (codigo) => {
    const indice = codigos.indexOf(codigo);
    return indice >= 0 && indice < TOTAL_CORES ? `var(--serie-${indice + 1})` : 'var(--serie-outras)';
  };
  const visivel = (codigo) => !ocultas.includes(codigo);

  // ---------- produção ----------
  const ultimaHora = dados?.ultima_hora ?? 23;
  const horasComDado = ultimaHora + 1;

  const todas = codigos.map((codigo) => {
    const valores = (porHora[codigo] || new Array(24).fill(0)).slice(0, horasComDado);
    const total = valores.reduce((s, v) => s + v, 0);
    const pico = valores.reduce(
      (melhor, v, h) => (v > melhor.valor ? { hora: h, valor: v } : melhor),
      { hora: null, valor: 0 }
    );
    return {
      id: codigo,
      nome: nomeDe(codigo),
      cor: corDe(codigo),
      porHora: valores,
      total,
      pico,
      media: horasComDado > 0 ? total / horasComDado : 0,
    };
  });
  const visiveis = todas.filter((s) => visivel(s.id));

  const totalDia = todas.reduce((s, e) => s + e.total, 0);
  const lider = todas.reduce((melhor, e) => (e.total > (melhor?.total ?? 0) ? e : melhor), null);
  const somaPorHora = Array.from({ length: horasComDado }, (_, h) =>
    todas.reduce((s, e) => s + (e.porHora[h] || 0), 0)
  );
  const horaPico = somaPorHora.reduce(
    (melhor, v, h) => (v > melhor.valor ? { hora: h, valor: v } : melhor),
    { hora: null, valor: 0 }
  );

  // ---------- manutenção: tempo parado (inclui paradas ainda em andamento) ----------
  const tempoParado = { ...(manutencao?.tempo_parado_min || {}) };
  const quantidadeParadas = { ...(manutencao?.paradas_qtd || {}) };
  let emAndamento = 0;
  const agora = new Date();
  const limiteInicio = periodoInicio ? inicioDoDia(periodoInicio) : null;
  const limiteFim = periodoFim
    ? new Date(inicioDoDia(periodoFim).getTime() + 24 * 60 * 60 * 1000)
    : null;

  Object.entries(situacoes).forEach(([codigo, situacao]) => {
    if (!situacao.parada || !situacao.parada_em) return;
    const inicio = new Date(situacao.parada_em);
    const a = limiteInicio && inicio < limiteInicio ? limiteInicio : inicio;
    const b = limiteFim && agora > limiteFim ? limiteFim : agora;
    if (b <= a) return;
    tempoParado[codigo] = (tempoParado[codigo] || 0) + Math.round((b - a) / 60000);
    quantidadeParadas[codigo] = (quantidadeParadas[codigo] || 0) + 1;
    emAndamento++;
  });

  const totalParado = Object.values(tempoParado).reduce((s, v) => s + v, 0);
  const totalDeParadas = Object.values(quantidadeParadas).reduce((s, v) => s + v, 0);

  const colunasTempo = codigos
    .filter(visivel)
    .map((codigo) => ({
      id: codigo,
      nome: nomeDe(codigo),
      cor: corDe(codigo),
      valor: tempoParado[codigo] || 0,
      detalhe: `${quantidadeParadas[codigo] || 0} parada(s)`,
    }));

  // ---------- manutenção: defeitos (mais frequente em cima) ----------
  const linhasDefeitos = Object.entries(manutencao?.defeitos || {})
    .map(([defeito, porEsteira]) => {
      const partes = codigos
        .filter(visivel)
        .map((codigo) => ({ id: codigo, nome: nomeDe(codigo), cor: corDe(codigo), valor: porEsteira[codigo] || 0 }));
      return { id: defeito, nome: nomeDefeito(defeito), total: partes.reduce((s, p) => s + p.valor, 0), partes };
    })
    .filter((linha) => linha.total > 0)
    .sort((a, b) => b.total - a.total);

  const defeitoTopo = linhasDefeitos[0];

  function alternarEsteira(codigo) {
    setOcultas((atual) =>
      atual.includes(codigo) ? atual.filter((c) => c !== codigo) : [...atual, codigo]
    );
  }

  const ehHoje = data === hojeLocal();
  const nomePeriodo = PERIODOS_MANUTENCAO.find((p) => p.id === periodo)?.nome.toLowerCase();

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitulo">
            Produção e manutenção das esteiras{ehHoje ? ', atualizado a cada 30 s' : ''}
          </p>
        </div>
        <Link to="/painel" className="botao-secundario">
          ← Voltar ao painel
        </Link>
      </header>

      {/* filtros: o dia e quais esteiras aparecem (também serve de legenda das cores) */}
      <div className="filtros filtros-dashboard">
        <div className="campo-filtro">
          <label htmlFor="data-dashboard">Dia</label>
          <input
            id="data-dashboard"
            type="date"
            value={data}
            max={hojeLocal()}
            onChange={(e) => e.target.value && setData(e.target.value)}
          />
        </div>

        <div className="campo-filtro">
          <span className="rotulo-filtro" id="legenda-esteiras">
            Esteiras (clique para mostrar ou esconder)
          </span>
          <div className="chips-esteiras" role="group" aria-labelledby="legenda-esteiras">
            {codigos.map((codigo) => {
              const ativa = visivel(codigo);
              return (
                <button
                  key={codigo}
                  type="button"
                  className={`chip-esteira ${ativa ? '' : 'desligado'}`}
                  aria-pressed={ativa}
                  onClick={() => alternarEsteira(codigo)}
                >
                  <span className="amostra-cor" style={{ background: corDe(codigo) }} />
                  {nomeDe(codigo)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}
      {carregando && !dados && <p className="aviso-vazio">Carregando dashboard...</p>}

      {/* ==================== PRODUÇÃO ==================== */}
      {dados && (
        <section className="secao-dashboard">
          <h2 className="titulo-secao">Produção</h2>

          <div className="resumo-periodo">
            <div className="cartao">
              <p className="legenda">Total do dia</p>
              <p className="contagem-grande">{numero(totalDia)}</p>
              <p className="legenda">lâminas, todas as esteiras</p>
            </div>
            <div className="cartao">
              <p className="legenda">Maior produção</p>
              <p className="contagem-grande">{lider ? lider.nome : '—'}</p>
              <p className="legenda">{lider ? `${numero(lider.total)} lâminas` : 'sem produção'}</p>
            </div>
            <div className="cartao">
              <p className="legenda">Hora de pico</p>
              <p className="contagem-grande">
                {horaPico.hora != null ? rotuloHora(horaPico.hora) : '—'}
              </p>
              <p className="legenda">
                {horaPico.hora != null ? `${numero(horaPico.valor)} lâminas nessa hora` : 'sem produção'}
              </p>
            </div>
          </div>

          {totalDia === 0 ? (
            <p className="aviso-vazio">
              Nenhuma lâmina registrada neste dia. Rode o simulador na Raspberry Pi ou escolha outro dia.
            </p>
          ) : (
            <>
              <div className="cartao cartao-grafico">
                <h2>Lâminas por hora</h2>
                <p className="legenda">Quantas lâminas cada esteira cortou em cada hora do dia</p>
                <GraficoLinhas
                  series={visiveis.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor, valores: s.porHora }))}
                  rotuloX={rotuloHora}
                  descricao="Gráfico de linhas: lâminas cortadas por hora em cada esteira"
                />
              </div>

              <div className="cartao cartao-grafico">
                <h2>Acumulado do dia</h2>
                <p className="legenda">Total de lâminas que cada esteira cortou no dia</p>
                <GraficoColunas
                  itens={visiveis.map((s) => ({
                    id: s.id,
                    nome: s.nome,
                    cor: s.cor,
                    valor: s.total,
                    detalhe: `média de ${s.media.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por hora`,
                  }))}
                  descricao="Gráfico de colunas: total de lâminas do dia por esteira"
                />
              </div>
            </>
          )}
        </section>
      )}

      {/* ==================== MANUTENÇÃO ==================== */}
      <section className="secao-dashboard">
        <div className="cabecalho-secao">
          <h2 className="titulo-secao">Manutenção</h2>
          <div className="campo-filtro">
            <label htmlFor="periodo-manutencao">Período</label>
            <select
              id="periodo-manutencao"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            >
              {PERIODOS_MANUTENCAO.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {erroManutencao && <p className="mensagem-erro">{erroManutencao}</p>}

        {manutencao && (
          <>
            <div className="resumo-periodo">
              <div className="cartao">
                <p className="legenda">Tempo total parado</p>
                <p className="contagem-grande">{minutosEmTexto(totalParado)}</p>
                <p className="legenda">todas as esteiras, {nomePeriodo}</p>
              </div>
              <div className="cartao">
                <p className="legenda">Paradas</p>
                <p className="contagem-grande">{numero(totalDeParadas)}</p>
                <p className="legenda">
                  {emAndamento > 0 ? `${emAndamento} ainda em andamento` : 'todas já liberadas'}
                </p>
              </div>
              <div className="cartao">
                <p className="legenda">Defeito mais frequente</p>
                <p className="contagem-media">{defeitoTopo ? defeitoTopo.nome : '—'}</p>
                <p className="legenda">
                  {defeitoTopo ? `${defeitoTopo.total} ocorrência(s)` : 'nenhum defeito registrado'}
                </p>
              </div>
            </div>

            {totalDeParadas === 0 ? (
              <p className="aviso-vazio">Nenhuma parada para manutenção neste período.</p>
            ) : (
              <>
                <div className="cartao cartao-grafico">
                  <h2>Tempo parado por esteira</h2>
                  <p className="legenda">
                    Soma do tempo em que cada esteira ficou parada para manutenção. Total geral:{' '}
                    <strong>{minutosEmTexto(totalParado)}</strong>
                  </p>
                  <GraficoColunas
                    itens={colunasTempo}
                    formatarValor={minutosEmTexto}
                    passosEixo={[5, 10, 15, 30, 60, 120, 240, 480, 720, 1440]}
                    descricao="Gráfico de colunas: tempo parado em manutenção por esteira"
                  />
                </div>

                <div className="cartao cartao-grafico">
                  <h2>Defeitos mais frequentes</h2>
                  <p className="legenda">
                    O tamanho da barra é o total de ocorrências do defeito; as cores mostram em quais
                    esteiras ele aconteceu
                  </p>
                  {linhasDefeitos.length === 0 ? (
                    <p className="aviso-vazio">
                      Nenhum defeito registrado neste período (as paradas antigas não tinham defeito
                      informado).
                    </p>
                  ) : (
                    <GraficoBarrasEmpilhadas
                      linhas={linhasDefeitos}
                      unidade="ocorrência(s)"
                      descricao="Barras empilhadas: ocorrências de cada defeito, divididas por esteira"
                    />
                  )}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
