import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '../Services/api';
import { useDebounce } from '../hooks/useDebounce';
import styles from './ProductSearchList.module.css';

const DEFAULT_FILTERS = Object.freeze({
    categoria: '',
    precoMin: '',
    precoMax: '',
    inStock: true,
});

const INITIAL_PAGINATION = Object.freeze({
    page: 0,
    totalPages: 0,
    hasNext: false,
    totalElements: 0,
});

const resolveApiMethods = (mode) => {
    if (mode === 'manager') {
        return {
            getProducts: apiService.getProducts,
            getCategories: apiService.getProductCategories,
        };
    }

    return {
        getProducts: apiService.getPublicProducts,
        getCategories: apiService.getPublicProductCategories,
    };
};

const formatPrice = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const renderSkeletonCards = (count = 6) => {
    return Array.from({ length: count }, (_, index) => (
        <div
            key={`catalog-skeleton-${index}`}
            className={`${styles.card} ${styles.skeletonCard}`}
            aria-hidden="true"
        >
            <div className={`${styles.skeletonBar} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonBar} ${styles.skeletonText}`} />
            <div className={`${styles.skeletonBar} ${styles.skeletonTextShort}`} />
            <div className={styles.skeletonAction} />
        </div>
    ));
};

const ProductSearchList = ({
    storeId,
    mode = 'public',
    title = 'Catalogo paginado',
    pageSize = 12,
    searchPlaceholder = 'Pesquisar produto por nome...',
    emptyMessage = 'Nao foram encontrados produtos.',
    actionLabel = 'Ver detalhe',
    onProductSelect,
    onPageDataChange,
}) => {
    const [query, setQuery] = useState({
        searchTerm: '',
        page: 0,
        filters: { ...DEFAULT_FILTERS },
    });
    const [catalogState, setCatalogState] = useState({
        items: [],
        categories: [],
        loading: false,
        loadingCategories: false,
        error: '',
        pagination: { ...INITIAL_PAGINATION },
    });

    const debouncedSearchTerm = useDebounce(query.searchTerm, 400);
    const requestIdRef = useRef(0);
    const { getProducts, getCategories } = useMemo(() => resolveApiMethods(mode), [mode]);

    useEffect(() => {
        setQuery({
            searchTerm: '',
            page: 0,
            filters: { ...DEFAULT_FILTERS },
        });
        setCatalogState((prev) => ({
            ...prev,
            items: [],
            categories: [],
            error: '',
            pagination: { ...INITIAL_PAGINATION },
        }));
    }, [storeId]);

    useEffect(() => {
        if (!storeId) {
            return;
        }

        let active = true;
        setCatalogState((prev) => ({
            ...prev,
            loadingCategories: true,
        }));

        getCategories(storeId)
            .then((response) => {
                if (!active) {
                    return;
                }

                const categories = Array.isArray(response) ? response : [];
                setCatalogState((prev) => ({
                    ...prev,
                    categories,
                    loadingCategories: false,
                }));
            })
            .catch(() => {
                if (!active) {
                    return;
                }

                setCatalogState((prev) => ({
                    ...prev,
                    categories: [],
                    loadingCategories: false,
                }));
            });

        return () => {
            active = false;
        };
    }, [getCategories, storeId]);

    useEffect(() => {
        if (!storeId) {
            return;
        }

        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        setCatalogState((prev) => ({
            ...prev,
            loading: true,
            error: '',
        }));

        getProducts({
            storeId,
            nome: debouncedSearchTerm.trim() || undefined,
            categoria: query.filters.categoria || undefined,
            precoMin: query.filters.precoMin || undefined,
            precoMax: query.filters.precoMax || undefined,
            inStock: query.filters.inStock ? true : undefined,
            page: query.page,
            size: pageSize,
        })
            .then((response) => {
                if (requestId !== requestIdRef.current) {
                    return;
                }

                const items = Array.isArray(response?.content) ? response.content : [];
                const pagination = {
                    page: response?.page ?? 0,
                    totalPages: response?.totalPages ?? 0,
                    hasNext: Boolean(response?.hasNext),
                    totalElements: response?.totalElements ?? 0,
                };

                setCatalogState((prev) => ({
                    ...prev,
                    items,
                    loading: false,
                    error: '',
                    pagination,
                }));

                if (typeof onPageDataChange === 'function') {
                    onPageDataChange({
                        items,
                        pagination,
                    });
                }
            })
            .catch((error) => {
                if (requestId !== requestIdRef.current) {
                    return;
                }

                setCatalogState((prev) => ({
                    ...prev,
                    items: [],
                    loading: false,
                    error: typeof error === 'string' ? error : 'Nao foi possivel carregar o catalogo.',
                    pagination: { ...INITIAL_PAGINATION },
                }));
            });
    }, [
        debouncedSearchTerm,
        getProducts,
        onPageDataChange,
        pageSize,
        query.filters.categoria,
        query.filters.inStock,
        query.filters.precoMax,
        query.filters.precoMin,
        query.page,
        storeId,
    ]);

    const summaryLabel = useMemo(() => {
        const total = catalogState.pagination.totalElements;
        if (!total) {
            return 'Sem resultados para os filtros atuais.';
        }
        return `${total} produto(s) encontrados.`;
    }, [catalogState.pagination.totalElements]);

    const handleSearchChange = (event) => {
        const nextValue = event.target.value;
        setQuery((prev) => ({
            ...prev,
            searchTerm: nextValue,
            page: 0,
        }));
    };

    const handleFilterChange = (field, value) => {
        setQuery((prev) => ({
            ...prev,
            page: 0,
            filters: {
                ...prev.filters,
                [field]: value,
            },
        }));
    };

    const handleResetFilters = () => {
        setQuery({
            searchTerm: '',
            page: 0,
            filters: { ...DEFAULT_FILTERS },
        });
    };

    const handleChangePage = (nextPage) => {
        setQuery((prev) => ({
            ...prev,
            page: nextPage,
        }));
    };

    if (!storeId) {
        return (
            <section className={styles.searchSection}>
                <div className={styles.empty}>
                    Selecione primeiro uma loja para carregar o catalogo.
                </div>
            </section>
        );
    }n

    return (
        <section className={styles.searchSection}>
            <div className={styles.activeStoreCard}>
                <div>
                    <p className={styles.activeStoreLabel}>{title}</p>
                    <strong>{summaryLabel}</strong>
                </div>
                <span className={styles.activeStoreMeta}>
                    Pagina {catalogState.pagination.page + 1} de {Math.max(catalogState.pagination.totalPages, 1)}
                </span>
            </div>

            <div className={styles.filterGrid}>
                <input
                    className={styles.searchInput}
                    type="text"
                    value={query.searchTerm}
                    onChange={handleSearchChange}
                    placeholder={searchPlaceholder}
                />

                <select
                    className={styles.searchInput}
                    value={query.filters.categoria}
                    onChange={(event) => handleFilterChange('categoria', event.target.value)}
                    disabled={catalogState.loadingCategories}
                >
                    <option value="">
                        {catalogState.loadingCategories ? 'A carregar categorias...' : 'Todas as categorias'}
                    </option>
                    {catalogState.categories.map((categoria) => (
                        <option key={categoria} value={categoria}>
                            {categoria}
                        </option>
                    ))}
                </select>

                <input
                    className={styles.searchInput}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Preco minimo"
                    value={query.filters.precoMin}
                    onChange={(event) => handleFilterChange('precoMin', event.target.value)}
                />

                <input
                    className={styles.searchInput}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Preco maximo"
                    value={query.filters.precoMax}
                    onChange={(event) => handleFilterChange('precoMax', event.target.value)}
                />
            </div>

            <div className={styles.searchForm}>
                <label className={styles.stockToggle}>
                    <input
                        type="checkbox"
                        checked={query.filters.inStock}
                        onChange={(event) => handleFilterChange('inStock', event.target.checked)}
                    />
                    Apenas em stock
                </label>
                <button type="button" className={styles.linkButton} onClick={handleResetFilters}>
                    Limpar filtros
                </button>
            </div>

            {catalogState.loading ? (
                <div className={styles.grid}>{renderSkeletonCards(6)}</div>
            ) : catalogState.error ? (
                <div className={styles.empty}>{catalogState.error}</div>
            ) : catalogState.items.length === 0 ? (
                <div className={styles.empty}>{emptyMessage}</div>
            ) : (
                <>
                    <div className={styles.grid}>
                        {catalogState.items.map((product) => (
                            <article key={product.id} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.productName}>{product.nome}</h3>
                                    <span className={styles.priceTag}>{formatPrice(product.preco)} €</span>
                                </div>

                                <p className={styles.productDesc}>
                                    {product.descricao || 'Sem descricao disponível.'}
                                </p>

                                <div className={styles.metaList}>
                                    <span>{product.categoria || 'Sem categoria'}</span>
                                    <span>Marca: {product.marca || 'Sem marca'}</span>
                                    <span>Stock: {product.stock ?? 0}</span>
                                    <span>{product.nomeCorredor || 'Sem corredor'} • {product.nomePrateleira || 'Sem prateleira'}</span>
                                </div>

                                {typeof onProductSelect === 'function' && (
                                    <div className={styles.cardFooter}>
                                        <button
                                            type="button"
                                            className={styles.locationButton}
                                            onClick={() => onProductSelect(product)}
                                        >
                                            {actionLabel}
                                        </button>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>

                    <div className={styles.pagination}>
                        <button
                            type="button"
                            className={styles.pageButton}
                            disabled={catalogState.loading || query.page === 0}
                            onClick={() => handleChangePage(query.page - 1)}
                        >
                            Anterior
                        </button>
                        <span>
                            Pagina {catalogState.pagination.page + 1} de {Math.max(catalogState.pagination.totalPages, 1)}
                        </span>
                        <button
                            type="button"
                            className={styles.pageButton}
                            disabled={catalogState.loading || !catalogState.pagination.hasNext}
                            onClick={() => handleChangePage(query.page + 1)}
                        >
                            Proxima
                        </button>
                    </div>
                </>
            )}
        </section>
    );
};

export default ProductSearchList;
