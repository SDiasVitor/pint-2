// src/pages/EsteiraDetalhe.jsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatarDataHora, formatarDuracao } from './Manutencao';
import * as api from '../api';

export default function EsteiraDetalhe() {
  const { esteiraId } = useParams();
  const navigate = useNavigate();
  const [esteira, setEsteira] = useState(null);
  const [manutencao, setManutencao] = useState(null); // última manutenção desta esteira
  const [situacao, setSituacao] = useState(null); // { parada, parada_em }
  const [erro, setErro] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [alterando, setAlterando] = useState(false);
  const [agora, setAgora] = useState(Date.now()); // relógio do "parada há" (atualiza a cada 15 s)

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, 1000); // tempo real
    return () => clearInterval(intervalo);
  }, [esteiraId]);

  useEffect(() => {
    // parada: a cada 3s | manutenção muda pouco: a cada 30s
    carregarSituacao();
    carregarManutencao();
    const intervaloSituacao = setInterval(carregarSituacao, 3000);
    const intervaloManutencao = setInterval(carregarManutencao, 30000);
    const relogio = setInterval(() => setAgora(Date.now()), 15000);
    return () => {
      clearInterval(intervaloSituacao);
      clearInterval(intervaloManutencao);
      clearInterval(relogio);
    };
  }, [esteiraId]);

  async function carregar() {
    try {
      const dados = await api.getEsteira(esteiraId);
      setEsteira(dados);
      setErro('');
    } catch (e) {
      setErro('Esteira não encontrada ou sem conexão com o servidor.');
    }
  }

  async function carregarManutencao() {
    try {
      const dados = await api.getManutencoes();
      setManutencao(dados.ultimas?.[esteiraId] || null);
    } catch (e) {
      // é um extra: se falhar, a tela da esteira continua funcionando
    }
  }

  async function carregarSituacao() {
    try {
      const dados = await api.getStatusEsteiras();
      setSituacao(dados.esteiras?.[esteiraId] || null);
    } catch (e) {
      // mantém a última situação conhecida
    }
  }

  async function pararEsteira() {
    const nome = esteira?.nome || esteiraId;
    const confirmou = window.confirm(
      `Parar a produção da ${nome}?\n\nEla deixa de contar lâminas e só volta quando ` +
        'a equipe de manutenção liberar.'
    );
    if (!confirmou) return;

    setAlterando(true);
    try {
      await api.pararEsteira(esteiraId);
      setSituacao({ parada: true, parada_em: new Date().toISOString() });
      setAgora(Date.now());
      setErro('');
    } catch (e) {
      setErro(e.message || 'Não foi possível parar a esteira.');
    } finally {
      setAlterando(false);
    }
  }

  async function handleExcluir() {
    const nome = esteira?.nome || esteiraId;
    const confirmou = window.confirm(
      `Excluir a ${nome}?\n\nEla sai do painel e do cadastro. ` +
        'As lâminas já contadas continuam no histórico.'
    );
    if (!confirmou) return;

    setExcluindo(true);
    try {
      await api.excluirEsteira(esteiraId);
      navigate('/painel');
    } catch (e) {
      setErro(e.message || 'Não foi possível excluir a esteira.');
      setExcluindo(false);
    }
  }

  const parada = Boolean(situacao?.parada);
  const emProducao = !parada && Boolean(esteira?.turno_atual);

  let subtitulo = emProducao ? 'Linha em produção' : 'Linha sem leituras no turno';
  if (parada) subtitulo = 'Produção parada: precisa de manutenção';

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div>
          <h1>{esteira?.nome || esteiraId}</h1>
          <p className="subtitulo">{subtitulo}</p>
        </div>
        <div className="acoes-cabecalho">
          <Link to="/painel" className="botao-secundario">
            ← Voltar ao painel
          </Link>
          {esteira && !parada && (
            <button
              type="button"
              className="botao-parada"
              onClick={pararEsteira}
              disabled={alterando}
            >
              {alterando ? 'Aguarde...' : 'Parar para manutenção'}
            </button>
          )}
          {esteira && (
            <button
              type="button"
              className="botao-secundario botao-perigo"
              onClick={handleExcluir}
              disabled={excluindo}
            >
              {excluindo ? 'Excluindo...' : 'Excluir esteira'}
            </button>
          )}
        </div>
      </header>

      {erro && <p className="mensagem-erro">{erro}</p>}

      {parada && (
        <div className="alerta-parada" role="alert">
          <div>
            <strong>Produção parada: esta esteira precisa de manutenção</strong>
            <p>
              {situacao.parada_em
                ? `Parada desde ${formatarDataHora(situacao.parada_em)} (há ${formatarDuracao(
                    agora - new Date(situacao.parada_em).getTime()
                  )}). `
                : ''}
              A contagem está suspensa. A liberação é feita pela equipe de manutenção, na área
              Manutenção.
            </p>
          </div>
          <Link to="/manutencao" className="botao-secundario">
            Ir para Manutenção
          </Link>
        </div>
      )}

      {esteira && (
        <div className="grade-detalhe">
          <div className={`cartao esteira-animada ${parada ? 'pausada' : ''}`}>
            <div className="esteira-visual" aria-hidden="true">
              <div className="protecao-serra" />
              <div className="serra" />
              <div className="faixa" />
              <div className="lamina" />
              <div className="roletes" />
            </div>
          </div>

          <div className="cartao destaque">
            <p className="legenda">Lâminas cortadas no turno</p>
            <p className="contagem-enorme">{esteira.contagem_atual ?? 0}</p>
            <p className="turno-badge">{esteira.turno_atual || 'sem turno ativo'}</p>
          </div>

          <div className="cartao">
            <p className="legenda">Temperatura</p>
            <p className="contagem-grande">
              {esteira.temperatura != null ? `${esteira.temperatura} °C` : '—'}
            </p>
          </div>

          <div className="cartao">
            <p className="legenda">Umidade do ar</p>
            <p className="contagem-grande">
              {esteira.umidade != null ? `${esteira.umidade} %` : '—'}
            </p>
          </div>

          <div className="cartao cartao-manutencao">
            <p className="legenda">Última manutenção</p>
            {manutencao ? (
              <>
                <p className="data-manutencao">{formatarDataHora(manutencao.data_hora)}</p>
                <p className="legenda">Realizada por {manutencao.responsavel}</p>
                {(manutencao.tipo_manutencao || manutencao.defeito) && (
                  <div className="detalhe-manutencao">
                    {manutencao.tipo_manutencao && (
                      <span className="etiqueta-manutencao">{manutencao.tipo_manutencao}</span>
                    )}
                    {manutencao.defeito && (
                      <span className="etiqueta-manutencao">Defeito: {manutencao.defeito}</span>
                    )}
                  </div>
                )}
                {manutencao.observacao && (
                  <p className="observacao-manutencao">{manutencao.observacao}</p>
                )}
              </>
            ) : (
              <>
                <p className="data-manutencao sem-registro">Sem registro</p>
                <p className="legenda">
                  A equipe de manutenção registra pelo botão Manutenção do painel.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
