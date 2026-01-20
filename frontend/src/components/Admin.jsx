import React, { useState, useEffect } from 'react';
import { apiService } from '../Services/api';

const Admin = ({ onLogout }) => {
    const [usuarios, setUsuarios] = useState([]);
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newUser, setNewUser] = useState({
        nome: '',
        email: '',
        senha: '',
        role: 'lojista'
    });

    // 1. Carregar a lista de utilizadores ao montar o componente
    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const data = await apiService.getAllUsers();
            setUsuarios(Array.isArray(data) ? data : []);
        } catch (err) {
            setErro('Erro ao carregar utilizadores');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            
            await apiService.register(newUser);
            
            alert(`Utilizador "${newUser.nome}" criado como ${newUser.role.toUpperCase()} com sucesso!`)
            setNewUser({ nome: '', email: '', senha: '', role: 'lojista' });
            setShowForm(false);
            carregarDados();

        } catch (err) {
            alert("Erro ao criar utilizador. O email pode já existir.");
        }
    };

    // 2. Função para eliminar utilizador
    const handleDelete = async (id) => {
        if (window.confirm("Tem a certeza que deseja eliminar este utilizador?")) {
            try {
                await apiService.deleteUser(id);
                setUsuarios(usuarios.filter(u => (u.idUser || u.id) !== id));
                alert("Utilizador removido com sucesso!");
            } catch (err) {
                alert("Erro ao eliminar utilizador.");
            }
        }
    };

    const getRoleBadgeColor = (role) => {
        switch(role) {
            case 'admin': return '#8e44ad'; 
            case 'lojista': return '#e67e22'; 
            default: return '#27ae60'; 
        }
    };

return (
        <div className="admin-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* --- HEADER --- */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
                <div>
                    <h1 style={{ color: '#2c3e50', margin: 0 }}>Painel Administrativo</h1>
                    <p style={{ color: '#7f8c8d', margin: 0 }}>Gestão de Lojistas e Utilizadores</p>
                </div>
                <button onClick={onLogout} style={{ padding: '10px 20px', background: '#c0392b', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Sair do Sistema
                </button>
            </header>

            {erro && <p style={{ padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>{erro}</p>}

            {/* --- STATS --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={statCardStyle}>
                    <h3>Total Contas</h3>
                    <p style={statNumberStyle}>{usuarios.length}</p>
                </div>
                <div style={{...statCardStyle, borderLeft: '5px solid #e67e22'}}>
                    <h3>Lojistas</h3>
                    <p style={statNumberStyle}>{usuarios.filter(u => u.role === 'lojista').length}</p>
                </div>
                <div style={{...statCardStyle, borderLeft: '5px solid #27ae60'}}>
                    <h3>Clientes</h3>
                    <p style={statNumberStyle}>{usuarios.filter(u => (!u.role || u.role === 'user')).length}</p>
                </div>
            </div>

            {/* --- BOTÃO DE AÇÃO --- */}
            <button 
                onClick={() => setShowForm(!showForm)} 
                style={{ 
                    marginBottom: '1.5rem', 
                    padding: '12px 24px', 
                    background: '#3498db', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px', 
                    cursor: 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}
            >
                {showForm ? '❌ Cancelar Criação' : '➕ Criar Novo Utilizador'}
            </button>

            {/* --- FORMULÁRIO DE CRIAÇÃO) --- */}
            {showForm && (
                <form onSubmit={handleCreateUser} style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '2rem' }}>
                    <h3 style={{ marginTop: 0 }}>Adicionar Novo Membro</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.9rem', marginBottom: '5px' }}>Nome</label>
                            <input required type="text" value={newUser.nome} onChange={e => setNewUser({...newUser, nome: e.target.value})} style={inputStyle} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.9rem', marginBottom: '5px' }}>Email</label>
                            <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} style={inputStyle} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.9rem', marginBottom: '5px' }}>Senha</label>
                            <input required type="password" value={newUser.senha} onChange={e => setNewUser({...newUser, senha: e.target.value})} style={inputStyle} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.9rem', marginBottom: '5px', fontWeight: 'bold', color: '#d35400' }}>Cargo (Role)</label>
                            <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={inputStyle}>
                                <option value="lojista">🛒 Lojista (Gestor de Loja)</option>
                                <option value="admin">🔒 Administrador</option>
                                <option value="user">👤 Cliente Normal</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" style={{ marginTop: '15px', padding: '10px 30px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Confirmar Criação
                    </button>
                </form>
            )}

            {loading ? (
                <p>A carregar base de dados...</p>
            ) : (
                <div className="table-responsive" style={{ boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'white' }}>
                        <thead style={{ background: '#34495e', color: 'white' }}>
                            <tr>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Nome</th>
                                <th style={thStyle}>Email</th>
                                <th style={thStyle}>Cargo</th>
                                <th style={thStyle}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.length > 0 ? (
                                usuarios.map((u) => (
                                    <tr key={u.idUser || u.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={tdStyle}>#{u.idUser || u.id}</td>
                                        <td style={tdStyle}>{u.nome}</td>
                                        <td style={tdStyle}>{u.email}</td>
                                        <td style={tdStyle}>
                                            <span style={{ 
                                                padding: '5px 10px', 
                                                borderRadius: '15px', 
                                                fontSize: '0.85rem',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                backgroundColor: getRoleBadgeColor(u.role)
                                            }}>
                                                {u.role ? u.role.toUpperCase() : 'USER'}
                                            </span>
                                        </td>
                                        <td style={tdStyle}>
                                            <button 
                                                onClick={() => handleDelete(u.idUser || u.id)}
                                                style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                                                title="Eliminar Conta"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Nenhum utilizador encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


const statCardStyle = { padding: '1.5rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' };
const statNumberStyle = { fontSize: '2rem', fontWeight: 'bold', margin: '10px 0 0 0', color: '#333' };
const inputStyle = { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' };
const thStyle = { padding: '15px' };
const tdStyle = { padding: '15px' };

export default Admin;