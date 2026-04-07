import React from 'react';
import styles from './ClientStoreSelector.module.css';

const ClientStoreSelector = ({ stores, loading, error, onSelectStore, onRetry, onLogout }) => (
    <div className={styles.page}>
        <div className={styles.hero}>
            <div>
                <p className={styles.eyebrow}>Perfil Cliente</p>
                <h1 className={styles.title}>Escolha a loja antes de entrar no mapa.</h1>
                <p className={styles.subtitle}>
                    O catalogo, os pins e o layout sao carregados com base na loja definida pelo lojista.
                </p>
            </div>
            <button type="button" onClick={onLogout} className={styles.logoutButton}>
                Sair
            </button>
        </div>

        {loading ? (
            <div className={styles.emptyState}>A carregar lojas disponíveis...</div>
        ) : error ? (
            <div className={styles.emptyState}>
                <p>{error}</p>
                <button type="button" className={styles.primaryButton} onClick={onRetry}>
                    Tentar novamente
                </button>
            </div>
        ) : stores.length === 0 ? (
            <div className={styles.emptyState}>
                <p>Nao existem lojas configuradas no sistema.</p>
            </div>
        ) : (
            <div className={styles.grid}>
                {stores.map((store) => (
                    <button
                        key={store.id}
                        type="button"
                        className={styles.storeCard}
                        onClick={() => onSelectStore(store)}
                    >
                        <div className={styles.storeHeader}>
                            <h2>{store.name}</h2>
                            <span className={`${styles.badge} ${store.layoutConfigured ? styles.badgeSuccess : styles.badgeNeutral}`}>
                                {store.layoutConfigured ? 'Mapa pronto' : 'Sem mapa'}
                            </span>
                        </div>
                        <p className={styles.metaLine}>
                            {store.memberCount || 0} utilizador(es) associado(s)
                        </p>
                        <p className={styles.description}>
                            Entrar nesta loja desbloqueia o catalogo, a pesquisa e a localizacao dos produtos.
                        </p>
                        <span className={styles.cta}>Entrar na loja</span>
                    </button>
                ))}
            </div>
        )}
    </div>
);

export default ClientStoreSelector;
