import React from 'react';
import ShoppingListPlanner from './ShoppingListPlanner';

const ShoppingList = ({ storeId, storeName, layoutImageUrl }) => {
    const title = storeName
        ? `Lista de Compras • ${storeName}`
        : 'Lista de Compras Inteligente';

    return (
        <ShoppingListPlanner
            storeId={storeId}
            layoutImageUrl={layoutImageUrl}
            title={title}
        />
    );
};

export default ShoppingList;
