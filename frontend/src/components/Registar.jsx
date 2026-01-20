import React, { useState } from 'react';
import { apiService } from '../Services/api';

const Register = ({ onBackToLogin }) => {
    
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        senha: '',
        role: 'user' 
    });

    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

   
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });
        setLoading(true);

        try {
            
            await apiService.register(formData);
            
            setStatus({ type: 'success', message: 'Conta criada com sucesso! A redirecionar...' });
            
        
            setTimeout(() => {
                onBackToLogin();
            }, 2000);

        } catch (err) {
            setStatus({ 
                type: 'error', 
                message: 'Erro ao registar. Verifique se o utilizador já existe ou se o servidor Java está ligado.' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1>Criar Nova Conta</h1>
                <p className="subtitle">Registe-se como Lojista</p>

                <form onSubmit={handleSubmit} className="form">
                    {status.message && (
                        <p className={`message ${status.type}`} style={{ color: status.type === 'success' ? 'green' : 'red', textAlign: 'center' }}>
                            {status.message}
                        </p>
                    )}

                    <div className="form-group">
                        <label>Nome Completo</label>
                        <input
                            name="nome"
                            type="text"
                            placeholder="Ex: João Silva"
                            value={formData.nome}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            name="email"
                            type="email"
                            placeholder="email@exemplo.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Palavra-passe</label>
                        <input
                            name="senha"
                            type="password"
                            placeholder="Crie uma senha segura"
                            value={formData.senha}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'A processar...' : 'Registar Conta'}
                    </button>
                </form>

                <button onClick={onBackToLogin} className="btn-link" style={{ marginTop: '15px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline' }}>
                    Já tem conta? Voltar ao Login
                </button>
            </div>
        </div>
    );
};

export default Register;