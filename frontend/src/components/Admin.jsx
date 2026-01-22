import React, { useState, useEffect } from 'react';
import { apiService } from '../Services/api';
import styles from './Admin.module.css'; // <--- IMPORTAR MÓDULO

const Admin = ({ onLogout }) => {
    const [usuarios, setUsuarios] = useState([]);
    const [erro, setErro] = useState('');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newUser, setNewUser] = useState({ nome: '', email: '', senha: '', role: 'lojista' });

    useEffect(() => { carregarDados(); }, []);

    const carregarDados = async () => {
        try {
            setLoading(true);
            const data = await apiService.getAllUsers();
            setUsuarios(Array.isArray(data) ? data : []);
        } catch (err) { setErro('Erro ao carregar utilizadores.'); } finally { setLoading(false); }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await apiService.register(newUser);
            alert(`Utilizador criado!`);
            setNewUser({ nome: '', email: '', senha: '', role: 'lojista' });
            setShowForm(false);
            carregarDados();
        } catch (err) { alert("Erro ao criar (Email duplicado?)."); }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Tem a certeza?")) {
            try {
                await apiService.deleteUser(id);
                setUsuarios(usuarios.filter(u => (u.idUser || u.id) !== id));
            } catch (err) { alert("Erro ao eliminar."); }
        }
    };

    const getRoleColor = (role) => {
        switch(role) {
            case 'admin': return '#8e44ad';
            case 'lojista': return '#e67e22';
            default: return '#27ae60';
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Painel Administrativo</h1>
                    <p>Gestão de Lojistas e Utilizadores</p>
                </div>
                <button onClick={onLogout} className="btnPrimary" style={{background:'var(--danger)', width:'auto'}}>
                    Sair
                </button>
            </header>

            {erro && <p style={{color:'red'}}>{erro}</p>}

            {/* STATS */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3>Total Contas</h3>
                    <p className={styles.statNumber}>{usuarios.length}</p>
                </div>
                <div className={styles.statCard} style={{borderLeft:'5px solid #e67e22'}}>
                    <h3>Lojistas</h3>
                    <p className={styles.statNumber}>{usuarios.filter(u => u.role === 'lojista').length}</p>
                </div>
                <div className={styles.statCard} style={{borderLeft:'5px solid #27ae60'}}>
                    <h3>Clientes</h3>
                    <p className={styles.statNumber}>{usuarios.filter(u => (!u.role || u.role === 'user')).length}</p>
                </div>
            </div>

            {/* BOTÃO CRIAR */}
            <div className={styles.createSection}>
                <button onClick={() => setShowForm(!showForm)} className="btnPrimary" style={{background:'#3498db'}}>
                    {showForm ? 'Cancelar' : '+ Criar Novo Utilizador'}
                </button>

                {showForm && (
                    <form onSubmit={handleCreateUser} className={styles.formCard}>
                        <h3>Adicionar Novo Membro</h3>
                        <div className={styles.formGrid}>
                            <input className="inputGlobal" required placeholder="Nome" value={newUser.nome} onChange={e => setNewUser({...newUser, nome: e.target.value})} />
                            <input className="inputGlobal" required type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                            <input className="inputGlobal" required type="password" placeholder="Senha" value={newUser.senha} onChange={e => setNewUser({...newUser, senha: e.target.value})} />
                            <select className="inputGlobal" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                                <option value="lojista">🛒 Lojista</option>
                                <option value="admin">🔒 Administrador</option>
                                <option value="user">👤 Cliente</option>
                            </select>
                        </div>
                        <button type="submit" className="btnPrimary" style={{background:'#27ae60'}}>Confirmar</button>
                    </form>
                )}
            </div>

            {/* TABELA */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.th}>ID</th>
                            <th className={styles.th}>Nome</th>
                            <th className={styles.th}>Email</th>
                            <th className={styles.th}>Cargo</th>
                            <th className={styles.th}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map((u) => (
                            <tr key={u.idUser || u.id}>
                                <td className={styles.td}>#{u.idUser || u.id}</td>
                                <td className={styles.td}>{u.nome}</td>
                                <td className={styles.td}>{u.email}</td>
                                <td className={styles.td}>
                                    <span className={styles.badge} style={{backgroundColor: getRoleColor(u.role)}}>
                                        {u.role ? u.role.toUpperCase() : 'USER'}
                                    </span>
                                </td>
                                <td className={styles.td}>
                                    <button onClick={() => handleDelete(u.idUser || u.id)} className={styles.btnDelete}>
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default Admin;