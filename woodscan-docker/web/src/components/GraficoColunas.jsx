// src/components/GraficoColunas.jsx
// Gráfico de colunas em SVG puro: uma coluna por item (ex.: uma por esteira),
// com o valor escrito em cima e caixinha ao passar o mouse.
//
// props:
//   itens         [{ id, nome, cor, valor }]
//   formatarValor (n) => texto mostrado em cima da coluna e no eixo
//   passosEixo    (opcional) intervalos permitidos no eixo Y, ex.: [15, 30, 60] minutos
//   descricao     texto lido por leitores de tela
import { useEffect, useRef, useState } from 'react';

const MARGEM = { topo: 26, direita: 12, baixo: 34, esquerda: 68 };

function topoBonito(maximo) {
  if (maximo <= 0) return 5;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const passo of [1, 2, 2.5, 5, 10]) {
    if (passo * potencia >= maximo) return passo * potencia;
  }
  return 10 * potencia;
}

// coluna com só os cantos de cima arredondados (a base fica reta, encostada no eixo)
function caminhoColuna(x, y, largura, altura, raio) {
  const r = Math.min(raio, largura / 2, altura);
  if (altura <= 0) return '';
  return (
    `M${x},${y + altura} L${x},${y + r} Q${x},${y} ${x + r},${y} ` +
    `L${x + largura - r},${y} Q${x + largura},${y} ${x + largura},${y + r} ` +
    `L${x + largura},${y + altura} Z`
  );
}

export default function GraficoColunas({
  itens,
  formatarValor = (n) => n.toLocaleString('pt-BR'),
  passosEixo,
  altura = 260,
  descricao,
}) {
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

  const larguraUtil = largura - MARGEM.esquerda - MARGEM.direita;
  const alturaUtil = altura - MARGEM.topo - MARGEM.baixo;
  // eixo Y com 4 intervalos iguais; com passosEixo o intervalo sai de uma lista (ex.: 30 min, 1 h, 2 h)
  const maximo = Math.max(0, ...itens.map((i) => i.valor));
  let topo = topoBonito(maximo);
  if (passosEixo && passosEixo.length) {
    const passo = passosEixo.find((p) => p * 4 >= maximo) || passosEixo[passosEixo.length - 1];
    topo = Math.max(passo * 4, Math.ceil(maximo / passo) * passo);
  }
  const marcasY = [0, topo / 4, topo / 2, (topo * 3) / 4, topo];
  const y = (v) => MARGEM.topo + alturaUtil - (v / topo) * alturaUtil;

  const faixa = larguraUtil / Math.max(1, itens.length);
  const larguraColuna = Math.min(64, faixa * 0.6);

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
              {formatarValor(valor)}
            </text>
          </g>
        ))}

        {itens.map((item, i) => {
          const centro = MARGEM.esquerda + faixa * i + faixa / 2;
          const x = centro - larguraColuna / 2;
          const alturaColuna = MARGEM.topo + alturaUtil - y(item.valor);
          return (
            <g
              key={item.id}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            >
              {/* área maior que a coluna, para facilitar o hover */}
              <rect x={centro - faixa / 2} y={MARGEM.topo} width={faixa} height={alturaUtil} fill="transparent" />
              <path
                d={caminhoColuna(x, y(item.valor), larguraColuna, alturaColuna, 4)}
                fill={item.cor}
                opacity={hover == null || hover === i ? 1 : 0.55}
              />
              <text className="grafico-valor" x={centro} y={y(item.valor) - 8} textAnchor="middle">
                {formatarValor(item.valor)}
              </text>
              <text className="grafico-eixo" x={centro} y={altura - 10} textAnchor="middle">
                {/* sem espaço (celular): "Esteira 1" vira "E1" */}
                {faixa < item.nome.length * 7.5 ? item.nome.replace(/^Esteira\s*/i, 'E') : item.nome}
              </text>
            </g>
          );
        })}
      </svg>

      {hover != null && itens[hover] && (
        <div
          className="grafico-tooltip"
          style={{
            left: Math.min(
              largura - 190,
              MARGEM.esquerda + faixa * hover + faixa / 2 + larguraColuna / 2 + 10
            ),
          }}
        >
          <p className="grafico-tooltip-linha">
            <span className="amostra-cor" style={{ background: itens[hover].cor }} />
            <span>{itens[hover].nome}</span>
            <strong>{formatarValor(itens[hover].valor)}</strong>
          </p>
          {itens[hover].detalhe && <p className="grafico-tooltip-extra">{itens[hover].detalhe}</p>}
        </div>
      )}
    </div>
  );
}
