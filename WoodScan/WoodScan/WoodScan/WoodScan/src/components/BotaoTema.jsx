// src/components/BotaoTema.jsx
// Botão fixo no canto da tela que alterna entre tema claro e escuro.
// A escolha fica salva no navegador; na primeira visita segue o tema do sistema.
import { useEffect, useState } from 'react';

const CHAVE = 'woodscan_tema';

function temaInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === 'claro' || salvo === 'escuro') return salvo;
  } catch (e) {
    // navegador bloqueou o localStorage: segue o sistema
  }
  const sistemaEscuro =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return sistemaEscuro ? 'escuro' : 'claro';
}

function IconeSol() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export default function BotaoTema() {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    // o CSS troca as cores quando o <html> tem data-theme="dark"
    document.documentElement.dataset.theme = tema === 'escuro' ? 'dark' : 'light';
    try {
      localStorage.setItem(CHAVE, tema);
    } catch (e) {
      // sem localStorage: só não lembra a escolha
    }
  }, [tema]);

  const proximo = tema === 'escuro' ? 'claro' : 'escuro';

  return (
    <button
      type="button"
      className="botao-tema"
      onClick={() => setTema(proximo)}
      aria-label={`Mudar para tema ${proximo}`}
      title={`Mudar para tema ${proximo}`}
    >
      {tema === 'escuro' ? <IconeSol /> : <IconeLua />}
      {tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
    </button>
  );
}
