import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Registar';
import Admin from './components/Admin';
import Lojista from './components/Lojista'; // Vamos criar este a seguir

function App() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    setShowRegister(false);
  };

  if (loading) return <div className="loading">A carregar sistema...</div>;

  // 1. Se não estiver logado, alterna entre Login e Registo
  if (!user) {
    return showRegister ? (
      <Register onBackToLogin={() => setShowRegister(false)} />
    ) : (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        onNavigateToRegister={() => setShowRegister(true)} 
      />
    );
  }

  // 2. Se estiver logado, decide entre Admin ou Lojista
  return (
    <div className="app-main">
      {user.role === 'admin' ? (
        <Admin onLogout={handleLogout} />
      ) : (
        /* O componente Lojista terá internamente a "Client View" */
        <Lojista user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;