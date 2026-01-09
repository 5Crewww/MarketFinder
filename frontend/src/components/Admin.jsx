import React, { useState, useEffect } from 'react';
import { apiService } from '../Services/api';

const Admin = ({ onLogout }) => {
    const [usuarios, setUsuarios] = useState([]);
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(true);

    // 1. Carregar a lista de utilizadores ao montar o componente
    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const data = await apiService.getAllUsers();
            setUsuarios(data);
        } catch (err) {
            setErro('Erro ao carregar utilizadores. O servidor está ligado?');
        } finally {
            setLoading(false);
        }
    };

    // 2. Função para eliminar utilizador
    const handleDelete = async (id) => {
        if (window.confirm("Tem a certeza que deseja eliminar este utilizador?")) {
            try {
                await apiService.deleteUser(id);
                // Atualiza a lista localmente para não precisar de fazer novo fetch
                setUsuarios(usuarios.filter(u => (u.idUser || u.id) !== id));
                alert("Utilizador removido com sucesso!");
            } catch (err) {
                alert("Erro ao eliminar utilizador.");
            }
        }
    };

    return (
        <div className="admin-container" style={{ padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                    <h1>Painel Administrativo</h1>
                    <p>Gestão de Contas de Lojistas</p>
                </div>
                <button onClick={onLogout} className="btn-secondary" style={{ height: 'fit-content' }}>
                    Sair do Sistema
                </button>
            </header>

            {erro && <p style={{ color: 'red' }}>{erro}</p>}

            <div className="stats-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <h3>Total de Utilizadores</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{usuarios.length}</p>
                </div>
            </div>

            {loading ? (
                <p>A carregar utilizadores...</p>
            ) : (
                <div className="table-responsive">
                    <table border="1" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#eee' }}>
                            <tr>
                                <th style={{ padding: '12px' }}>ID</th>
                                <th style={{ padding: '12px' }}>Nome</th>
                                <th style={{ padding: '12px' }}>Email</th>
                                <th style={{ padding: '12px' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.length > 0 ? (
                                usuarios.map((u) => (
                                    <tr key={u.idUser || u.id}>
                                        <td style={{ padding: '12px' }}>{u.idUser || u.id}</td>
                                        <td style={{ padding: '12px' }}>{u.nome}</td>
                                        <td style={{ padding: '12px' }}>{u.email}</td>
                                        <td style={{ padding: '12px' }}>
                                            <button 
                                                onClick={() => handleDelete(u.idUser || u.id)}
                                                style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>Nenhum utilizador encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Admin;