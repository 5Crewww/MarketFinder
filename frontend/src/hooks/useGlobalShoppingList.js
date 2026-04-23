import { useCallback, useMemo, useState } from 'react';

const STORAGE_KEY = 'global_shopping_list';

/**
 * Hook de lista de compras global — modelo "bloco de notas".
 *
 * Armazena uma string de texto bruto em localStorage (um item por linha).
 * Expõe rawText para o <textarea> e parsedItems (string[]) para a API.
 */
export function useGlobalShoppingList() {
    const [rawText, setRawTextState] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) || '';
        } catch {
            return '';
        }
    });

    const setRawText = useCallback((text) => {
        setRawTextState(text);
        try {
            localStorage.setItem(STORAGE_KEY, typeof text === 'string' ? text : '');
        } catch {
            // Ignora erros de quota
        }
    }, []);

    // Divide por linha, limpa espaços, remove vazios, limita a 50 itens
    const parsedItems = useMemo(
        () =>
            rawText
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .slice(0, 50),
        [rawText]
    );

    return { rawText, setRawText, parsedItems };
}
