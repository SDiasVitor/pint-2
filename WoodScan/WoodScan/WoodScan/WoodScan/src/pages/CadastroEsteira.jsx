// src/pages/CadastroEsteira.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as api from '../api';

export default function CadastroEsteira() {
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(evento) {
    evento.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await api.cadastrarEsteira({ codigo, nome });
      setSucesso(true);
      setTimeout(() => navigate('/painel'), 1200);
    } catch (e) {
      setErro(e.message || 'Não foi possível cadastrar a esteira.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="tela-centralizada">
      <form className="cartao formulario" onSubmit={handleSubmit}>
        <h1>Nova esteira</h1>

        <label htmlFor="codigo">Código (usado no sistema, ex: esteira6)</label>
        <input
          id="codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="esteira6"
          required
        />

        <label htmlFor="nome">Nome de exibição</label>
        <input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Esteira 6"
          required
        />

        {erro && <p className="mensagem-erro">{erro}</p>}
        {sucesso && <p className="mensagem-sucesso">Esteira cadastrada!</p>}

        <button type="submit" disabled={carregando}>
          {carregando ? 'Salvando...' : 'Cadastrar'}
        </button>

        <p className="link-secundario">
          <Link to="/painel">Cancelar</Link>
        </p>
      </form>
    </div>
  );
}
