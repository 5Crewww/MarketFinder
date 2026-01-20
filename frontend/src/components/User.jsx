import React, { useState, useEffect } from 'react';
import { apiService } from '../Services/api';

// --- ESTILOS (Definidos no topo para evitar erros) ---
const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
        paddingBottom: '20px',
        borderBottom: '1px solid #eee',
    },
    welcomeTitle: {
        margin: 0,
        color: '#2c3e50',
        fontSize: '1.8rem',
    },
    subtitle: {
        margin: '5px 0 0 0',
        color: '#7f8c8d',
    },
    logoutButton: {
        padding: '8px 16px',
        backgroundColor: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
    searchSection: {
        textAlign: 'center',
        marginBottom: '40px',
    },
    searchForm: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        marginBottom: '10px',
    },
    searchInput: {
        padding: '12px 20px',
        width: '100%',
        maxWidth: '400px',
        borderRadius: '30px',
        border: '1px solid #ddd',
        fontSize: '1rem',
        outline: 'none',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    },
    searchButton: {
        padding: '10px 25px',
        backgroundColor: '#27ae60',
        color: 'white',
        border: 'none',
        borderRadius: '30px',
        cursor: 'pointer',
        fontSize: '1rem',
        transition: 'background 0.2s',
    },
    clearButton: {
        background: 'none',
        border: 'none',
        color: '#3498db',
        cursor: 'pointer',
        textDecoration: 'underline',
        fontSize: '0.9rem',
    },
    resultsSection: {
        minHeight: '300px',
    },
    loading: {
        textAlign: 'center',
        color: '#666',
        fontSize: '1.2rem',
        marginTop: '50px',
    },
    error: {
        textAlign: 'center',
        color: '#e74c3c',
        background: '#fdeaea',
        padding: '15px',
        borderRadius: '8px',
    },
    empty: {
        textAlign: 'center',
        color: '#95a5a6',
        marginTop: '40px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '25px',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        border: '1px solid #f1f1f1',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'start',
        marginBottom: '10px',
    },
    productName: {
        margin: 0,
        color: '#34495e',
        fontSize: '1.2rem',
    },
    priceTag: {
        backgroundColor: '#eafaf1',
        color: '#27ae60',
        padding: '5px 10px',
        borderRadius: '15px',
        fontWeight: 'bold',
        fontSize: '1rem',
    },
    productDesc: {
        color: '#7f8c8d',
        fontSize: '0.95rem',
        lineHeight: '1.5',
        flexGrow: 1,
        marginBottom: '20px',
    },
    cardFooter: {
        marginTop: 'auto',
    },
    locationButton: {
        width: '100%',
        padding: '10px',
        backgroundColor: '#3498db',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '500',
    },
};


const User = ({ user, onLogout }) => {
    const [produtos, setProdutos] = useState([]);
    const [termoPesquisa, setTermoPesquisa] = useState('');
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    
    useEffect(() => {
        buscarProdutos();
    }, []);

    const buscarProdutos = async (termo = '') => {
        setLoading(true);
        setErro('');
        try {
            const dados = await apiService.getProducts(termo);
            if (Array.isArray(dados)) {
                setProdutos(dados);
            } else {
                setProdutos([]);
            }
        } catch (err) {
            console.error("Erro ao buscar produtos:", err);
            setErro('Não foi possível carregar os produtos. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitPesquisa = (e) => {
        e.preventDefault();
        buscarProdutos(termoPesquisa);
    };

    return (
        <div style={styles.container}>
            {/* --- HEADER --- */}
            <header style={styles.header}>
                <div>
                    <h1 style={styles.welcomeTitle}>Olá, {user.nome}! 👋</h1>
                    <p style={styles.subtitle}>Bem-vindo ao MarketFinder</p>
                </div>
                <button onClick={onLogout} style={styles.logoutButton}>
                    Sair
                </button>
            </header>

            {/* --- BARRA DE PESQUISA --- */}
            <section style={styles.searchSection}>
                <form onSubmit={handleSubmitPesquisa} style={styles.searchForm}>
                    <input
                        type="text"
                        placeholder="O que procura hoje? (ex: Arroz, Leite...)"
                        value={termoPesquisa}
                        onChange={(e) => setTermoPesquisa(e.target.value)}
                        style={styles.searchInput}
                    />
                    <button type="submit" style={styles.searchButton}>
                        🔍 Procurar
                    </button>
                </form>
            
                {termoPesquisa && (
                    <button 
                        onClick={() => { setTermoPesquisa(''); buscarProdutos(''); }} 
                        style={styles.clearButton}
                    >
                        Ver Todos
                    </button>
                )}
            </section>

            {/* --- RESULTADOS --- */}
            <section style={styles.resultsSection}>
                {loading ? (
                    <div style={styles.loading}>A carregar catálogo...</div>
                ) : erro ? (
                    <div style={styles.error}>{erro}</div>
                ) : produtos.length === 0 ? (
                    <div style={styles.empty}>
                        <p>Nenhum produto encontrado com esse nome.</p>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {produtos.map((prod) => (
                            <div key={prod.id || prod.idProduto} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <h3 style={styles.productName}>{prod.nome}</h3>
                                    <span style={styles.priceTag}>{prod.preco} €</span>
                                </div>
                                <p style={styles.productDesc}>
                                    {prod.descricao || 'Sem descrição disponível.'}
                                </p>
                                <div style={styles.cardFooter}>
                                    <button style={styles.locationButton}>
                                        📍 Ver no Mapa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default User;