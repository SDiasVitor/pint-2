// src/pages/Home.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatarDataHora, formatarDuracao } from './Manutencao';
import * as api from '../api';

export default function Home() {
  const [esteiras, setEsteiras] = useState([]);
  const [manutencoes, setManutencoes] = useState({}); // { esteira1: { data_hora, responsavel } }
  const [paradas, setParadas] = useState({}); // { esteira1: { parada: true, parada_em } }
  const [alterando, setAlterando] = useState(''); // código da esteira cujo botão está processando
  const [agora, setAgora] = useState(Date.now()); // relógio do "parada há" (atualiza a cada 15 s)
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    carregarEsteiras();
    const intervalo = setInterval(carregarEsteiras, 5000); // atualiza a cada 5s
    const relogio = setInterval(() => setAgora(Date.now()), 15000);
    return () => {
      clearInterval(intervalo);
      clearInterval(relogio);
    };
  }, []);

  async function carregarEsteiras() {
    try {
      const dados = await api.getEsteiras();
      setEsteiras(dados);
      setErro('');
    } catch (e) {
      setErro('Sem conexão com o servidor. Confira se o Node-RED está rodando no PC.');
    } finally {
      setCarregando(false);
    }

    // manutenção e parada são extras: se falharem, o painel continua funcionando
    try {
      const dados = await api.getManutencoes();
      setManutencoes(dados.ultimas || {});
    } catch (e) {
      // mantém o que já estava na tela
    }

    try {
      const dados = await api.getStatusEsteiras();
      setParadas(dados.esteiras || {});
    } catch (e) {
      // mantém o que já estava na tela
    }
  }

  async function pararEsteira(esteira) {
    const confirmou = window.confirm(
      `Parar a produção da ${esteira.nome}?\n\nEla deixa de contar lâminas e só volta quando ` +
        'a equipe de manutenção liberar.'
    );
    if (!confirmou) return;

    setAlterando(esteira.esteira);
    try {
      await api.pararEsteira(esteira.esteira);
      setParadas((atual) => ({
        ...atual,
        [esteira.esteira]: { parada: true, parada_em: new Date().toISOString() },
      }));
      setAgora(Date.now());
      setErro('');
    } catch (e) {
      setErro(e.message || 'Não foi possível parar a esteira.');
    } finally {
      setAlterando('');
    }
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div>
          <h1>WoodScan</h1>
          <p className="subtitulo">
            Olá, {usuario?.nome || usuario?.login}. Produção das linhas de corte em tempo real.
          </p>
        </div>
        <div className="acoes-cabecalho">
          <Link to="/dashboard" className="botao-secundario">
            Dashboard
          </Link>
          <Link to="/analise" className="botao-secundario">
            Análise de dados
          </Link>
          <Link to="/historico" className="botao-secundario">
            Histórico
          </Link>
          <Link to="/manutencao" className="botao-secundario">
            Manutenção
          </Link>
          <Link to="/cadastro-esteira" className="botao-secundario">
            + Nova esteira
          </Link>
          <button className="botao-secundario" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      {erro && <p className="mensagem-erro">{erro}</p>}
      {carregando && <p className="aviso-vazio">Carregando esteiras...</p>}

      {!carregando && !erro && esteiras.length === 0 && (
        <p className="aviso-vazio">
          Nenhuma esteira cadastrada ainda. Use "+ Nova esteira" para adicionar a primeira.
        </p>
      )}

      <div className="grade-esteiras">
        {esteiras.map((esteira) => {
          const situacao = paradas[esteira.esteira];
          const parada = Boolean(situacao?.parada);
          const emProducao = !parada && Boolean(esteira.turno_atual);
          const manutencao = manutencoes[esteira.esteira];

          let textoStatus = emProducao ? 'Em produção' : 'Sem leituras no turno';
          let classeStatus = emProducao ? 'ligada' : '';
          if (parada) {
            textoStatus = 'Parada: precisa de manutenção';
            classeStatus = 'alerta';
          }

          return (
            <div
              key={esteira.esteira}
              className={`cartao cartao-esteira ${parada ? 'parada' : ''}`}
            >
              <Link to={`/esteira/${esteira.esteira}`} className="link-cartao">
                <span className={`status-maquina ${classeStatus}`}>{textoStatus}</span>
                <h2>{esteira.nome}</h2>
                <p className="contagem-grande">{esteira.contagem_atual ?? 0}</p>
                <p className="legenda">lâminas no turno</p>
                <p className="turno-badge">{esteira.turno_atual || 'sem turno ativo'}</p>

                <div className="ambiente">
                  <span>
                    <strong>
                      {esteira.temperatura != null ? `${esteira.temperatura} °C` : '—'}
                    </strong>{' '}
                    temp.
                  </span>
                  <span>
                    <strong>{esteira.umidade != null ? `${esteira.umidade} %` : '—'}</strong>{' '}
                    umidade
                  </span>
                </div>

                <p className="ultima-manutencao">
                  Última manutenção:{' '}
                  {manutencao ? (
                    <strong>{formatarDataHora(manutencao.data_hora)}</strong>
                  ) : (
                    'sem registro'
                  )}
                </p>

                {parada && (
                  <p className="aviso-parada">
                    {situacao.parada_em
                      ? `Parada há ${formatarDuracao(agora - new Date(situacao.parada_em).getTime())}`
                      : 'Parada'}
                  </p>
                )}
              </Link>

              {parada ? (
                <p className="aguardando-liberacao">Aguardando liberação da manutenção</p>
              ) : (
                <button
                  type="button"
                  className="botao-parada"
                  onClick={() => pararEsteira(esteira)}
                  disabled={alterando === esteira.esteira}
                >
                  {alterando === esteira.esteira ? 'Aguarde...' : 'Parar para manutenção'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
