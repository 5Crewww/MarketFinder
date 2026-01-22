import React, { useState, useEffect } from 'react';
import { apiService } from '../Services/api';
import styles from './User.module.css'; // <--- IMPORTAR MÓDULO

const User = ({ user, onLogout }) => {
    const [produtos, setProdutos] = useState([]);
    const [termoPesquisa, setTermoPesquisa] = useState('');
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    useEffect(() => { buscarProdutos(); }, []);

    const buscarProdutos = async (termo = '') => {
        setLoading(true); setErro('');
        try {
            const dados = await apiService.getProducts(termo);
            setProdutos(Array.isArray(dados) ? dados : []);
        } catch (err) { setErro('Erro ao buscar produtos.'); } finally { setLoading(false); }
    };

    const handleSubmitPesquisa = (e) => {
        e.preventDefault();
        buscarProdutos(termoPesquisa);
    };

    return (
        <div className={styles.container}>
            {/* HEADER */}
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Olá, {user.nome}! 👋</h1>
                    <p>Bem-vindo ao MarketFinder</p>
                </div>
                <button onClick={onLogout} className="btnPrimary" style={{background:'var(--danger)', width:'auto'}}>
                    Sair
                </button>
            </header>

            {/* PESQUISA */}
            <section className={styles.searchSection}>
                <form onSubmit={handleSubmitPesquisa} className={styles.searchForm}>
                    <input
                        className={styles.searchInput}
                        type="text"
                        placeholder="O que procura hoje? (ex: Arroz...)"
                        value={termoPesquisa}
                        onChange={(e) => setTermoPesquisa(e.target.value)}
                    />
                    <button type="submit" className={`btnPrimary ${styles.btnSearch}`}>
                        🔍
                    </button>
                </form>
                {termoPesquisa && (
                    <button onClick={() => { setTermoPesquisa(''); buscarProdutos(''); }} style={{background:'none', border:'none', color:'var(--primary)', marginTop:'10px', cursor:'pointer', textDecoration:'underline'}}>
                        Ver Todos
                    </button>
                )}
            </section>

            {/* RESULTADOS */}
            {loading ? (
                <p className={styles.empty}>A carregar catálogo...</p>
            ) : erro ? (
                <p className={styles.empty}>{erro}</p>
            ) : produtos.length === 0 ? (
                <div className={styles.empty}>
                    <p>Nenhum produto encontrado.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {produtos.map((prod) => (
                        <div key={prod.id || prod.idProduto} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.productName}>{prod.nome}</h3>
                                <span className={styles.priceTag}>{prod.preco} €</span>
                            </div>
                            <p className={styles.productDesc}>
                                {prod.descricao || 'Sem descrição disponível.'}
                            </p>
                            <div className={styles.cardFooter}>
                                <button className={styles.locationButton}>
                                    📍 Ver no Mapa
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
export default User;