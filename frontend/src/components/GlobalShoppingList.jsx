import React from 'react';
import { useGlobalShoppingList } from '../hooks/useGlobalShoppingList';
import styles from './GlobalShoppingList.module.css';

/**
 * Painel "bloco de notas" para a lista de compras global.
 * Um item por linha — Enter separa itens.
 * Deve ser renderizado na página de seleção de lojas (antes de entrar).
 */
const GlobalShoppingList = () => {
    const { rawText, setRawText, parsedItems } = useGlobalShoppingList();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3 className={styles.title}>📝 A minha lista de compras</h3>
                    <p className={styles.subtitle}>
                        Escreva um produto por linha. Prima <kbd className={styles.kbd}>Enter</kbd> para passar ao próximo.
                        A lista é guardada automaticamente.
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
                rows={8}
                spellCheck
                aria-label="Lista de compras — um item por linha"
            />

            {parsedItems.length > 0 && (
                <p className={styles.hint}>
                    ✅ A sua lista está guardada. Quando entrar numa loja, use <strong>"Filtrar pela minha Lista"</strong> para encontrar estes produtos.
                </p>
            )}
        </div>
    );
};

export default GlobalShoppingList;
