import React from 'react';
import { useGlobalShoppingList } from '../hooks/useGlobalShoppingList';
import styles from './MinhaLista.module.css';

const MinhaLista = () => {
    const { rawText, setRawText, parsedItems } = useGlobalShoppingList();

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>📝 A Minha Lista de Compras</h1>
                        <p className={styles.subtitle}>
                            Escreva um produto por linha. Prima <kbd className={styles.kbd}>Enter</kbd> para passar ao próximo.
                            A lista é guardada automaticamente no seu dispositivo.
                        </p>
                    </div>
                    {parsedItems.length > 0 && (
                        <span className={styles.badge}>{parsedItems.length} item(ns)</span>
                    )}
                </div>

                <textarea
                    className={styles.textarea}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={'arroz\nleite\nmassa\ndetergente\n...'}
                    rows={12}
                    spellCheck
                    aria-label="Lista de compras — um item por linha"
                />

                {parsedItems.length > 0 && (
                    <div className={styles.hintBox}>
                        <h3>✅ Lista guardada com sucesso!</h3>
                        <p>
                            Vá ao separador <strong>"As Minhas Lojas"</strong>, escolha um supermercado e use o botão <strong>"Filtrar pela minha Lista"</strong> para descobrir os produtos e prateleiras.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MinhaLista;
