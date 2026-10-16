// src/components/GraficoBarrasEmpilhadas.jsx
// Barras horizontais empilhadas: uma barra por categoria (ex.: um defeito),
// dividida em pedaços coloridos (ex.: uma cor por esteira).
// O comprimento total mostra o geral; os pedaços mostram cada esteira.
//
// props:
//   linhas  [{ id, nome, total, partes: [{ id, nome, cor, valor }] }]  (já em ordem)
//   unidade texto depois do número, ex.: 'ocorrências'
import { useEffect, useRef, useState } from 'react';

const ALTURA_BARRA = 22;
const ESPACO = 18;
const LARGURA_ROTULO_MAX = 230;

export default function GraficoBarrasEmpilhadas({ linhas, unidade = '', descricao }) {
  const caixaRef = useRef(null);
  const [largura, setLargura] = useState(640);
  const [hover, setHover] = useState(null); // { linha, parte }

  useEffect(() => {
    const elemento = caixaRef.current;
    if (!elemento) return undefined;
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(Math.max(280, Math.floor(entrada.contentRect.width)));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  // no celular o nome do defeito vai em cima da barra; no computador, ao lado
  const compacto = largura < 560;
  const larguraRotulo = compacto ? 0 : Math.min(LARGURA_ROTULO_MAX, largura * 0.34);
  const larguraNumero = 44;
  const larguraUtil = largura - larguraRotulo - larguraNumero - 8;
  const alturaLinha = ALTURA_BARRA + ESPACO + (compacto ? 18 : 0);
  const altura = linhas.length * alturaLinha + 4;
  const maximo = Math.max(1, ...linhas.map((l) => l.total));
  const escala = (v) => (v / maximo) * larguraUtil;

  return (
    <div className="grafico" ref={caixaRef}>
      <svg width={largura} height={altura} role="img" aria-label={descricao}>
        {linhas.map((linha, i) => {
          const yTopo = i * alturaLinha + (compacto ? 18 : 0);
          let x = larguraRotulo;
          return (
            <g key={linha.id}>
              <text
                className="grafico-rotulo"
                x={compacto ? 0 : larguraRotulo - 12}
                y={compacto ? yTopo - 6 : yTopo + ALTURA_BARRA / 2 + 5}
                textAnchor={compacto ? 'start' : 'end'}
              >
                {linha.nome}
              </text>

              {linha.partes.map((parte, j) => {
                const w = escala(parte.valor);
                const inicio = x;
                x += w;
                if (w <= 0) return null;
                // 2px de espaço entre os pedaços, para separar as cores
                const larguraVisivel = Math.max(1, w - (j < linha.partes.length - 1 ? 2 : 0));
                const ativo = !hover || (hover.linha === i && hover.parte === j);
                return (
                  <rect
                    key={parte.id}
                    x={inicio}
                    y={yTopo}
                    width={larguraVisivel}
                    height={ALTURA_BARRA}
                    rx="3"
                    fill={parte.cor}
                    opacity={ativo ? 1 : 0.45}
                    onPointerEnter={() => setHover({ linha: i, parte: j })}
                    onPointerLeave={() => setHover(null)}
                  />
                );
              })}

              <text
                className="grafico-valor"
                x={larguraRotulo + escala(linha.total) + 8}
                y={yTopo + ALTURA_BARRA / 2 + 5}
              >
                {linha.total}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && linhas[hover.linha] && (
        <div
          className="grafico-tooltip"
          style={{ top: hover.linha * alturaLinha + alturaLinha, left: Math.max(0, larguraRotulo) }}
        >
          <p className="grafico-tooltip-titulo">{linhas[hover.linha].nome}</p>
          {linhas[hover.linha].partes
            .filter((p) => p.valor > 0)
            .map((parte) => (
              <p key={parte.id} className="grafico-tooltip-linha">
                <span className="amostra-cor" style={{ background: parte.cor }} />
                <span>{parte.nome}</span>
                <strong>
                  {parte.valor} {unidade}
                </strong>
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
