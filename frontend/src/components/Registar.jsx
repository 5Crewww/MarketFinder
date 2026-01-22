import React, { useState } from 'react';
import { apiService } from '../Services/api';
import styles from './Registar.module.css'; // <--- Importar o CSS Módulo

const Register = ({ onBackToLogin }) => {
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        senha: '',
        role: 'user' // Fixado como user (Cliente)
    });

    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                message: 'Erro ao registar. Verifique os dados ou tente outro email.' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.box}>
                <h1 className={styles.title}>Criar Conta</h1>
                <p className={styles.subtitle}>Junte-se a nós para fazer as suas compras!</p>

                <form onSubmit={handleSubmit}>
                    {status.message && (
                        <div className={`${styles.message} ${status.type === 'success' ? styles.success : styles.error}`}>
                            {status.message}
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Nome Completo</label>
                        <input 
                            className="inputGlobal" 
                            name="nome" 
                            type="text" 
                            placeholder="Ex: Maria Santos" 
                            value={formData.nome} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input 
                            className="inputGlobal" 
                            name="email" 
                            type="email" 
                            placeholder="email@exemplo.com" 
                            value={formData.email} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Palavra-passe</label>
                        <input 
                            className="inputGlobal" 
                            name="senha" 
                            type="password" 
                            placeholder="Crie uma senha segura" 
                            value={formData.senha} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>

                    <button type="submit" className="btnPrimary" disabled={loading} style={{width: '100%', marginTop: '10px'}}>
                        {loading ? 'A criar conta...' : 'Registar'}
                    </button>
                </form>

                <button onClick={onBackToLogin} className={styles.linkBtn}>
                    Já tem conta? Voltar ao Login
                </button>
            </div>
        </div>
    );
};

export default Register;