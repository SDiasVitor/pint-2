// src/pages/AnaliseDados.jsx
// Análise de dados: tratamento das leituras e medidas de tendência central
// (média aritmética, mediana e moda) de temperatura, umidade e lâminas por hora.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GraficoHistograma from '../components/GraficoHistograma';
import GraficoColunasReferencia from '../components/GraficoColunasReferencia';
import * as est from '../utils/estatistica';
import * as api from '../api';

function hojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const formatar = (n, casas = 1) =>
  n == null ? '—' : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
const rotuloHora = (h) => `${String(h).padStart(2, '0')}h`;

// Configuração de cada variável contínua analisada
const VARIAVEIS = [
  { id: 'temperatura', titulo: 'Temperatura', unidade: '°C', passo: 1 },
  { id: 'umidade', titulo: 'Umidade do ar', unidade: '%', passo: 2 },
];

// Calcula tudo de uma variável contínua a partir da tabela de frequência
function analisarContinua(tabela, passo) {
  const itens = est.ordenarTabela(tabela);
  const media = est.media(itens);
  const mediana = est.mediana(itens);
  const moda = est.moda(itens, passo);
  const minimo = est.minimo(itens);
  const maximo = est.maximo(itens);
  return {
    n: est.quantidade(itens),
    media,
    mediana,
    moda,
    minimo,
    maximo,
    faixas: est.histograma(itens, passo),
    interpretacao: est.interpretar(media, mediana, maximo, minimo),
  };
}

// Lâminas por hora: só entram as horas em que a esteira produziu (tratamento)
function analisarProducao(porHora, horasDecorridas) {
  const horas = porHora.slice(0, horasDecorridas);
  const comProducao = horas.filter((v) => v > 0);
  const itens = est.ordenarTabela(est.listaParaTabela(comProducao));
  const media = est.media(itens);
  const mediana = est.mediana(itens);
  return {
    horas,
    n: comProducao.length,
    excluidas: horas.length - comProducao.length,
    media,
    mediana,
    moda: est.moda(itens, 1, true),
    minimo: est.minimo(itens),
    maximo: est.maximo(itens),
    interpretacao: est.interpretar(media, mediana, est.maximo(itens), est.minimo(itens)),
  };
}

