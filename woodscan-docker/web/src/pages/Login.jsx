// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';

export default function Login() {
  const [loginUsuario, setLoginUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(evento) {
    evento.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const usuario = await api.login(loginUsuario, senha);
      login(usuario);
      navigate('/painel');
    } catch (e) {
      setErro('Login ou senha inválidos.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="tela-centralizada">
      <form className="cartao formulario" onSubmit={handleSubmit}>
        <h1>WoodScan</h1>
        <p className="subtitulo">Contagem automatizada de lâminas</p>

        <label htmlFor="login">Usuário</label>
        <input
          id="login"
          type="text"
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

        <button type="submit" disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="link-secundario">
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}
