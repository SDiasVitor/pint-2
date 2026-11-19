// src/pages/Manutencao.jsx
// Área restrita da manutenção.
// 1º passo: a pessoa entra com o login e a senha de manutenção.
// 2º passo: libera as esteiras paradas, informando o tipo de manutenção e o defeito.
//           A liberação já registra a manutenção automaticamente.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api';

// Opções das listas. "Outro" abre um campo de texto para a pessoa escrever.
export const TIPOS_MANUTENCAO = ['Corretiva', 'Preventiva', 'Preditiva', 'Outro'];

export const DEFEITOS = [
  'Serra sem fio ou desgastada',
  'Dente da serra quebrado',
  'Correia frouxa ou rompida',
  'Rolete travado ou com ruído',
  'Esteira desalinhada',
  'Motor superaquecido',
  'Sensor de fim de curso com falha',
  'Acúmulo de pó ou serragem',
  'Falha elétrica',
  'Outro',
];

export function formatarDataHora(dataHora) {
  const data = new Date(dataHora);
  if (isNaN(data.getTime())) return dataHora;
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// milissegundos -> "1h 35min", "12min", "2d 3h"
export function formatarDuracao(milissegundos) {
  const minutosTotais = Math.max(0, Math.floor(milissegundos / 60000));
  const dias = Math.floor(minutosTotais / 1440);
  const horas = Math.floor((minutosTotais % 1440) / 60);
  const minutos = minutosTotais % 60;
  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${minutos}min`;
  return `${minutos}min`;
}

const formatarMinutos = (minutos) => formatarDuracao((minutos || 0) * 60000);

const FORMULARIO_VAZIO = {
  tipo: '',
  tipoOutro: '',
  defeito: '',
  defeitoOutro: '',
  observacao: '',
};

export default function Manutencao() {
  // credencial fica só na memória: ao sair da página ou dar F5, precisa entrar de novo
  const [credencial, setCredencial] = useState(null);

  // passo 1: login
  const [loginUsuario, setLoginUsuario] = useState('');
  const [senha, setSenha] = useState('');

  // passo 2: dados da área de manutenção
  const [esteiras, setEsteiras] = useState([]);
  const [situacoes, setSituacoes] = useState({}); // { esteira1: { parada, parada_em } }
  const [paradas, setParadas] = useState({ registros: [], total_min_por_esteira: {} });
  const [registros, setRegistros] = useState([]);
  const [agora, setAgora] = useState(Date.now());

  // um formulário de liberação para cada esteira parada: { esteira2: { tipo, defeito, ... } }
  const [formularios, setFormularios] = useState({});
  const [liberando, setLiberando] = useState('');

  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!credencial) return undefined;
    api
      .getEsteiras()
      .then(setEsteiras)
      .catch(() => setErro('Não foi possível carregar as esteiras.'));
    carregarTudo();

    // esteiras paradas podem aparecer a qualquer momento: confere a cada 5 s
    const intervalo = setInterval(carregarSituacoes, 5000);
    const relogio = setInterval(() => setAgora(Date.now()), 15000);
    return () => {
      clearInterval(intervalo);
      clearInterval(relogio);
    };
  }, [credencial]);

  function carregarTudo() {
    carregarSituacoes();
    carregarRegistros();
    carregarParadas();
  }

  async function carregarSituacoes() {
    try {
      const dados = await api.getStatusEsteiras();
      setSituacoes(dados.esteiras || {});
      setAgora(Date.now());
    } catch (e) {
      // mantém o que já estava na tela
    }
  }

  async function carregarRegistros() {
    try {
      const dados = await api.getManutencoes();
      setRegistros(dados.registros || []);
    } catch (e) {
      // a lista é só consulta: se falhar, o resto continua funcionando
    }
  }

  async function carregarParadas() {
    try {
      const dados = await api.getParadas();
      setParadas({
        registros: dados.registros || [],
        total_min_por_esteira: dados.total_min_por_esteira || {},
      });
    } catch (e) {
      // idem
    }
  }

  async function handleEntrar(evento) {
    evento.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const usuario = await api.loginManutencao(loginUsuario, senha);
      setCredencial({ login: loginUsuario, senha, nome: usuario.nome });
      setSenha('');
    } catch (e) {
      setErro(e.message || 'Login ou senha inválidos.');
    } finally {
      setCarregando(false);
    }
  }

  function formularioDe(codigo) {
    return formularios[codigo] || FORMULARIO_VAZIO;
  }

  function alterarCampo(codigo, campo, valor) {
    setFormularios((atual) => ({
      ...atual,
      [codigo]: { ...(atual[codigo] || FORMULARIO_VAZIO), [campo]: valor },
    }));
  }

  async function handleLiberar(evento, codigo) {
    evento.preventDefault();
    const form = formularioDe(codigo);
    const nomeEsteira = nomeDaEsteira(codigo);

    // se escolheu "Outro", vale o que foi escrito no campo de texto
    const tipoManutencao = form.tipo === 'Outro' ? form.tipoOutro.trim() : form.tipo;
    const defeito = form.defeito === 'Outro' ? form.defeitoOutro.trim() : form.defeito;

    if (!tipoManutencao || !defeito) {
      setErro('Preencha o tipo de manutenção e o defeito antes de liberar.');
      return;
    }

    const confirmou = window.confirm(
      `Liberar a ${nomeEsteira}?\n\nTipo: ${tipoManutencao}\nDefeito: ${defeito}\n\n` +
        'Ela volta a produzir e a manutenção é registrada no seu nome.'
    );
    if (!confirmou) return;

    setErro('');
    setSucesso('');
    setLiberando(codigo);
    try {
      const resposta = await api.liberarEsteira({
        esteira: codigo,
        login: credencial.login,
        senha: credencial.senha,
        tipoManutencao,
        defeito,
        observacao: form.observacao,
      });
      setSucesso(
        `${nomeEsteira} liberada. Ficou parada por ${formatarMinutos(resposta.duracao_min)}.`
      );
      setFormularios((atual) => ({ ...atual, [codigo]: FORMULARIO_VAZIO }));
      carregarTudo();
    } catch (e) {
      setErro(e.message || 'Não foi possível liberar a esteira.');
    } finally {
      setLiberando('');
    }
  }

  function handleSair() {
    setCredencial(null);
    setLoginUsuario('');
    setSenha('');
    setErro('');
    setSucesso('');
  }

  function nomeDaEsteira(codigo) {
    return esteiras.find((e) => e.esteira === codigo)?.nome || codigo;
  }

  // ---------- passo 1: login da manutenção ----------
  if (!credencial) {
    return (
      <div className="tela-centralizada">
        <form className="cartao formulario" onSubmit={handleEntrar}>
          <h1>Manutenção</h1>
          <p className="subtitulo">Área restrita à equipe de manutenção</p>

          <label htmlFor="login-manutencao">Login da manutenção</label>
          <input
            id="login-manutencao"
            type="text"
            autoComplete="username"
            value={loginUsuario}
            onChange={(e) => setLoginUsuario(e.target.value)}
            required
          />

          <label htmlFor="senha-manutencao">Senha</label>
          <input
            id="senha-manutencao"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {erro && <p className="mensagem-erro">{erro}</p>}

          <button type="submit" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar na manutenção'}
          </button>

          <p className="link-secundario">
            <Link to="/painel">Voltar ao painel</Link>
          </p>
        </form>
      </div>
    );
  }

  // ---------- passo 2: área da manutenção ----------
  const codigosParados = Object.keys(situacoes).filter((codigo) => situacoes[codigo].parada);

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div>
          <h1>Manutenção</h1>
          <p className="subtitulo">Responsável: {credencial.nome}</p>
        </div>
        <div className="acoes-cabecalho">
          <Link to="/painel" className="botao-secundario">
            ← Voltar ao painel
          </Link>
          <button type="button" className="botao-secundario" onClick={handleSair}>
            Sair da manutenção
          </button>
        </div>
      </header>

      {erro && <p className="mensagem-erro mensagem-topo">{erro}</p>}
      {sucesso && <p className="mensagem-sucesso mensagem-topo">{sucesso}</p>}

      {/* ---------- esteiras paradas aguardando liberação ---------- */}
      <section className="secao-manutencao">
        <h2>Aguardando liberação</h2>
        {codigosParados.length === 0 ? (
          <p className="aviso-vazio">Nenhuma esteira parada no momento. Todas estão produzindo.</p>
        ) : (
          <div className="grade-liberacao">
            {codigosParados.map((codigo) => {
              const situacao = situacoes[codigo];
              const desde = situacao.parada_em ? new Date(situacao.parada_em) : null;
              const form = formularioDe(codigo);
              return (
                <form
                  key={codigo}
                  className="cartao cartao-liberacao"
                  onSubmit={(evento) => handleLiberar(evento, codigo)}
                >
                  <span className="status-maquina alerta">Parada: precisa de manutenção</span>
                  <h2>{nomeDaEsteira(codigo)}</h2>
                  <p className="tempo-parado">
                    {desde ? formatarDuracao(agora - desde.getTime()) : '—'}
                  </p>
                  <p className="legenda">
                    {desde ? `parada desde ${formatarDataHora(desde)}` : 'tempo parado'}
                  </p>

                  <label htmlFor={`tipo-${codigo}`}>Tipo de manutenção</label>
                  <select
                    id={`tipo-${codigo}`}
                    value={form.tipo}
                    onChange={(e) => alterarCampo(codigo, 'tipo', e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {TIPOS_MANUTENCAO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                  {form.tipo === 'Outro' && (
                    <input
                      className="campo-outro"
                      type="text"
                      maxLength={60}
                      value={form.tipoOutro}
                      onChange={(e) => alterarCampo(codigo, 'tipoOutro', e.target.value)}
                      placeholder="Qual tipo? Ex.: lubrificação programada"
                      aria-label="Descreva o tipo de manutenção"
                      required
                    />
                  )}

                  <label htmlFor={`defeito-${codigo}`}>Defeito encontrado</label>
                  <select
                    id={`defeito-${codigo}`}
                    value={form.defeito}
                    onChange={(e) => alterarCampo(codigo, 'defeito', e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {DEFEITOS.map((defeito) => (
                      <option key={defeito} value={defeito}>
                        {defeito}
                      </option>
                    ))}
                  </select>
                  {form.defeito === 'Outro' && (
                    <input
                      className="campo-outro"
                      type="text"
                      maxLength={100}
                      value={form.defeitoOutro}
                      onChange={(e) => alterarCampo(codigo, 'defeitoOutro', e.target.value)}
                      placeholder="Descreva o defeito"
                      aria-label="Descreva o defeito"
                      required
                    />
                  )}

                  <label htmlFor={`obs-${codigo}`}>Observações (opcional)</label>
                  <textarea
                    id={`obs-${codigo}`}
                    rows={2}
                    maxLength={200}
                    value={form.observacao}
                    onChange={(e) => alterarCampo(codigo, 'observacao', e.target.value)}
                    placeholder="Ex.: serra trocada, testada em vazio"
                  />

                  <button
                    type="submit"
                    className="botao-parada retomar"
                    disabled={liberando === codigo}
                  >
                    {liberando === codigo ? 'Liberando...' : 'Liberar esteira'}
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- últimas manutenções (geradas pelas liberações) ---------- */}
      <section className="secao-manutencao">
        <div className="cartao tabela-cartao">
          <h2 className="titulo-tabela">Últimas manutenções</h2>
          {registros.length === 0 ? (
            <p className="aviso-vazio aviso-tabela">Nenhuma manutenção registrada ainda.</p>
          ) : (
            <div className="tabela-rolagem">
              <table className="tabela-historico tabela-manutencao">
                <thead>
                  <tr>
                    <th scope="col">Data e hora</th>
                    <th scope="col">Esteira</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Defeito</th>
                    <th scope="col">Responsável</th>
                    <th scope="col">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r, indice) => (
                    <tr key={`${r.data_hora}-${r.esteira}-${indice}`}>
                      <th scope="row">{formatarDataHora(r.data_hora)}</th>
                      <td>{nomeDaEsteira(r.esteira)}</td>
                      <td>{r.tipo_manutencao || '—'}</td>
                      <td className="celula-observacao">{r.defeito || '—'}</td>
                      <td>{r.responsavel}</td>
                      <td className="celula-observacao">{r.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ---------- histórico das paradas ---------- */}
      <section className="secao-manutencao">
        <div className="cartao tabela-cartao">
          <h2 className="titulo-tabela">Tempo parado em manutenção</h2>

          {Object.keys(paradas.total_min_por_esteira).length > 0 && (
            <div className="totais-parada">
              {Object.entries(paradas.total_min_por_esteira).map(([codigo, minutos]) => (
                <p key={codigo}>
                  <span>{nomeDaEsteira(codigo)}</span>
                  <strong>{formatarMinutos(minutos)}</strong>
                </p>
              ))}
            </div>
          )}

          {paradas.registros.length === 0 ? (
            <p className="aviso-vazio aviso-tabela">Nenhuma parada registrada ainda.</p>
          ) : (
            <div className="tabela-rolagem">
              <table className="tabela-historico tabela-manutencao">
                <thead>
                  <tr>
                    <th scope="col">Esteira</th>
                    <th scope="col">Parou em</th>
                    <th scope="col">Liberada em</th>
                    <th scope="col" className="numero">Tempo parado</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Defeito</th>
                    <th scope="col">Liberada por</th>
                  </tr>
                </thead>
                <tbody>
                  {paradas.registros.map((p, indice) => (
                    <tr key={`${p.esteira}-${p.fim}-${indice}`}>
                      <th scope="row">{nomeDaEsteira(p.esteira)}</th>
                      <td>{formatarDataHora(p.inicio)}</td>
                      <td>{formatarDataHora(p.fim)}</td>
                      <td className="numero total">{formatarMinutos(p.duracao_min)}</td>
                      <td>{p.tipo_manutencao || '—'}</td>
                      <td className="celula-observacao">{p.defeito || '—'}</td>
                      <td>{p.liberado_por}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
