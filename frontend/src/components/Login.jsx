import React, { useState } from 'react';
import { apiService } from '../Services/api';
import styles from './Login.module.css';

const Login = ({ onLoginSuccess, onNavigateToRegister }) => {
    const [nome, setNome] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');
        setLoading(true);
        try {
            const user = await apiService.login(nome, senha);
            const userWithRole = {
                ...user,
                role: user.role || (user.nome.toLowerCase() === 'admin' ? 'admin' : 'user')
            };
            onLoginSuccess(userWithRole);
        } catch (err) {
            setErro('Credenciais inválidas.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.box}> 
                <div className={styles.logo}>🛒</div>
                <h1 className={styles.title}>Supermarket Finder</h1>
                
                <form onSubmit={handleSubmit}>
                    {erro && <p className={styles.error}>{erro}</p>}
                    
                    <div style={{marginBottom: '15px'}}>
                        <label className={styles.label}>Nome de Utilizador</label>
                        <input className="inputGlobal" type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                    </div>

                    <div style={{marginBottom: '20px'}}>
                        <label className={styles.label}>Palavra-passe</label>
                        <input className="inputGlobal" type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} required />
                    </div>

                    <button type="submit" className="btnPrimary" disabled={loading} style={{width:'100%'}}>
                        {loading ? 'A verificar...' : 'Entrar'}
                    </button>
                </form>

                <p style={{marginTop: '20px', fontSize:'0.9rem', color:'#64748b'}}>
                    Ainda não tem conta?{' '}
                    <button onClick={onNavigateToRegister} className={styles.linkBtn}>
                        Criar conta de Cliente
                    </button>
                </p>
            </div>
        </div>
    );
};
export default Login;