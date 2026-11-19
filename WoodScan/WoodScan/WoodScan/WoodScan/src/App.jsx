// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import CadastroUsuario from './pages/CadastroUsuario';
import Home from './pages/Home';
import EsteiraDetalhe from './pages/EsteiraDetalhe';
import CadastroEsteira from './pages/CadastroEsteira';
import Historico from './pages/Historico';
import Manutencao from './pages/Manutencao';
import Dashboard from './pages/Dashboard';
import AnaliseDados from './pages/AnaliseDados';
import BotaoTema from './components/BotaoTema';
import './App.css';

function RotaProtegida({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/cadastro" element={<CadastroUsuario />} />
          <Route
            path="/painel"
            element={
              <RotaProtegida>
                <Home />
              </RotaProtegida>
            }
          />
          <Route
            path="/esteira/:esteiraId"
            element={
              <RotaProtegida>
                <EsteiraDetalhe />
              </RotaProtegida>
            }
          />
          <Route
            path="/cadastro-esteira"
            element={
              <RotaProtegida>
                <CadastroEsteira />
              </RotaProtegida>
            }
          />
          <Route
            path="/analise"
            element={
              <RotaProtegida>
                <AnaliseDados />
              </RotaProtegida>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RotaProtegida>
                <Dashboard />
              </RotaProtegida>
            }
          />
          <Route
            path="/manutencao"
            element={
              <RotaProtegida>
                <Manutencao />
              </RotaProtegida>
            }
          />
          <Route
            path="/historico"
            element={
              <RotaProtegida>
                <Historico />
              </RotaProtegida>
            }
          />
        </Routes>

        {/* aparece em todas as páginas, inclusive no login */}
        <BotaoTema />
      </BrowserRouter>
    </AuthProvider>
  );
}
