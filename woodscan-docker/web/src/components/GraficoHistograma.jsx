// src/components/GraficoHistograma.jsx
// Histograma (colunas encostadas) com linhas verticais marcando média, mediana e moda.
//
// props:
//   faixas      [{ inicio, fim, vezes }]   (saída de histograma() em utils/estatistica.js)
//   marcadores  [{ id, nome, valor, estilo: 'media' | 'mediana' | 'moda' }]
//   formatarX   (n) => texto do eixo X (ex.: '25 °C')
//   descricao   texto lido por leitores de tela
import { useEffect, useRef, useState } from 'react';

const MARGEM = { topo: 64, direita: 16, baixo: 34, esquerda: 52 };

// cada medida tem um traço diferente, além do nome escrito: não depende só de cor
const TRACO = { media: '', mediana: '7 5', moda: '2 4' };

function topoBonito(maximo) {
  if (maximo <= 0) return 5;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const passo of [1, 2, 2.5, 5, 10]) {
    if (passo * potencia >= maximo) return passo * potencia;
  }
  return 10 * potencia;
}

export default function GraficoHistograma({ faixas, marcadores = [], formatarX = (n) => n, altura = 300, descricao }) {
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

  if (faixas.length === 0) return null;

  const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = altura - MARGEM.topo - MARGEM.baixo;
  const xMin = faixas[0].inicio;
  const xMax = faixas[faixas.length - 1].fim;
  const x = (v) => MARGEM.esquerda + ((v - xMin) / Math.max(1e-9, xMax - xMin)) * larguraUtil;
  const topo = topoBonito(Math.max(...faixas.map((f) => f.vezes)));
  const y = (v) => MARGEM.topo + alturaUtil - (v / topo) * alturaUtil;
  const marcasY = [0, topo / 2, topo];

  // rótulos do eixo X sem encavalar
  const larguraFaixa = larguraUtil / faixas.length;
  const pularX = Math.max(1, Math.ceil(46 / larguraFaixa));

  // nomes das medidas em alturas diferentes, para não ficarem um em cima do outro
  const rotulos = marcadores.filter((m) => m.valor != null);

  return (
    <div className="grafico" ref={caixaRef}>
      <svg width={largura} height={altura} role="img" aria-label={descricao}>
        {marcasY.map((valor) => (
          <g key={valor}>
            <line
              className="grafico-grade"
              x1={MARGEM.esquerda}
              x2={largura - MARGEM.direita}
              y1={y(valor)}
              y2={y(valor)}
            />
            <text className="grafico-eixo" x={MARGEM.esquerda - 8} y={y(valor) + 4} textAnchor="end">
              {Number.isInteger(valor) ? valor : valor.toFixed(1)}
            </text>
          </g>
        ))}

        {faixas.map((faixa, i) => {
          const x1 = x(faixa.inicio) + 1; // 2px de espaço entre colunas
          const w = Math.max(1, x(faixa.fim) - x(faixa.inicio) - 2);
          const h = MARGEM.topo + alturaUtil - y(faixa.vezes);
          return (
            <g key={faixa.inicio} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={x1 - 1} y={MARGEM.topo} width={w + 2} height={alturaUtil} fill="transparent" />
              {h > 0 && (
                <rect
                  className="histograma-coluna"
                  x={x1}
                  y={y(faixa.vezes)}
                  width={w}
                  height={h}
                  rx="2"
                  opacity={hover == null || hover === i ? 1 : 0.55}
                />
              )}
              {i % pularX === 0 && (
                <text className="grafico-eixo" x={x1 + w / 2} y={altura - 10} textAnchor="middle">
                  {formatarX(faixa.inicio)}
                </text>
              )}
            </g>
          );
        })}

        {rotulos.map((marcador, i) => {
          const xm = x(marcador.valor);
          const yRotulo = 16 + i * 16;
          const ancora = xm > largura - 120 ? 'end' : 'start';
          return (
            <g key={marcador.id}>
              <line
                className={`histograma-marcador marcador-${marcador.estilo}`}
                x1={xm}
                x2={xm}
                y1={yRotulo + 4}
                y2={MARGEM.topo + alturaUtil}
                strokeDasharray={TRACO[marcador.estilo]}
              />
              <text
                className={`histograma-rotulo marcador-${marcador.estilo}`}
                x={ancora === 'start' ? xm + 5 : xm - 5}
                y={yRotulo}
                textAnchor={ancora}
              >
                {marcador.nome}
              </text>
            </g>
          );
        })}
      </svg>

      {hover != null && faixas[hover] && (
        <div
          className="grafico-tooltip"
          style={{ top: 70, left: Math.min(largura - 190, x(faixas[hover].fim) + 8) }}
        >
          <p className="grafico-tooltip-titulo">
            {formatarX(faixas[hover].inicio)} a {formatarX(faixas[hover].fim)}
          </p>
          <p className="grafico-tooltip-linha">
            <span>Leituras nessa faixa</span>
            <strong>{faixas[hover].vezes.toLocaleString('pt-BR')}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