function textoModa(moda, unidade, passo, discreto) {
  if (moda.amodal) return 'Amodal';
  if (moda.valores.length === 0) return '—';
  const partes = moda.valores.map((v) =>
    discreto ? `${formatar(v, 0)}` : `${formatar(v, 0)} a ${formatar(v + passo, 0)}`
  );
  // "15, 16 e 17" em vez de "15 e 16 e 17"
  const lista =
    partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}` : partes[0];
  return `${lista} ${unidade}`.trim();
}

function tipoModa(moda) {
  if (moda.amodal) return 'nenhum valor se repete mais que os outros';
  if (moda.valores.length === 2) return `bimodal: as duas apareceram ${moda.vezes} vezes`;
  if (moda.valores.length > 2) return `multimodal: todas apareceram ${moda.vezes} vezes`;
  return `apareceu ${moda.vezes.toLocaleString('pt-BR')} vezes`;
}

// Três cartões: média, mediana e moda
function CartoesMedidas({ analise, unidade, passo, discreto = false, casas = 1 }) {
  return (
    <div className="medidas-centrais">
      <div className="medida medida-media">
        <p className="medida-nome">Média aritmética</p>
        <p className="medida-valor">
          {formatar(analise.media, casas)} {unidade}
        </p>
        <p className="medida-explica">soma de todos os valores ÷ {analise.n.toLocaleString('pt-BR')}</p>
      </div>
      <div className="medida medida-mediana">
        <p className="medida-nome">Mediana</p>
        <p className="medida-valor">
          {formatar(analise.mediana, casas)} {unidade}
        </p>
        <p className="medida-explica">valor do meio com os dados em ordem crescente</p>
      </div>
      <div className="medida medida-moda">
        <p className="medida-nome">Moda</p>
        <p className="medida-valor">{textoModa(analise.moda, unidade, passo, discreto)}</p>
        <p className="medida-explica">
          {discreto ? 'valor que mais se repete' : 'faixa que mais se repete'}, {tipoModa(analise.moda)}
        </p>
      </div>
    </div>
  );
}

export default function AnaliseDados() {
  const [data, setData] = useState(hojeLocal);
  const [filtroEsteira, setFiltroEsteira] = useState('todas');
  const [dados, setDados] = useState(null);
  const [cadastro, setCadastro] = useState([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

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
    const intervalo = setInterval(carregar, 60000); // hoje: recalcula a cada 1 minuto
    return () => clearInterval(intervalo);
  }, [data]);

  async function carregar() {
    try {
      setDados(await api.getAnalise(data));
      setErro('');
    } catch (e) {
      setErro('Não foi possível carregar os dados. Confira se o fluxo do dashboard foi atualizado no Node-RED.');
    } finally {
      setCarregando(false);
    }
  }

  const porEsteira = dados?.esteiras || {};
  const codigos = [
    ...cadastro.map((e) => e.esteira),
    ...Object.keys(porEsteira).filter((c) => !cadastro.some((e) => e.esteira === c)).sort(),
  ];
  const nomeDe = (codigo) => cadastro.find((e) => e.esteira === codigo)?.nome || codigo;
  const selecionadas = filtroEsteira === 'todas' ? Object.keys(porEsteira) : [filtroEsteira];
  const horasDecorridas = (dados?.ultima_hora ?? 23) + 1;

  // ---------- 1. tratamento: juntar as esteiras escolhidas ----------
  const brutas = selecionadas.reduce((s, c) => s + (porEsteira[c]?.brutas || 0), 0);
  const descartadas = selecionadas.reduce((s, c) => s + (porEsteira[c]?.descartadas || 0), 0);
  const tabelas = {
    temperatura: est.somarTabelas(selecionadas.map((c) => porEsteira[c]?.temperatura)),
    umidade: est.somarTabelas(selecionadas.map((c) => porEsteira[c]?.umidade)),
  };
  const producaoPorHora = Array.from({ length: 24 }, (_, h) =>
    selecionadas.reduce((s, c) => s + (porEsteira[c]?.laminas_por_hora?.[h] || 0), 0)
  );

  // ---------- 2. medidas ----------
  const analises = Object.fromEntries(
    VARIAVEIS.map((v) => [v.id, analisarContinua(tabelas[v.id], v.passo)])
  );
  const producao = analisarProducao(producaoPorHora, horasDecorridas);
  const validas = brutas - descartadas;

  // ---------- 3. comparação entre esteiras ----------
  const comparacao = codigos
    .filter((c) => porEsteira[c])
    .map((c) => ({
      codigo: c,
      nome: nomeDe(c),
      temperatura: analisarContinua(porEsteira[c].temperatura, 1),
      umidade: analisarContinua(porEsteira[c].umidade, 2),
      producao: analisarProducao(porEsteira[c].laminas_por_hora, horasDecorridas),
    }));

  const nomeSelecao = filtroEsteira === 'todas' ? 'todas as esteiras' : nomeDe(filtroEsteira);

  return (
    <div className="pagina">
      <header className="cabecalho">
        <div>
          <h1>Análise de dados</h1>
          <p className="subtitulo">
            Tratamento das leituras e medidas de tendência central: média, mediana e moda
          </p>
        </div>
        <Link to="/painel" className="botao-secundario">
          ← Voltar ao painel
        </Link>
      </header>

      <div className="filtros">
        <div className="campo-filtro">
          <label htmlFor="data-analise">Dia</label>
          <input
            id="data-analise"
            type="date"
            value={data}
            max={hojeLocal()}
            onChange={(e) => e.target.value && setData(e.target.value)}
          />
        </div>
        <div className="campo-filtro">
          <label htmlFor="esteira-analise">Esteira</label>
          <select
            id="esteira-analise"
            value={filtroEsteira}
            onChange={(e) => setFiltroEsteira(e.target.value)}
          >
            <option value="todas">Todas as esteiras</option>
            {codigos.map((c) => (
              <option key={c} value={c}>
                {nomeDe(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && <p className="mensagem-erro">{erro}</p>}
      {carregando && !dados && <p className="aviso-vazio">Carregando dados...</p>}

      {dados && brutas === 0 && (
        <p className="aviso-vazio">
          Nenhuma leitura neste dia para {nomeSelecao}. Rode o simulador na Raspberry Pi ou escolha
          outro dia.
        </p>
      )}

      {dados && brutas > 0 && (
        <>
          {/* ---------- etapas do tratamento ---------- */}
          <section className="cartao etapas-tratamento">
            <h2>Tratamento dos dados</h2>
            <p className="legenda">O caminho das leituras de {nomeSelecao} até as medidas</p>
            <ol>
              <li>
                <strong>Coleta</strong>
                <span>
                  {brutas.toLocaleString('pt-BR')} leituras brutas recebidas da Raspberry Pi e
                  gravadas no contagem.csv
                </span>
              </li>
              <li>
                <strong>Limpeza</strong>
                <span>
                  {descartadas.toLocaleString('pt-BR')} leituras descartadas (temperatura ou umidade
                  vazia, não numérica ou fora da faixa possível).{' '}
                  {validas.toLocaleString('pt-BR')} leituras válidas
                </span>
              </li>
              <li>
                <strong>Organização</strong>
                <span>
                  valores em ordem crescente e agrupados em faixas de 1 °C e 2 % (tabela de
                  frequência); {producao.excluidas} hora(s) sem produção ficaram fora da análise de
                  lâminas por hora
                </span>
              </li>
              <li>
                <strong>Cálculo</strong>
                <span>média aritmética, mediana e moda de cada variável</span>
              </li>
            </ol>
          </section>

          {/* ---------- temperatura e umidade ---------- */}
          {VARIAVEIS.map((variavel) => {
            const a = analises[variavel.id];
            if (a.n === 0) return null;
            const centroModa = a.moda.valores.length ? a.moda.valores[0] + variavel.passo / 2 : null;
            return (
              <section key={variavel.id} className="cartao cartao-grafico">
                <h2>{variavel.titulo}</h2>
                <p className="legenda">
                  {a.n.toLocaleString('pt-BR')} leituras válidas, de {formatar(a.minimo)} a{' '}
                  {formatar(a.maximo)} {variavel.unidade}
                </p>

                <CartoesMedidas analise={a} unidade={variavel.unidade} passo={variavel.passo} />

                <GraficoHistograma
                  faixas={a.faixas}
                  formatarX={(n) => `${formatar(n, 0)}${variavel.unidade === '%' ? '%' : '°'}`}
                  marcadores={[
                    { id: 'media', nome: `Média ${formatar(a.media)}`, valor: a.media, estilo: 'media' },
                    { id: 'mediana', nome: `Mediana ${formatar(a.mediana)}`, valor: a.mediana, estilo: 'mediana' },
                    { id: 'moda', nome: 'Moda (faixa)', valor: centroModa, estilo: 'moda' },
                  ]}
                  descricao={`Histograma de ${variavel.titulo.toLowerCase()} com média, mediana e moda`}
                />
                <p className="interpretacao">{a.interpretacao}</p>
              </section>
            );
          })}

          {/* ---------- lâminas por hora ---------- */}
          {producao.n > 0 && (
            <section className="cartao cartao-grafico">
              <h2>Lâminas por hora</h2>
              <p className="legenda">
                {producao.n} hora(s) com produção, de {formatar(producao.minimo, 0)} a{' '}
                {formatar(producao.maximo, 0)} lâminas por hora
              </p>

              <CartoesMedidas analise={producao} unidade="lâminas" passo={1} discreto casas={1} />

              <GraficoColunasReferencia
                pontos={producao.horas.map((valor, h) => ({
                  rotulo: rotuloHora(h),
                  valor,
                  considerado: valor > 0,
                }))}
                marcadores={[
                  { id: 'media', nome: `Média ${formatar(producao.media)}`, valor: producao.media, estilo: 'media' },
                  { id: 'mediana', nome: `Mediana ${formatar(producao.mediana)}`, valor: producao.mediana, estilo: 'mediana' },
                  {
                    id: 'moda',
                    nome: producao.moda.valores.length ? `Moda ${producao.moda.valores[0]}` : 'Amodal',
                    valor: producao.moda.valores[0] ?? null,
                    estilo: 'moda',
                  },
                ]}
                descricao="Colunas de lâminas por hora com linhas de média, mediana e moda"
              />
              <p className="interpretacao">{producao.interpretacao}</p>
            </section>
          )}

          {/* ---------- comparação ---------- */}
          {comparacao.length > 1 && (
            <section className="cartao tabela-cartao">
              <h2 className="titulo-tabela">Comparação entre esteiras</h2>
              <div className="tabela-rolagem">
                <table className="tabela-historico tabela-comparacao">
                  <thead>
                    <tr>
                      <th scope="col" rowSpan="2">Esteira</th>
                      <th scope="colgroup" colSpan="3" className="grupo">Temperatura (°C)</th>
                      <th scope="colgroup" colSpan="3" className="grupo">Umidade (%)</th>
                      <th scope="colgroup" colSpan="3" className="grupo">Lâminas por hora</th>
                    </tr>
                    <tr>
                      {['Média', 'Mediana', 'Moda', 'Média', 'Mediana', 'Moda', 'Média', 'Mediana', 'Moda'].map(
                        (nome, i) => (
                          <th key={i} scope="col" className="numero">
                            {nome}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {comparacao.map((linha) => (
                      <tr key={linha.codigo}>
                        <th scope="row">{linha.nome}</th>
                        <td className="numero">{formatar(linha.temperatura.media)}</td>
                        <td className="numero">{formatar(linha.temperatura.mediana)}</td>
                        <td className="numero">{textoModa(linha.temperatura.moda, '', 1, false)}</td>
                        <td className="numero">{formatar(linha.umidade.media)}</td>
                        <td className="numero">{formatar(linha.umidade.mediana)}</td>
                        <td className="numero">{textoModa(linha.umidade.moda, '', 2, false)}</td>
                        <td className="numero">{formatar(linha.producao.media)}</td>
                        <td className="numero">{formatar(linha.producao.mediana)}</td>
                        <td className="numero">{textoModa(linha.producao.moda, '', 1, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
