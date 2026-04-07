import React, { createContext, useContext, useEffect, useState } from 'react';

const StoreSelectionContext = createContext(null);

const buildStorageKey = (user) => `selectedClientStore:${user?.idUser ?? 'anonymous'}`;

const sanitizeStoreSelection = (store) => {
    if (!store?.id) {
        return null;
    }

    return {
        id: Number(store.id),
        name: store.name || '',
        layoutImageUrl: store.layoutImageUrl || null,
        layoutConfigured: Boolean(store.layoutConfigured ?? store.layoutImageUrl),
        version: store.version ?? null,
        memberCount: typeof store.memberCount === 'number' ? store.memberCount : 0,
    };
};

const readStoredSelection = (user) => {
    if (!user || user.role !== 'user') {
        return null;
    }

    const storageKey = buildStorageKey(user);
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) {
        return null;
    }

    try {
        return sanitizeStoreSelection(JSON.parse(rawValue));
    } catch (error) {
        localStorage.removeItem(storageKey);
        return null;
    }
};

export const StoreSelectionProvider = ({ user, children }) => {
    const [selectedStore, setSelectedStore] = useState(() => readStoredSelection(user));

    useEffect(() => {
        setSelectedStore(readStoredSelection(user));
    }, [user]);

    const selectStore = (store) => {
        if (!user || user.role !== 'user') {
            return;
        }

        const storageKey = buildStorageKey(user);
        const sanitizedStore = sanitizeStoreSelection(store);

        if (!sanitizedStore) {
            localStorage.removeItem(storageKey);
            setSelectedStore(null);
            return;
        }

        localStorage.setItem(storageKey, JSON.stringify(sanitizedStore));
        setSelectedStore(sanitizedStore);
    };

    const clearStoreSelection = () => {
        if (user) {
            localStorage.removeItem(buildStorageKey(user));
        }
        setSelectedStore(null);
    };

    return (
        <StoreSelectionContext.Provider
            value={{
                selectedStore,
                selectedStoreId: selectedStore?.id ? String(selectedStore.id) : '',
                selectStore,
                clearStoreSelection,
            }}
        >
            {children}
        </StoreSelectionContext.Provider>
    );
};

export const useStoreSelection = () => {
    const context = useContext(StoreSelectionContext);
    if (!context) {
        throw new Error('useStoreSelection must be used inside StoreSelectionProvider.');
    }
    return context;
};
