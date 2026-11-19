// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const salvo = localStorage.getItem('woodscan_usuario');
    return salvo ? JSON.parse(salvo) : null;
  });

  useEffect(() => {
    if (usuario) {
      localStorage.setItem('woodscan_usuario', JSON.stringify(usuario));
    } else {
      localStorage.removeItem('woodscan_usuario');
    }
  }, [usuario]);

  function login(dadosUsuario) {
    setUsuario(dadosUsuario);
  }

  function logout() {
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
