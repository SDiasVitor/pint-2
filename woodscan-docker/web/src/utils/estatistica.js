// src/utils/estatistica.js
// Medidas de tendência central calculadas a partir de uma TABELA DE FREQUÊNCIA:
//   { "25.3": 12, "25.4": 7, ... }  ->  o valor 25.3 apareceu 12 vezes, o 25.4 apareceu 7...
// Trabalhar com a tabela (e não com uma lista de milhares de leituras) dá o mesmo resultado
// e deixa a página leve.

// transforma { "25.3": 12 } em [{ valor: 25.3, vezes: 12 }, ...] já em ordem crescente
export function ordenarTabela(tabela) {
  return Object.entries(tabela || {})
    .map(([valor, vezes]) => ({ valor: Number(valor), vezes }))
    .filter((item) => Number.isFinite(item.valor) && item.vezes > 0)
    .sort((a, b) => a.valor - b.valor);
}

// junta tabelas de várias esteiras numa só (opção "Todas as esteiras")
export function somarTabelas(tabelas) {
  const total = {};
  tabelas.forEach((tabela) => {
    Object.entries(tabela || {}).forEach(([valor, vezes]) => {
      total[valor] = (total[valor] || 0) + vezes;
    });
  });
  return total;
}

// lista simples [10, 12, 12, 15] -> tabela { "10": 1, "12": 2, "15": 1 }
export function listaParaTabela(lista) {
  const tabela = {};
  lista.forEach((valor) => {
    tabela[valor] = (tabela[valor] || 0) + 1;
  });
  return tabela;
}

export function quantidade(itens) {
  return itens.reduce((soma, item) => soma + item.vezes, 0);
}

// MÉDIA ARITMÉTICA = soma de todos os valores ÷ quantidade de valores
export function media(itens) {
  const n = quantidade(itens);
  if (n === 0) return null;
  const soma = itens.reduce((s, item) => s + item.valor * item.vezes, 0);
  return soma / n;
}

// MEDIANA = valor do meio quando os dados estão em ordem crescente
// (com quantidade par, é a média dos dois valores do meio)
export function mediana(itens) {
  const n = quantidade(itens);
  if (n === 0) return null;

  // posição (começando em 1) do elemento de número k na lista ordenada
  function elemento(k) {
    let acumulado = 0;
    for (const item of itens) {
      acumulado += item.vezes;
      if (acumulado >= k) return item.valor;
    }
    return itens[itens.length - 1].valor;
  }

  if (n % 2 === 1) return elemento((n + 1) / 2);
  return (elemento(n / 2) + elemento(n / 2 + 1)) / 2;
}

// MODA = valor que mais se repete.
// Dados discretos (lâminas por hora: 10, 12, 12...): conta cada valor exato.
// Dados contínuos (temperatura 25,3 °C, 25,4 °C...): quase nenhum valor se repete, então os
// valores são agrupados em faixas (classes) de tamanho "passo", as mesmas do histograma,
// e a moda é a CLASSE MODAL (a faixa com mais leituras), ex.: "25 a 26 °C".
// Devolve { valores: [início de cada faixa/valor modal], vezes, amodal }.
// Pode haver mais de uma moda (bimodal, multimodal) ou nenhuma (amodal).
export function moda(itens, passo = 1, discreto = false) {
  if (itens.length === 0) return { valores: [], vezes: 0, amodal: true };

  const grupos = new Map();
  itens.forEach((item) => {
    const chave = discreto ? item.valor : Math.floor(item.valor / passo + 1e-9) * passo;
    grupos.set(chave, (grupos.get(chave) || 0) + item.vezes);
  });

  const maior = Math.max(...grupos.values());
  const valores = [...grupos.entries()]
    .filter(([, vezes]) => vezes === maior)
    .map(([valor]) => Number(valor.toFixed(4)))
    .sort((a, b) => a - b);

  const amodal = grupos.size > 1 && valores.length === grupos.size;
  return { valores: amodal ? [] : valores, vezes: maior, amodal };
}

export function minimo(itens) {
  return itens.length ? itens[0].valor : null;
}

export function maximo(itens) {
  return itens.length ? itens[itens.length - 1].valor : null;
}

// Monta o histograma: faixas de tamanho "passo" com quantas leituras caíram em cada uma
export function histograma(itens, passo = 1) {
  if (itens.length === 0) return [];
  const inicio = Math.floor(minimo(itens) / passo) * passo;
  const fim = Math.floor(maximo(itens) / passo) * passo;
  const faixas = [];
  for (let x = inicio; x <= fim + 1e-9; x += passo) {
    faixas.push({ inicio: Number(x.toFixed(4)), fim: Number((x + passo).toFixed(4)), vezes: 0 });
  }
  itens.forEach((item) => {
    const indice = Math.min(faixas.length - 1, Math.floor((item.valor - inicio) / passo + 1e-9));
    faixas[indice].vezes += item.vezes;
  });
  return faixas;
}

// Leitura rápida da forma da distribuição comparando média e mediana
export function interpretar(mediaValor, medianaValor, maximoValor, minimoValor) {
  if (mediaValor == null || medianaValor == null) return '';
  const amplitude = Math.max(1e-9, (maximoValor ?? 0) - (minimoValor ?? 0));
  const diferenca = (mediaValor - medianaValor) / amplitude;
  if (Math.abs(diferenca) < 0.03) {
    return 'Média e mediana estão praticamente iguais: os dados estão distribuídos de forma simétrica.';
  }
  if (diferenca > 0) {
    return 'A média está acima da mediana: existem alguns valores altos puxando a média para cima (assimetria à direita).';
  }
  return 'A média está abaixo da mediana: existem alguns valores baixos puxando a média para baixo (assimetria à esquerda).';
}
