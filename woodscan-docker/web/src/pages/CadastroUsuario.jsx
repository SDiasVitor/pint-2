// src/pages/CadastroUsuario.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as api from '../api';

export default function CadastroUsuario() {
  const [nome, setNome] = useState('');
  const [loginUsuario, setLoginUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const perfil = 'operador'; // único perfil usado neste projeto
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(evento) {
    evento.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await api.cadastrarUsuario({ nome, login: loginUsuario, senha, perfil });
      setSucesso(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (e) {
      setErro(e.message || 'Não foi possível cadastrar.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="tela-centralizada">
      <form className="cartao formulario" onSubmit={handleSubmit}>
        <h1>Novo usuário</h1>

        <label htmlFor="nome">Nome completo</label>
        <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />

        <label htmlFor="login">Usuário (login)</label>
        <input
          id="login"
          value={loginUsuario}
          onChange={(e) => setLoginUsuario(e.target.value)}
          required
        />

        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        {erro && <p className="mensagem-erro">{erro}</p>}
        {sucesso && <p className="mensagem-sucesso">Cadastrado! Redirecionando...</p>}

        <button type="submit" disabled={carregando}>
          {carregando ? 'Cadastrando...' : 'Cadastrar'}
        </button>

        <p className="link-secundario">
          Já tem conta? <Link to="/">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
