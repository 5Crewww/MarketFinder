import React from 'react';
import { getStoreLogoUrl } from '../Services/api';
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

        <p className={styles.storesSectionLabel}>Lojas disponíveis</p>

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
                        <div className={styles.logoWrapper}>
                            {store.hasLogo ? (
                                <img
                                    src={getStoreLogoUrl(store.id)}
                                    alt={`Logótipo de ${store.name}`}
                                    className={styles.storeLogo}
                                />
                            ) : (
                                <div className={styles.logoPlaceholder} aria-label="Sem logótipo">
                                    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.logoPlaceholderIcon}>
                                        <rect width="48" height="48" rx="12" fill="currentColor" opacity="0.08"/>
                                        <path d="M14 34L20 26l5 6 4-5 5 7H14z" fill="currentColor" opacity="0.4"/>
                                        <circle cx="30" cy="20" r="4" fill="currentColor" opacity="0.4"/>
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className={styles.storeHeader}>
                            <h2>{store.name}</h2>
                        </div>
                        {store.location && (
                            <p className={styles.storeLocation}>
                                📍 {store.location}
                            </p>
                        )}
                        <span className={styles.cta}>Entrar na loja</span>
                    </button>
                ))}
            </div>
        )}
    </div>
);

export default ClientStoreSelector;
