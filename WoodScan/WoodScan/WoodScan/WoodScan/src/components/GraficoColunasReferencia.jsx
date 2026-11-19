// src/components/GraficoColunasReferencia.jsx
// Colunas (uma por hora) com linhas horizontais marcando média, mediana e moda.
// Horas sem produção aparecem vazias e ficam de fora do cálculo.
//
// props:
//   pontos      [{ rotulo, valor, considerado }]  considerado=false -> coluna clara (fora do cálculo)
//   marcadores  [{ id, nome, valor, estilo: 'media' | 'mediana' | 'moda' }]
import { useEffect, useRef, useState } from 'react';

const MARGEM = { topo: 16, direita: 150, baixo: 30, esquerda: 44 };
const TRACO = { media: '', mediana: '7 5', moda: '2 4' };

function topoBonito(maximo) {
  if (maximo <= 0) return 5;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const passo of [1, 2, 2.5, 5, 10]) {
    if (passo * potencia >= maximo) return passo * potencia;
  }
  return 10 * potencia;
}

// valores muito próximos (ex.: média 200,3 e mediana 202) deixariam os nomes um em cima do
// outro: aqui cada nome ganha uma altura própria, com pelo menos 15px de distância
function posicionarRotulos(marcadores, y) {
  const ordenados = marcadores
    .map((m) => ({ ...m, yRotulo: y(m.valor) }))
    .sort((a, b) => a.yRotulo - b.yRotulo);
  for (let i = 1; i < ordenados.length; i++) {
    if (ordenados[i].yRotulo - ordenados[i - 1].yRotulo < 15) {
      ordenados[i].yRotulo = ordenados[i - 1].yRotulo + 15;
    }
  }
  return ordenados;
}

export default function GraficoColunasReferencia({ pontos, marcadores = [], altura = 280, descricao }) {
  const caixaRef = useRef(null);
  const [largura, setLargura] = useState(640);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const elemento = caixaRef.current;
    if (!elemento) return undefined;
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(Math.max(280, Math.floor(entrada.contentRect.width)));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  // no celular os nomes das linhas vão para dentro do gráfico
  const margemDireita = largura < 560 ? 16 : MARGEM.direita;
  const larguraUtil = largura - MARGEM.esquerda - margemDireita;
  const alturaUtil = altura - MARGEM.topo - MARGEM.baixo;
  const topo = topoBonito(Math.max(1, ...pontos.map((p) => p.valor), ...marcadores.map((m) => m.valor ?? 0)));
  const y = (v) => MARGEM.topo + alturaUtil - (v / topo) * alturaUtil;
  const faixa = larguraUtil / Math.max(1, pontos.length);
  const larguraColuna = Math.max(2, faixa - 2);
  const pularX = Math.max(1, Math.ceil(34 / faixa));

  return (
    <div className="grafico" ref={caixaRef}>
      <svg width={largura} height={altura} role="img" aria-label={descricao}>
        {[0, topo / 2, topo].map((valor) => (
          <g key={valor}>
            <line
              className="grafico-grade"
              x1={MARGEM.esquerda}
              x2={MARGEM.esquerda + larguraUtil}
              y1={y(valor)}
              y2={y(valor)}
            />
            <text className="grafico-eixo" x={MARGEM.esquerda - 8} y={y(valor) + 4} textAnchor="end">
              {valor}
            </text>
          </g>
        ))}

        {pontos.map((ponto, i) => {
          const x = MARGEM.esquerda + faixa * i + 1;
          const h = MARGEM.topo + alturaUtil - y(ponto.valor);
          return (
            <g key={ponto.rotulo} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={x - 1} y={MARGEM.topo} width={faixa} height={alturaUtil} fill="transparent" />
              {h > 0 && (
                <rect
                  className={`histograma-coluna ${ponto.considerado ? '' : 'fora-do-calculo'}`}
                  x={x}
                  y={y(ponto.valor)}
                  width={larguraColuna}
                  height={h}
                  rx="2"
                />
              )}
              {i % pularX === 0 && (
                <text className="grafico-eixo" x={x + larguraColuna / 2} y={altura - 8} textAnchor="middle">
                  {ponto.rotulo}
                </text>
              )}
            </g>
          );
        })}

        {posicionarRotulos(marcadores.filter((m) => m.valor != null), y).map((marcador) => (
            <g key={marcador.id}>
              <line
                className={`histograma-marcador marcador-${marcador.estilo}`}
                x1={MARGEM.esquerda}
                x2={MARGEM.esquerda + larguraUtil}
                y1={y(marcador.valor)}
                y2={y(marcador.valor)}
                strokeDasharray={TRACO[marcador.estilo]}
              />
              <text
                className={`histograma-rotulo marcador-${marcador.estilo}`}
                x={largura < 560 ? MARGEM.esquerda + larguraUtil - 4 : MARGEM.esquerda + larguraUtil + 8}
                y={marcador.yRotulo + 4}
                textAnchor={largura < 560 ? 'end' : 'start'}
              >
                {marcador.nome}
              </text>
            </g>
          ))}
      </svg>

      {hover != null && pontos[hover] && (
        <div
          className="grafico-tooltip"
          style={{ left: Math.min(largura - 190, MARGEM.esquerda + faixa * (hover + 1) + 8) }}
        >
          <p className="grafico-tooltip-titulo">{pontos[hover].rotulo}</p>
          <p className="grafico-tooltip-linha">
            <span>Lâminas</span>
            <strong>{pontos[hover].valor.toLocaleString('pt-BR')}</strong>
          </p>
          {!pontos[hover].considerado && (
            <p className="grafico-tooltip-extra">Hora sem produção: fora do cálculo</p>
          )}
        </div>
      )}
    </div>
  );
}
