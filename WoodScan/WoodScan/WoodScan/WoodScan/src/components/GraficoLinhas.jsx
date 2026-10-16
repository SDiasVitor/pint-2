// src/components/GraficoLinhas.jsx
// Gráfico de linhas em SVG puro (sem biblioteca), com linha-guia e
// caixinha de valores ao passar o mouse ou o dedo.
//
// props:
//   series      [{ id, nome, cor, valores: [n, n, ...] }]  (valores por hora; pode ser mais curto que totalPontos)
//   totalPontos quantos pontos tem o eixo X (24 = 00h a 23h)
//   rotuloX     (indice) => texto do eixo X, ex.: '14h'
//   descricao   texto lido por leitores de tela
import { useEffect, useRef, useState } from 'react';

const MARGEM = { topo: 14, direita: 16, baixo: 30, esquerda: 44 };

// arredonda o topo do eixo Y para um número "bonito" (5, 10, 20, 50...)
function topoBonito(maximo) {
  if (maximo <= 0) return 5;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const passo of [1, 2, 2.5, 5, 10]) {
    if (passo * potencia >= maximo) return passo * potencia;
  }
  return 10 * potencia;
}

export default function GraficoLinhas({ series, totalPontos = 24, rotuloX, altura = 280, descricao }) {
  const caixaRef = useRef(null);
  const [largura, setLargura] = useState(640);
  const [indiceHover, setIndiceHover] = useState(null);

  // acompanha a largura do cartão para o gráfico ocupar o espaço todo
  useEffect(() => {
    const elemento = caixaRef.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(Math.max(280, Math.floor(entrada.contentRect.width)));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = altura - MARGEM.topo - MARGEM.baixo;

  const maximo = Math.max(0, ...series.flatMap((s) => s.valores));
  const topo = topoBonito(maximo);
  const marcasY = [0, topo / 4, topo / 2, (topo * 3) / 4, topo];

  const x = (i) => MARGEM.esquerda + (i * larguraUtil) / Math.max(1, totalPontos - 1);
  const y = (v) => MARGEM.topo + alturaUtil - (v / topo) * alturaUtil;

  // no celular, mostra o rótulo do eixo X de 3 em 3 horas
  const passoX = largura < 520 ? 4 : largura < 760 ? 3 : 2;
  const pontosComDado = Math.max(0, ...series.map((s) => s.valores.length));

  function aoMover(evento) {
    if (pontosComDado === 0) return;
    const caixa = evento.currentTarget.getBoundingClientRect();
    const posicao = evento.clientX - caixa.left;
    const indice = Math.round(((posicao - MARGEM.esquerda) / larguraUtil) * (totalPontos - 1));
    setIndiceHover(Math.min(pontosComDado - 1, Math.max(0, indice)));
  }

  // posição da caixinha: do lado direito da linha-guia, ou do esquerdo se não couber
  const xHover = indiceHover != null ? x(indiceHover) : 0;
  const tooltipNaEsquerda = xHover > largura - 190;

  return (
    <div className="grafico" ref={caixaRef}>
      <svg
        width={largura}
        height={altura}
        role="img"
        aria-label={descricao}
        onPointerMove={aoMover}
        onPointerLeave={() => setIndiceHover(null)}
      >
        {/* grade e eixo Y */}
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

        {/* eixo X */}
        {Array.from({ length: totalPontos }, (_, i) =>
          i % passoX === 0 ? (
            <text key={i} className="grafico-eixo" x={x(i)} y={altura - 8} textAnchor="middle">
              {rotuloX(i)}
            </text>
          ) : null
        )}

        {/* linha-guia do hover */}
        {indiceHover != null && (
          <line
            className="grafico-guia"
            x1={xHover}
            x2={xHover}
            y1={MARGEM.topo}
            y2={MARGEM.topo + alturaUtil}
          />
        )}

        {/* linhas das esteiras */}
        {series.map((serie) =>
          serie.valores.length > 0 ? (
            <path
              key={serie.id}
              className="grafico-linha"
              stroke={serie.cor}
              d={serie.valores
                .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
                .join(' ')}
            />
          ) : null
        )}

        {/* pontos do hover */}
        {indiceHover != null &&
          series.map((serie) =>
            serie.valores[indiceHover] != null ? (
              <circle
                key={serie.id}
                className="grafico-ponto"
                cx={xHover}
                cy={y(serie.valores[indiceHover])}
                r="5"
                fill={serie.cor}
              />
            ) : null
          )}

        {/* área invisível que captura o mouse/dedo */}
        <rect
          x={MARGEM.esquerda}
          y={MARGEM.topo}
          width={larguraUtil}
          height={alturaUtil}
          fill="transparent"
        />
      </svg>

      {indiceHover != null && (
        <div
          className="grafico-tooltip"
          style={{
            left: tooltipNaEsquerda ? undefined : xHover + 14,
            right: tooltipNaEsquerda ? largura - xHover + 14 : undefined,
          }}
        >
          <p className="grafico-tooltip-titulo">{rotuloX(indiceHover)}</p>
          {series.map((serie) => (
            <p key={serie.id} className="grafico-tooltip-linha">
              <span className="amostra-cor" style={{ background: serie.cor }} />
              <span>{serie.nome}</span>
              <strong>{(serie.valores[indiceHover] ?? 0).toLocaleString('pt-BR')}</strong>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
