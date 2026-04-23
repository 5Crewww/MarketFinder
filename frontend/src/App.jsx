import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Registar';
import Admin from './components/Admin';
import Lojista from './components/Lojista'; 
import User from './components/User'; 
import { apiService } from './Services/api';
import { StoreSelectionProvider } from './context/StoreSelectionContext';

function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Escuta o evento customizado disparado pelo api.js quando um 401 é detetado.
  // Faz logout do estado React e exibe a mensagem de sessão expirada no ecrã de login.
  useEffect(() => {
    const handleSessionExpired = (event) => {
      setUser(null);
      setShowRegister(false);
      setSessionMessage(event.detail?.message || 'A sua sessao expirou. Por favor, faca login novamente.');

      // Limpa a notificação automaticamente após 8 segundos
      setTimeout(() => setSessionMessage(null), 8000);
    };

    window.addEventListener('session:expired', handleSessionExpired);
    return () => window.removeEventListener('session:expired', handleSessionExpired);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setSessionMessage(null);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      // O cliente limpa a sessão local mesmo que o backend já a tenha invalidado.
    }
    localStorage.removeItem('currentUser');
    setUser(null);
    setShowRegister(false);
  };

  if (loading) return <div className="loading">A carregar sistema...</div>;

  if (!user) {
    return showRegister ? (
      <Register onBackToLogin={() => setShowRegister(false)} />
    ) : (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onNavigateToRegister={() => setShowRegister(true)}
        sessionMessage={sessionMessage}
      />
    );
  }

  
  switch (user.role) {
    case 'admin':
      return <Admin onLogout={handleLogout} />;
      
    case 'lojista':
      return <Lojista user={user} onLogout={handleLogout} />;
      
    case 'user':
    default:
      return (
        <StoreSelectionProvider user={user}>
          <User user={user} onLogout={handleLogout} />
        </StoreSelectionProvider>
      );
  }
}

export default App;
