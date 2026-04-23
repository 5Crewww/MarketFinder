import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '../Services/api';
import { useDebounce } from '../hooks/useDebounce';
import { useGlobalShoppingList } from '../hooks/useGlobalShoppingList';
import styles from './ShoppingListPlanner.module.css';

const resolveCorridorOrder = (product) => {
    if (Number.isFinite(Number(product?.idCorredor))) {
        return Number(product.idCorredor);
    }

    const corridorLabel = product?.nomeCorredor || '';
    const numberMatch = corridorLabel.match(/\d+/);
    return numberMatch ? Number(numberMatch[0]) : Number.MAX_SAFE_INTEGER;
};

const formatPrice = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const getProductKey = (product) => String(product?.id ?? `${product?.nome}-${product?.idPrateleira ?? 'sem-prateleira'}`);

const ShoppingListPlanner = ({
    storeId,
    layoutImageUrl = null,
    pageSize = 8,
    title = 'Lista de Compras Inteligente',
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [shoppingList, setShoppingList] = useState([]);
    const [isStoreViewOpen, setIsStoreViewOpen] = useState(false);
    const [activePreviewProductId, setActivePreviewProductId] = useState(null);
    const [suggestionState, setSuggestionState] = useState({
        items: [],
        loading: false,
        error: '',
    });
    const [matchState, setMatchState] = useState({
        results: [],   // ProdutosResponse[] devolvidos pelo backend
        loading: false,
        error: '',
        active: false, // true quando o filtro da lista global esta ativo
    });

    const { items: globalList } = useGlobalShoppingList();

    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const requestIdRef = useRef(0);
    // Ref que acompanha sempre o storeId atual sem ser dependência do effect de gravação,
    // evitando que uma mudança de loja grave a lista antiga na chave da nova loja.
    const storeIdRef = useRef(storeId);

    useEffect(() => {
        storeIdRef.current = storeId;
    }, [storeId]);

    useEffect(() => {
        setSearchTerm('');
        setShoppingList([]);
        setIsStoreViewOpen(false);
        setActivePreviewProductId(null);
        setMatchState({ results: [], loading: false, error: '', active: false });
        setSuggestionState({
            items: [],
            loading: false,
            error: '',
        });
    }, [storeId]);

    // Carrega a lista guardada sempre que a loja muda.
    // Corre após o effect de reset, por isso o setShoppingList(savedList) vence o setShoppingList([]).
    useEffect(() => {
        if (!storeId) return;
        try {
            const raw = localStorage.getItem(`shopping_list_${storeId}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setShoppingList(parsed);
                }
            }
        } catch {
            // Ignora erros de parse silenciosamente
        }
    }, [storeId]);

    // Persiste a lista sempre que muda, usando o ref para escrever sempre na chave correta.
    useEffect(() => {
        if (!storeIdRef.current) return;
        try {
            localStorage.setItem(
                `shopping_list_${storeIdRef.current}`,
                JSON.stringify(shoppingList)
            );
        } catch {
            // Ignora erros de quota silenciosamente
        }
    }, [shoppingList]);

    useEffect(() => {
        if (!storeId || debouncedSearchTerm.trim().length < 2) {
            setSuggestionState((prev) => ({
                ...prev,
                items: [],
                loading: false,
                error: '',
            }));
            return;
        }

        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        setSuggestionState((prev) => ({
            ...prev,
            loading: true,
            error: '',
        }));

        apiService.getPublicProducts({
            storeId,
            nome: debouncedSearchTerm.trim(),
            inStock: true,
            page: 0,
            size: pageSize,
        })
            .then((response) => {
                if (requestId !== requestIdRef.current) {
                    return;
                }

                const items = Array.isArray(response?.content) ? response.content : [];
                setSuggestionState({
                    items,
                    loading: false,
                    error: '',
                });
            })
            .catch((error) => {
                console.error('Shopping list suggestion error:', error);
                if (requestId !== requestIdRef.current) {
                    return;
                }

                setSuggestionState({
                    items: [],
                    loading: false,
                    error: typeof error === 'string' ? error : 'Nao foi possivel sugerir produtos.',
                });
            });
    }, [debouncedSearchTerm, pageSize, storeId]);

    const shoppingListKeys = useMemo(() => {
        return new Set(shoppingList.map((product) => getProductKey(product)));
    }, [shoppingList]);

    const suggestionItems = useMemo(() => {
        return suggestionState.items.filter((product) => !shoppingListKeys.has(getProductKey(product)));
    }, [shoppingListKeys, suggestionState.items]);

    const groupedRoute = useMemo(() => {
        const corridorMap = new Map();

        shoppingList.forEach((product) => {
            const corridorKey = String(product?.idCorredor ?? `sem-corredor-${getProductKey(product)}`);

            if (!corridorMap.has(corridorKey)) {
                corridorMap.set(corridorKey, {
                    corridorKey,
                    corridorId: product?.idCorredor ?? null,
                    corridorName: product?.nomeCorredor || 'Sem corredor',
                    corridorOrder: resolveCorridorOrder(product),
                    items: [],
                });
            }

            corridorMap.get(corridorKey).items.push(product);
        });

        return Array.from(corridorMap.values())
            .sort((left, right) => {
                if (left.corridorOrder !== right.corridorOrder) {
                    return left.corridorOrder - right.corridorOrder;
                }

                return left.corridorName.localeCompare(right.corridorName, 'pt', {
                    sensitivity: 'base',
                });
            })
            .map((group) => ({
                ...group,
                items: [...group.items].sort((left, right) =>
                    left.nome.localeCompare(right.nome, 'pt', { sensitivity: 'base' })
                ),
            }));
    }, [shoppingList]);

    const routeProducts = useMemo(() => {
        return groupedRoute.flatMap((group) => group.items);
    }, [groupedRoute]);

    const activePreviewProduct = useMemo(() => {
        if (!routeProducts.length) {
            return null;
        }

        return routeProducts.find((product) => getProductKey(product) === activePreviewProductId) || routeProducts[0];
    }, [activePreviewProductId, routeProducts]);

    const totalItems = useMemo(() => {
        return shoppingList.length;
    }, [shoppingList.length]);

    const addProductToShoppingList = (product) => {
        const productKey = getProductKey(product);

        setShoppingList((prev) => {
            if (prev.some((item) => getProductKey(item) === productKey)) {
                return prev;
            }

            return [...prev, product];
        });

        setSearchTerm('');
        setSuggestionState({
            items: [],
            loading: false,
            error: '',
        });
        setIsStoreViewOpen(true);
        setActivePreviewProductId(productKey);
    };

    const handleMatchList = async () => {
        if (!storeId || globalList.length === 0) return;

        setMatchState({ results: [], loading: true, error: '', active: false });

        try {
            const results = await apiService.matchList(storeId, globalList);
            setMatchState({
                results: Array.isArray(results) ? results : [],
                loading: false,
                error: '',
                active: true,
            });
        } catch (err) {
            setMatchState({
                results: [],
                loading: false,
                error: typeof err === 'string' ? err : 'Nao foi possivel filtrar os produtos.',
                active: false,
            });
        }
    };

    // Agrupa os resultados do match-list por corredor (mesmo algoritmo do groupedRoute)
    const matchGrouped = useMemo(() => {
        if (!matchState.active || matchState.results.length === 0) return [];

        const corridorMap = new Map();
        matchState.results.forEach((product) => {
            const corridorKey = String(product?.idCorredor ?? `sem-${getProductKey(product)}`);
            if (!corridorMap.has(corridorKey)) {
                corridorMap.set(corridorKey, {
                    corridorKey,
                    corridorName: product?.nomeCorredor || 'Sem corredor',
                    corridorOrder: resolveCorridorOrder(product),
                    items: [],
                });
            }
            corridorMap.get(corridorKey).items.push(product);
        });

        return Array.from(corridorMap.values())
            .sort((a, b) => {
                if (a.corridorOrder !== b.corridorOrder) return a.corridorOrder - b.corridorOrder;
                return a.corridorName.localeCompare(b.corridorName, 'pt', { sensitivity: 'base' });
            })
            .map((group) => ({
                ...group,
                items: [...group.items].sort((a, b) =>
                    a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' })
                ),
            }));
    }, [matchState.active, matchState.results]);

    // Para cada produto do match, encontra qual termo causou o match (para mostrar na UI)
    const resolveMatchTerm = (product) => {
        const nomeLower = (product?.nome || '').toLowerCase();
        const catLower = (product?.categoria || '').toLowerCase();
        return globalList.find(
            (t) => nomeLower.includes(t.toLowerCase()) || catLower.includes(t.toLowerCase())
        ) || '';
    };

    const removeProductFromShoppingList = (productKey) => {
        setShoppingList((prev) => prev.filter((product) => getProductKey(product) !== productKey));

        if (activePreviewProductId === productKey) {
            setActivePreviewProductId(null);
        }
    };

    if (!storeId) {
        return (
            <section className={styles.searchSection}>
                <div className={styles.empty}>
                    Escolha primeiro uma loja para construir a sua lista de compras.
                </div>
            </section>
        );
    }

    return (
        <section className={styles.searchSection}>
            <div className={styles.activeStoreCard}>
                <div>
                    <p className={styles.activeStoreLabel}>{title}</p>
                    <strong>{totalItems ? `${totalItems} item(ns) na rota atual` : 'Adicione produtos para planear a rota.'}</strong>
                </div>
                <div className={styles.headerActions}>
                    {globalList.length > 0 && (
                        <button
                            type="button"
                            className={styles.matchListButton}
                            onClick={handleMatchList}
                            disabled={matchState.loading}
                            title={`Filtrar por: ${globalList.join(', ')}`}
                        >
                            {matchState.loading
                                ? 'A procurar...'
                                : matchState.active
                                    ? `✓ Lista ativa (${matchState.results.length})`
                                    : `🔍 Filtrar pela minha Lista (${globalList.length})`}
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.pageButton}
                        onClick={() => setIsStoreViewOpen((prev) => !prev)}
                        disabled={shoppingList.length === 0}
                    >
                        {isStoreViewOpen ? 'Fechar visualizacao' : 'Entrar na visualizacao de loja'}
                    </button>
                </div>
            </div>

            {/* Resultados do match-list agrupados por corredor */}
            {matchState.active && (
                <div className={styles.matchResultsSection}>
                    <div className={styles.matchResultsHeader}>
                        <strong>Resultados para a sua lista</strong>
                        <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => setMatchState({ results: [], loading: false, error: '', active: false })}
                        >
                            Fechar filtro
                        </button>
                    </div>

                    {matchState.error && (
                        <div className={styles.empty}>{matchState.error}</div>
                    )}

                    {matchGrouped.length === 0 && !matchState.error && (
                        <div className={styles.empty}>
                            Nenhum produto encontrado para os itens da sua lista nesta loja.
                        </div>
                    )}

                    {matchGrouped.map((group) => (
                        <section key={group.corridorKey} className={styles.matchGroup}>
                            <div className={styles.routeHeader}>
                                <strong className={styles.routeTitle}>{group.corridorName}</strong>
                                <span className={styles.routeCount}>{group.items.length} produto(s)</span>
                            </div>
                            <div className={styles.routeItems}>
                                {group.items.map((product) => {
                                    const matchTerm = resolveMatchTerm(product);
                                    return (
                                        <div key={getProductKey(product)} className={styles.matchItem}>
                                            <span className={styles.routeItemInfo}>
                                                <strong className={styles.routeItemTitle}>{product.nome}</strong>
                                                <span className={styles.routeItemMeta}>
                                                    {product.nomePrateleira || 'Sem prateleira'}
                                                    {product.categoria && ` • ${product.categoria}`}
                                                </span>
                                            </span>
                                            <span className={styles.matchBadge}>
                                                match: "{matchTerm}"
                                            </span>
                                            <span className={styles.routeItemPrice}>
                                                {formatPrice(product.preco)} €
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            <div className={styles.searchArea}>
                <input
                    className={styles.searchInput}
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Escreva pelo menos 2 letras para receber sugestoes..."
                />

                {(searchTerm.trim().length >= 2 || suggestionState.loading || suggestionState.error) && (
                    <div className={styles.suggestionPanel}>
                        {suggestionState.loading ? (
                            <div className={styles.empty}>A procurar produtos...</div>
                        ) : suggestionState.error ? (
                            <div className={styles.empty}>{suggestionState.error}</div>
                        ) : suggestionItems.length === 0 ? (
                            <div className={styles.empty}>Nao foram encontrados produtos.</div>
                        ) : (
                            <div className={styles.suggestionList}>
                                {suggestionItems.map((product) => (
                                    <button
                                        key={getProductKey(product)}
                                        type="button"
                                        onClick={() => addProductToShoppingList(product)}
                                        className={styles.suggestionButton}
                                    >
                                        <span className={styles.suggestionInfo}>
                                            <strong className={styles.suggestionTitle}>{product.nome}</strong>
                                            <span className={styles.suggestionMeta}>
                                                {product.nomeCorredor || 'Sem corredor'} • {product.nomePrateleira || 'Sem prateleira'}
                                            </span>
                                        </span>
                                        <span className={styles.suggestionPrice}>
                                            {formatPrice(product.preco)} €
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {shoppingList.length === 0 ? (
                <div className={styles.empty}>
                    A lista ainda esta vazia. Use a pesquisa acima para adicionar os primeiros itens.
                </div>
            ) : (
                <div className={styles.plannerLayout}>
                    <aside className={styles.listSidebar}>
                        <h3 className={styles.sectionTitle}>Itens selecionados</h3>
                        {shoppingList.map((product) => {
                            const productKey = getProductKey(product);
                            const isActive = activePreviewProductId === productKey || (!activePreviewProductId && activePreviewProduct?.id === product.id);

                            return (
                                <div
                                    key={productKey}
                                    className={`${styles.selectedItemCard} ${isActive ? styles.selectedItemCardActive : ''}`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setActivePreviewProductId(productKey)}
                                        className={styles.selectedItemButton}
                                    >
                                        <strong className={styles.selectedItemTitle}>{product.nome}</strong>
                                        <span className={styles.selectedItemMeta}>
                                            {product.nomeCorredor || 'Sem corredor'} • {product.nomePrateleira || 'Sem prateleira'}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        className={styles.linkButton}
                                        onClick={() => removeProductFromShoppingList(productKey)}
                                    >
                                        Remover
                                    </button>
                                </div>
                            );
                        })}
                    </aside>

                    <div className={styles.routeColumn}>
                        {isStoreViewOpen ? (
                            <>
                                <div className={styles.routePanel}>
                                    <h3 className={styles.sectionTitle}>
                                        Rota logica por corredor
                                    </h3>

                                    {groupedRoute.map((group) => (
                                        <section key={group.corridorKey} className={styles.routeGroup}>
                                            <div className={styles.routeHeader}>
                                                <strong className={styles.routeTitle}>{group.corridorName}</strong>
                                                <span className={styles.routeCount}>
                                                    {group.items.length} item(ns)
                                                </span>
                                            </div>

                                            <div className={styles.routeItems}>
                                                {group.items.map((product) => {
                                                    const productKey = getProductKey(product);
                                                    const isActive = activePreviewProduct && getProductKey(activePreviewProduct) === productKey;

                                                    return (
                                                        <button
                                                            key={productKey}
                                                            type="button"
                                                            onClick={() => setActivePreviewProductId(productKey)}
                                                            className={`${styles.routeItemButton} ${isActive ? styles.routeItemButtonActive : ''}`}
                                                        >
                                                            <span className={styles.routeItemInfo}>
                                                                <strong className={styles.routeItemTitle}>{product.nome}</strong>
                                                                <span className={styles.routeItemMeta}>
                                                                    {product.nomePrateleira || 'Sem prateleira'}
                                                                </span>
                                                            </span>
                                                            <span className={styles.routeItemPrice}>
                                                                {formatPrice(product.preco)} €
                                                            </span>
                                                        </button>
                                                    );
                                                })} 
                                            </div>
                                        </section>
                                    ))}
                                </div>

                                <div className={styles.mapPreviewCard}>
                                    <div className={styles.modalHeader}>
                                        <div>
                                            <h3>{activePreviewProduct?.nome || 'Selecione um item da rota'}</h3>
                                            <p>
                                                {activePreviewProduct?.nomeCorredor || 'Sem corredor'} • {activePreviewProduct?.nomePrateleira || 'Sem prateleira'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={styles.mapCanvas}>
                                        {layoutImageUrl ? (
                                            <>
                                                <img src={layoutImageUrl} alt="Mapa da loja" className={styles.mapImage} />
                                                {activePreviewProduct?.posXPrateleira != null && activePreviewProduct?.posYPrateleira != null && (
                                                    <div
                                                        className={styles.mapPin}
                                                        style={{
                                                            left: `${activePreviewProduct.posXPrateleira}%`,
                                                            top: `${activePreviewProduct.posYPrateleira}%`,
                                                        }}
                                                    >
                                                        <span>📍</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className={styles.mapFallback}>
                                                O lojista ainda nao anexou o mapa desta loja.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className={styles.empty}>
                                Abra a visualizacao de loja para ver a rota ordenada por corredor.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default ShoppingListPlanner;
