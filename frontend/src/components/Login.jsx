import React, { useState } from 'react';
import { apiService } from '../Services/api';

const Login = ({ onLoginSuccess, onNavigateToRegister }) => {
    // Estados para controlar os inputs e mensagens
    const [nome, setNome] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');
        setLoading(true);

        try {
            console.log("A enviar login:", { nome, senha }); // Debug

            // --- CORREÇÃO PRINCIPAL AQUI ---
            // Antes tinhas: apiService.login(nome) -> Faltava a senha!
            // Agora:
            const user = await apiService.login(nome, senha);

            // --- LÓGICA ATUALIZADA ---
            // Se chegámos aqui, o Backend já confirmou que a senha está certa.
            // Não precisamos do "if (user.senha === senha)"

            // Definimos o role se não vier do banco (fallback)
            const userWithRole = {
                ...user,
                // Se o backend já mandar role, usa-o. Senão, usa a lógica do nome.
                role: user.role || (user.nome.toLowerCase() === 'admin' ? 'admin' : 'lojista')
            };
            
            // Avisa o App.jsx que o login foi um sucesso
            onLoginSuccess(userWithRole);

        } catch (err) {
            console.error("Erro Login:", err);
            // Se o backend der erro 401, cai aqui
            setErro('Palavra-passe incorreta ou utilizador inexistente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box"> {/* Se usares o meu CSS anterior, muda class para "login-card" */}
                <div className="logo" style={{fontSize: '3rem', marginBottom: '10px'}}>🛒</div>
                <h1>Supermarket Finder</h1>
                
                <form onSubmit={handleSubmit} className="form">
                    {erro && <p className="error-message" style={{ color: 'red', background:'#ffe6e6', padding:'10px', borderRadius:'5px', marginBottom: '15px' }}>{erro}</p>}
                    
                    <div className="form-group" style={{marginBottom: '15px'}}>
                        <label style={{display:'block', marginBottom:'5px'}}>Nome de Utilizador</label>
                        <input
                            type="text"
                            placeholder="Introduza o seu nome"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            required
                            style={{width: '100%', padding: '10px'}}
                        />
                    </div>

                    <div className="form-group" style={{marginBottom: '20px'}}>
                        <label style={{display:'block', marginBottom:'5px'}}>Palavra-passe</label>
                        <input
                            type="password"
                            placeholder="Introduza a sua senha"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            required
                            style={{width: '100%', padding: '10px'}}
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{width: '100%', padding: '12px', cursor:'pointer'}}>
                        {loading ? 'A verificar...' : 'Entrar'}
                    </button>
                </form>

                <p className="form-footer" style={{marginTop: '20px'}}>
                    Ainda não tem conta?{' '}
                    <button 
                        onClick={onNavigateToRegister} 
                        style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Registar-se
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;