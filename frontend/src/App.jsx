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
