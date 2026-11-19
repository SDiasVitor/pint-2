// src/pages/Historico.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api';

const TURNOS = [
  { chave: 'manha', nome: 'Manhã', horario: '6h às 14h' },
  { chave: 'tarde', nome: 'Tarde', horario: '14h às 22h' },
  { chave: 'noite', nome: 'Noite', horario: '22h às 6h' },
];

const PERIODOS = [7, 15, 30];

function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function numero(valor) {
  return (valor ?? 0).toLocaleString('pt-BR');
}

export default function Historico() {
  const [dias, setDias] = useState([]);
  const [esteiras, setEsteiras] = useState([]);
  const [periodo, setPeriodo] = useState(7);
  const [filtroEsteira, setFiltroEsteira] = useState('todas');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, 10000); // atualiza a cada 10s
    return () => clearInterval(intervalo);
  }, [periodo]);

  useEffect(() => {
    // só pra mostrar o nome bonito das esteiras no filtro
    api
      .getEsteiras()
      .then((lista) => setEsteiras(lista))
      .catch(() => setEsteiras([]));
  }, []);

  async function carregar() {
    try {
      const dados = await api.getHistorico(periodo);
      setDias(dados.dias || []);
      setErro('');
    } catch (e) {
      setErro('Não foi possível carregar o histórico. Confira se o Node-RED está rodando no PC.');
    } finally {
      setCarregando(false);
    }
  }

  // escolhe os números do dia: todas as esteiras ou só a filtrada
  function valoresDoDia(dia) {
    if (filtroEsteira === 'todas') {
      return { ...dia.turnos, total: dia.total };
    }
    return dia.esteiras?.[filtroEsteira] || { manha: 0, tarde: 0, noite: 0, total: 0 };
  }

  // lista do filtro: esteiras cadastradas + qualquer uma que apareça no CSV
  const codigosNoCsv = new Set(dias.flatMap((dia) => Object.keys(dia.esteiras || {})));
  const opcoesEsteira = [
    ...esteiras.map((e) => ({ codigo: e.esteira, nome: e.nome })),
    ...[...codigosNoCsv]
      .filter((codigo) => !esteiras.some((e) => e.esteira === codigo))
      .map((codigo) => ({ codigo, nome: codigo })),
  ];

  const linhas = dias.map((dia) => ({ data: dia.data, ...valoresDoDia(dia) }));
  const maiorTotal = Math.max(1, ...linhas.map((l) => l.total));

  const totalPeriodo = linhas.reduce((soma, l) => soma + l.total, 0);
  const totaisTurno = TURNOS.map((t) => ({
    ...t,
    total: linhas.reduce((soma, l) => soma + (l[t.chave] || 0), 0),
  }));
  const mediaDia = linhas.length ? Math.round(totalPeriodo / linhas.length) : 0;

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div>
          <h1>Histórico de produção</h1>
          <p className="subtitulo">Lâminas cortadas por dia e por turno</p>
        </div>
        <Link to="/painel" className="botao-secundario">
          ← Voltar ao painel
        </Link>
      </header>

      <div className="filtros">
        <div className="campo-filtro">
          <label htmlFor="periodo">Período</label>
          <select
            id="periodo"
            value={periodo}
            onChange={(e) => setPeriodo(Number(e.target.value))}
          >
            {PERIODOS.map((p) => (
              <option key={p} value={p}>
                Últimos {p} dias
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="esteira">Esteira</label>
          <select
            id="esteira"
            value={filtroEsteira}
            onChange={(e) => setFiltroEsteira(e.target.value)}
          >
            <option value="todas">Todas as esteiras</option>
            {opcoesEsteira.map((op) => (
              <option key={op.codigo} value={op.codigo}>
                {op.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}
      {carregando && <p className="aviso-vazio">Carregando histórico...</p>}

      {!carregando && !erro && linhas.length === 0 && (
        <p className="aviso-vazio">
          Ainda não há lâminas registradas. Rode o simulador na Raspberry Pi e as contagens
          aparecem aqui.
        </p>
      )}

      {linhas.length > 0 && (
        <>
          <div className="resumo-periodo">
            <div className="cartao">
              <p className="legenda">Total no período</p>
              <p className="contagem-grande">{numero(totalPeriodo)}</p>
              <p className="legenda">média de {numero(mediaDia)} por dia</p>
            </div>
            {totaisTurno.map((t) => (
              <div className="cartao" key={t.chave}>
                <p className="legenda">
                  Turno da {t.nome.toLowerCase()} ({t.horario})
                </p>
                <p className="contagem-grande">{numero(t.total)}</p>
              </div>
            ))}
          </div>

          <div className="cartao tabela-cartao">
            <div className="tabela-rolagem">
              <table className="tabela-historico">
                <thead>
                  <tr>
                    <th scope="col">Dia</th>
                    {TURNOS.map((t) => (
                      <th scope="col" className="numero" key={t.chave}>
                        {t.nome}
                      </th>
                    ))}
                    <th scope="col" className="numero">
                      Total do dia
                    </th>
                    <th scope="col" className="coluna-barra">
                      <span className="sr-only">Comparação</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha) => (
                    <tr key={linha.data}>
                      <th scope="row">{formatarData(linha.data)}</th>
                      {TURNOS.map((t) => (
                        <td className="numero" key={t.chave}>
                          {numero(linha[t.chave])}
                        </td>
                      ))}
                      <td className="numero total">{numero(linha.total)}</td>
                      <td className="coluna-barra">
                        <div className="barra-dia" aria-hidden="true">
                          <div
                            className="barra-dia-preenchida"
                            style={{ width: `${(linha.total / maiorTotal) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="nota-rodape">
            O turno da noite vai das 22h às 6h: o que é cortado de madrugada entra no dia em que
            o turno começou.
          </p>
        </>
      )}
    </div>
  );
}
