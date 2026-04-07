import React, { useEffect, useRef, useState } from 'react';
import { apiService } from '../Services/api';
import styles from './Lojista.module.css';

const PRODUCTS_PAGE_SIZE = 200;
const initialShelfForm = { nome: '', idCorredor: '' };
const initialProductForm = {
    nome: '',
    descricao: '',
    categoria: '',
    preco: '',
    stock: '0',
    idPrateleira: '',
};

const sortByLabel = (left, right, accessor) =>
    accessor(left).localeCompare(accessor(right), 'pt', { sensitivity: 'base' });

const clampPercent = (value) => Math.max(0, Math.min(100, value));

const Lojista = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('corredores');
    const [store, setStore] = useState(null);
    const [corredores, setCorredores] = useState([]);
    const [prateleiras, setPrateleiras] = useState([]);
    const [prateleirasIndex, setPrateleirasIndex] = useState({});
    const [produtos, setProdutos] = useState([]);
    const [selectedShelfForPinId, setSelectedShelfForPinId] = useState('');
    const [draggingShelfId, setDraggingShelfId] = useState(null);
    const [novoCorredor, setNovoCorredor] = useState('');
    const [novaPrateleira, setNovaPrateleira] = useState(initialShelfForm);
    const [novoProduto, setNovoProduto] = useState(initialProductForm);
    const [selectedProducts, setSelectedProducts] = useState({});
    const [bulkShelfId, setBulkShelfId] = useState('');
    const [notification, setNotification] = useState(null);
    const [loading, setLoading] = useState(true);

    const mapRef = useRef(null);
    const shelfIndexRef = useRef({});
    const productsRef = useRef([]);
    const notificationTimeoutRef = useRef(null);
    const dragStateRef = useRef({ shelfId: null, posX: null, posY: null });

    useEffect(() => {
        shelfIndexRef.current = prateleirasIndex;
    }, [prateleirasIndex]);

    useEffect(() => {
        productsRef.current = produtos;
    }, [produtos]);

    useEffect(() => () => {
        if (notificationTimeoutRef.current) {
            window.clearTimeout(notificationTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (!user.storeId) {
            setLoading(false);
            return;
        }

        void carregarTudo();
    }, [user.storeId]);

    useEffect(() => {
        if (!draggingShelfId) {
            return undefined;
        }

        const handleWindowMouseMove = (event) => {
            const coords = extractMapCoordinates(event);
            if (!coords) {
                return;
            }

            dragStateRef.current = {
                shelfId: draggingShelfId,
                posX: coords.x,
                posY: coords.y,
            };

            const currentShelf = shelfIndexRef.current[draggingShelfId];
            if (!currentShelf) {
                return;
            }

            syncShelf({
                ...currentShelf,
                posX: coords.x,
                posY: coords.y,
                pinned: true,
            });
        };

        const handleWindowMouseUp = () => {
            void persistDraggedShelf();
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
        document.body.style.userSelect = 'none';

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
            document.body.style.userSelect = '';
        };
    }, [draggingShelfId, user.storeId]);

    const showNotify = (type, text) => {
        if (notificationTimeoutRef.current) {
            window.clearTimeout(notificationTimeoutRef.current);
        }

        setNotification({ type, text });
        notificationTimeoutRef.current = window.setTimeout(() => {
            setNotification(null);
            notificationTimeoutRef.current = null;
        }, 3500);
    };

    const resolveErrorMessage = (error, fallback) => {
        if (!error) {
            return fallback;
        }
        if (typeof error === 'string') {
            return error;
        }
        return error.message || fallback;
    };

    const handleApiError = (error, fallback) => {
        const message = resolveErrorMessage(error, fallback);
        showNotify('error', message);

        const normalized = message.toLowerCase();
        if (normalized.includes('sessao') || normalized.includes('sessão')) {
            onLogout();
            return;
        }
        if (normalized.includes('outro utilizador') || normalized.includes('desatualizado')) {
            void carregarTudo();
        }
    };

    const syncShelf = (updatedShelf) => {
        if (!updatedShelf) {
            return;
        }

        setPrateleiras((prev) => {
            const exists = prev.some((item) => item.id === updatedShelf.id);
            const next = exists
                ? prev.map((item) => (item.id === updatedShelf.id ? updatedShelf : item))
                : [...prev, updatedShelf];

            return next.sort((left, right) => sortByLabel(left, right, (item) => item.name));
        });

        setPrateleirasIndex((prev) => ({
            ...prev,
            [updatedShelf.id]: updatedShelf,
        }));
    };

    const removeShelfLocally = (shelfId) => {
        setPrateleiras((prev) => prev.filter((item) => item.id !== shelfId));
        setPrateleirasIndex((prev) => {
            const next = { ...prev };
            delete next[shelfId];
            return next;
        });
        setSelectedShelfForPinId((prev) => (String(shelfId) === prev ? '' : prev));
        setBulkShelfId((prev) => (String(shelfId) === prev ? '' : prev));
        setProdutos((prev) => prev.filter((item) => item.idPrateleira !== shelfId));
        setSelectedProducts((prev) => {
            const next = { ...prev };
            productsRef.current.forEach((item) => {
                if (item.idPrateleira === shelfId) {
                    delete next[String(item.id)];
                }
            });
            return next;
        });
    };

    const applyProductsPage = (produtosPage) => {
        const productList = (Array.isArray(produtosPage?.content) ? produtosPage.content : []).sort((left, right) =>
            sortByLabel(left, right, (item) => item.nome)
        );
        const productIds = productList.reduce((acc, item) => {
            acc[String(item.id)] = true;
            return acc;
        }, {});

        setProdutos(productList);
        setSelectedProducts((prev) => {
            const next = {};
            Object.keys(prev).forEach((id) => {
                if (productIds[id]) {
                    next[id] = true;
                }
            });
            return next;
        });
    };

    const upsertProduct = (product) => {
        if (!product) {
            return;
        }

        setProdutos((prev) => {
            const exists = prev.some((item) => item.id === product.id);
            const next = exists
                ? prev.map((item) => (item.id === product.id ? product : item))
                : [product, ...prev];

            return next.sort((left, right) => sortByLabel(left, right, (item) => item.nome));
        });
    };

    const mergeUpdatedProducts = (updatedProducts) => {
        if (!Array.isArray(updatedProducts) || updatedProducts.length === 0) {
            return;
        }

        const updatedById = updatedProducts.reduce((acc, item) => {
            acc[item.id] = item;
            return acc;
        }, {});

        setProdutos((prev) =>
            prev
                .map((item) => updatedById[item.id] || item)
                .sort((left, right) => sortByLabel(left, right, (item) => item.nome))
        );
    };

    const syncProductsFromServer = async () => {
        const produtosPage = await apiService.getProducts({
            storeId: user.storeId,
            page: 0,
            size: PRODUCTS_PAGE_SIZE,
        });

        applyProductsPage(produtosPage);
        return produtosPage;
    };

    const carregarTudo = async () => {
        setLoading(true);
        try {
            const [storeData, corredoresData, prateleirasData, produtosPage] = await Promise.all([
                apiService.getStore(user.storeId),
                apiService.getCorredores({ storeId: user.storeId }),
                apiService.getPrateleiras({ storeId: user.storeId }),
                apiService.getProducts({ storeId: user.storeId, page: 0, size: PRODUCTS_PAGE_SIZE }),
            ]);

            const shelves = (Array.isArray(prateleirasData) ? prateleirasData : []).sort((left, right) =>
                sortByLabel(left, right, (item) => item.name)
            );
            const shelfIndex = shelves.reduce((acc, shelf) => {
                acc[shelf.id] = shelf;
                return acc;
            }, {});

            setStore(storeData || null);
            setCorredores((Array.isArray(corredoresData) ? corredoresData : []).sort((left, right) =>
                sortByLabel(left, right, (item) => item.name)
            ));
            setPrateleiras(shelves);
            setPrateleirasIndex(shelfIndex);
            applyProductsPage(produtosPage);
        } catch (error) {
            handleApiError(error, 'Erro ao carregar os dados da loja.');
        } finally {
            setLoading(false);
        }
    };

    const extractMapCoordinates = (event) => {
        if (!mapRef.current) {
            return null;
        }

        const rect = mapRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            return null;
        }

        return {
            x: clampPercent(((event.clientX - rect.left) / rect.width) * 100),
            y: clampPercent(((event.clientY - rect.top) / rect.height) * 100),
        };
    };

    const startShelfDrag = (event, shelfId) => {
        event.preventDefault();
        event.stopPropagation();

        const currentShelf = shelfIndexRef.current[shelfId];
        if (!currentShelf) {
            return;
        }

        dragStateRef.current = {
            shelfId,
            posX: currentShelf.posX,
            posY: currentShelf.posY,
        };
        setDraggingShelfId(shelfId);
    };

    const persistDraggedShelf = async () => {
        const dragState = dragStateRef.current;
        dragStateRef.current = { shelfId: null, posX: null, posY: null };

        if (!dragState.shelfId) {
            setDraggingShelfId(null);
            return;
        }

        setDraggingShelfId(null);
        const shelf = shelfIndexRef.current[dragState.shelfId];
        if (!shelf) {
            return;
        }

        try {
            const updatedShelf = await apiService.updatePrateleira(shelf.id, {
                storeId: user.storeId,
                posX: dragState.posX,
                posY: dragState.posY,
                version: shelf.version,
            });
            syncShelf(updatedShelf);
            showNotify('success', 'Coordenadas da prateleira atualizadas.');
        } catch (error) {
            handleApiError(error, 'Nao foi possivel atualizar a posicao da prateleira.');
        }
    };

    const handleMapClick = async (event) => {
        if (draggingShelfId) {
            return;
        }
        if (!store?.layoutImageUrl) {
            showNotify('error', 'Carregue primeiro um mapa para posicionar os pins.');
            return;
        }
        if (!selectedShelfForPinId) {
            showNotify('error', 'Selecione uma prateleira existente para criar o pin.');
            return;
        }

        const shelf = shelfIndexRef.current[selectedShelfForPinId];
        const coords = extractMapCoordinates(event);
        if (!shelf || !coords) {
            return;
        }

        try {
            const updatedShelf = await apiService.updatePrateleira(shelf.id, {
                storeId: user.storeId,
                posX: coords.x,
                posY: coords.y,
                version: shelf.version,
            });
            syncShelf(updatedShelf);
            setSelectedShelfForPinId('');
            showNotify('success', 'Pin associado a prateleira existente.');
        } catch (error) {
            handleApiError(error, 'Nao foi possivel posicionar o pin.');
        }
    };

    const handleMapUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (loadEvent) => {
            const imageData = loadEvent.target?.result;
            if (!imageData) {
                return;
            }

            try {
                const updatedStore = await apiService.updateStoreLayout(
                    user.storeId,
                    imageData,
                    store?.version
                );
                setStore(updatedStore);
                showNotify('success', 'Mapa atualizado com sucesso.');
            } catch (error) {
                handleApiError(error, 'Nao foi possivel guardar o mapa.');
            }
        };
        reader.readAsDataURL(file);
    };

    const handleAddCorredor = async (event) => {
        event.preventDefault();
        try {
            const created = await apiService.createCorredor({
                nome: novoCorredor,
                storeId: user.storeId,
            });
            setCorredores((prev) =>
                [...prev, created].sort((left, right) => sortByLabel(left, right, (item) => item.name))
            );
            setNovoCorredor('');
            showNotify('success', 'Corredor criado.');
        } catch (error) {
            handleApiError(error, 'Falha ao criar corredor.');
        }
    };

    const handleAddShelf = async (event) => {
        event.preventDefault();
        try {
            const createdShelf = await apiService.createPrateleira({
                name: novaPrateleira.nome,
                corredorId: Number.parseInt(novaPrateleira.idCorredor, 10),
                storeId: user.storeId,
            });
            syncShelf(createdShelf);
            setNovaPrateleira(initialShelfForm);
            showNotify('success', 'Prateleira criada sem depender do mapa.');
        } catch (error) {
            handleApiError(error, 'Falha ao criar prateleira.');
        }
    };

    const handleAddProduto = async (event) => {
        event.preventDefault();
        const selectedShelf = prateleirasIndex[novoProduto.idPrateleira];
        const selectedShelfId = Number.parseInt(
            String(selectedShelf?.id ?? novoProduto.idPrateleira ?? ''),
            10
        );

        if (!Number.isInteger(selectedShelfId) || selectedShelfId <= 0) {
            showNotify('error', 'Selecione uma prateleira valida antes de guardar o produto.');
            return;
        }

        try {
            const createdProduct = await apiService.createProduct({
                ...novoProduto,
                idPrateleira: selectedShelfId,
                storeId: user.storeId,
            });

            setNovoProduto(initialProductForm);
            try {
                await syncProductsFromServer();
                showNotify('success', 'Produto registado.');
            } catch (syncError) {
                upsertProduct(createdProduct);
                showNotify('success', 'Produto registado. A lista foi atualizada localmente porque a recarga falhou.');
            }
        } catch (error) {
            handleApiError(error, 'Falha ao criar produto.');
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm('Apagar este registo?')) {
            return;
        }

        try {
            if (type === 'prod') {
                await apiService.deleteProduct(id, user.storeId);
                setProdutos((prev) => prev.filter((item) => item.id !== id));
                setSelectedProducts((prev) => {
                    const next = { ...prev };
                    delete next[String(id)];
                    return next;
                });
            }

            if (type === 'corr') {
                await apiService.deleteCorredor(id, user.storeId);
                await carregarTudo();
            }

            if (type === 'prat') {
                await apiService.deletePrateleira(id, user.storeId);
                removeShelfLocally(id);
            }

            showNotify('success', 'Registo removido.');
        } catch (error) {
            handleApiError(error, 'Falha ao remover registo.');
        }
    };

    const toggleProductSelection = (productId) => {
        const key = String(productId);
        setSelectedProducts((prev) => {
            const next = { ...prev };
            if (next[key]) {
                delete next[key];
            } else {
                next[key] = true;
            }
            return next;
        });
    };

    const toggleSelectAllProducts = () => {
        const allSelected =
            produtos.length > 0 && produtos.every((produto) => selectedProducts[String(produto.id)]);

        if (allSelected) {
            setSelectedProducts({});
            return;
        }

        const next = {};
        produtos.forEach((produto) => {
            next[String(produto.id)] = true;
        });
        setSelectedProducts(next);
    };

    const handleBulkMove = async () => {
        const selectedItems = produtos.filter((produto) => selectedProducts[String(produto.id)]);

        if (!bulkShelfId || selectedItems.length === 0) {
            showNotify('error', 'Selecione produtos e a prateleira de destino.');
            return;
        }

        try {
            const updatedProducts = await apiService.moveProductsBatch({
                storeId: user.storeId,
                targetShelfId: Number.parseInt(bulkShelfId, 10),
                items: selectedItems.map((produto) => ({
                    inventoryId: produto.id,
                    version: produto.version,
                })),
            });

            mergeUpdatedProducts(updatedProducts);
            setSelectedProducts({});
            setBulkShelfId('');
            showNotify('success', 'Produtos movidos em massa com sucesso.');
        } catch (error) {
            handleApiError(error, 'Falha ao mover produtos selecionados.');
        }
    };

    const selectShelfForPin = (shelfId) => {
        setActiveTab('layout');
        setSelectedShelfForPinId(String(shelfId));
        showNotify('success', 'Prateleira pronta para receber ou reposicionar o pin no mapa.');
    };

    const unpinnedShelves = prateleiras.filter((shelf) => !shelf.pinned);
    const selectedProductCount = Object.keys(selectedProducts).length;
    const allProductsSelected =
        produtos.length > 0 && produtos.every((produto) => selectedProducts[String(produto.id)]);

    if (!user.storeId) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.emptyPanel}>
                    <h1>Loja nao configurada</h1>
                    <p>Este utilizador lojista ainda nao tem uma loja associada.</p>
                    <button onClick={onLogout} className={styles.logoutBtn}>Sair</button>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className={styles.wrapper}><div className={styles.emptyPanel}>A carregar painel...</div></div>;
    }

    return (
        <div className={styles.wrapper}>
            {notification && (
                <div className={`${styles.notification} ${notification.type === 'error' ? styles.notificationError : styles.notificationSuccess}`}>
                    {notification.text}
                </div>
            )}

            <header className={styles.header}>
                <div>
                    <h1 className={styles.pageTitle}>Gestao de Loja</h1>
                    <span className={styles.pageSubtitle}>
                        {store?.name || user.storeName || 'Loja do lojista'} • membros {store?.memberCount ?? 1}
                    </span>
                </div>
                <button onClick={onLogout} className={styles.logoutBtn}>Sair</button>
            </header>

            <div className={styles.body}>
                <aside className={styles.sidebar}>
                    <div className={styles.tabs}>
                        <button
                            onClick={() => setActiveTab('corredores')}
                            className={`${styles.tabBtn} ${activeTab === 'corredores' ? styles.activeTab : ''}`}
                        >
                            Corredores
                        </button>
                        <button
                            onClick={() => setActiveTab('produtos')}
                            className={`${styles.tabBtn} ${activeTab === 'produtos' ? styles.activeTab : ''}`}
                        >
                            Produtos
                        </button>
                        <button
                            onClick={() => setActiveTab('layout')}
                            className={`${styles.tabBtn} ${activeTab === 'layout' ? styles.activeTab : ''}`}
                        >
                            Layout e Pins
                        </button>
                    </div>

                    {activeTab === 'corredores' && (
                        <div className={styles.panelSection}>
                            <h3 className={styles.sectionTitle}>Novo Corredor</h3>
                            <form onSubmit={handleAddCorredor} className={styles.formStack}>
                                <input
                                    className="inputGlobal"
                                    placeholder="Nome do corredor"
                                    value={novoCorredor}
                                    onChange={(event) => setNovoCorredor(event.target.value)}
                                    required
                                />
                                <button className="btnPrimary" style={{ width: '100%' }}>Criar Corredor</button>
                            </form>

                            <div className={styles.listBlock}>
                                {corredores.map((corredor) => (
                                    <div key={corredor.id} className={styles.miniRow}>
                                        <div>
                                            <strong>{corredor.name}</strong>
                                            <div className={styles.mutedText}>Versao {corredor.version}</div>
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.linkDanger}
                                            onClick={() => handleDelete('corr', corredor.id)}
                                        >
                                            Apagar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'produtos' && (
                        <div className={styles.panelSection}>
                            <h3 className={styles.sectionTitle}>Novo Produto</h3>
                            <form onSubmit={handleAddProduto} className={styles.formStack}>
                                <input
                                    className="inputGlobal"
                                    placeholder="Nome"
                                    value={novoProduto.nome}
                                    onChange={(event) => setNovoProduto({ ...novoProduto, nome: event.target.value })}
                                    required
                                />
                                <input
                                    className="inputGlobal"
                                    placeholder="Descricao"
                                    value={novoProduto.descricao}
                                    onChange={(event) => setNovoProduto({ ...novoProduto, descricao: event.target.value })}
                                />
                                <input
                                    className="inputGlobal"
                                    placeholder="Categoria"
                                    value={novoProduto.categoria}
                                    onChange={(event) => setNovoProduto({ ...novoProduto, categoria: event.target.value })}
                                />
                                <input
                                    className="inputGlobal"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Preco"
                                    value={novoProduto.preco}
                                    onChange={(event) => setNovoProduto({ ...novoProduto, preco: event.target.value })}
                                    required
                                />
                                <input
                                    className="inputGlobal"
                                    type="number"
                                    min="0"
                                    placeholder="Stock"
                                    value={novoProduto.stock}
                                    onChange={(event) => setNovoProduto({ ...novoProduto, stock: event.target.value })}
                                    required
                                />
                                <select
                                    className="inputGlobal"
                                    value={novoProduto.idPrateleira}
                                    onChange={(event) => setNovoProduto({ ...novoProduto, idPrateleira: event.target.value })}
                                    required
                                >
                                    <option value="">Prateleira...</option>
                                    {prateleiras.map((shelf) => (
                                        <option key={shelf.id} value={shelf.id}>
                                            {shelf.name}
                                        </option>
                                    ))}
                                </select>
                                <button className="btnPrimary" style={{ width: '100%' }}>Guardar Produto</button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'layout' && (
                        <>
                            <div className={styles.panelSection}>
                                <h3 className={styles.sectionTitle}>Mapa da Loja</h3>
                                <label className={styles.uploadLabel}>
                                    Carregar imagem do mapa
                                    <input
                                        type="file"
                                        onChange={handleMapUpload}
                                        accept="image/*"
                                        className={styles.hiddenInput}
                                    />
                                </label>
                                <p className={styles.mutedText}>
                                    As prateleiras podem ser criadas sem mapa. O mapa apenas posiciona pins existentes.
                                </p>
                            </div>

                            <div className={styles.panelSection}>
                                <h3 className={styles.sectionTitle}>Nova Prateleira</h3>
                                <form onSubmit={handleAddShelf} className={styles.formStack}>
                                    <input
                                        className="inputGlobal"
                                        placeholder="Nome da prateleira"
                                        value={novaPrateleira.nome}
                                        onChange={(event) => setNovaPrateleira({ ...novaPrateleira, nome: event.target.value })}
                                        required
                                    />
                                    <select
                                        className="inputGlobal"
                                        value={novaPrateleira.idCorredor}
                                        onChange={(event) => setNovaPrateleira({ ...novaPrateleira, idCorredor: event.target.value })}
                                        required
                                    >
                                        <option value="">Corredor...</option>
                                        {corredores.map((corredor) => (
                                            <option key={corredor.id} value={corredor.id}>
                                                {corredor.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button className="btnPrimary" style={{ width: '100%' }}>Criar Prateleira</button>
                                </form>
                            </div>

                            <div className={styles.panelSection}>
                                <h3 className={styles.sectionTitle}>Associar Pin</h3>
                                <select
                                    className="inputGlobal"
                                    value={selectedShelfForPinId}
                                    onChange={(event) => setSelectedShelfForPinId(event.target.value)}
                                >
                                    <option value="">Selecione uma prateleira existente...</option>
                                    {prateleiras.map((shelf) => (
                                        <option key={shelf.id} value={shelf.id}>
                                            {shelf.name} {shelf.pinned ? '(reposicionar)' : '(sem pin)'}
                                        </option>
                                    ))}
                                </select>
                                <p className={styles.mutedText}>
                                    Clique no mapa para criar o pin. Depois arraste e largue para atualizar as coordenadas.
                                </p>
                            </div>

                            <div className={styles.panelSection}>
                                <h3 className={styles.sectionTitle}>Prateleiras</h3>
                                <div className={styles.listBlock}>
                                    {prateleiras.map((shelf) => (
                                        <div key={shelf.id} className={styles.shelfRow}>
                                            <div>
                                                <strong>{shelf.name}</strong>
                                                <div className={styles.mutedText}>
                                                    {shelf.corredorName || 'Sem corredor'} • versao {shelf.version}
                                                </div>
                                            </div>
                                            <div className={styles.shelfActions}>
                                                <span className={styles.statusBadge}>
                                                    {shelf.pinned ? 'Com pin' : 'Sem pin'}
                                                </span>
                                                <button
                                                    type="button"
                                                    className={styles.secondaryBtn}
                                                    onClick={() => selectShelfForPin(shelf.id)}
                                                >
                                                    {shelf.pinned ? 'Reposicionar' : 'Pin no mapa'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.linkDanger}
                                                    onClick={() => handleDelete('prat', shelf.id)}
                                                >
                                                    Apagar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {unpinnedShelves.length > 0 && (
                                    <p className={styles.mutedText}>
                                        {unpinnedShelves.length} prateleira(s) ainda sem pin.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </aside>

                <main className={styles.main}>
                    {activeTab === 'layout' ? (
                        <div className={styles.mapContainer}>
                            {store?.layoutImageUrl ? (
                                <div ref={mapRef} className={styles.mapFrame} onClick={handleMapClick}>
                                    <img
                                        src={store.layoutImageUrl}
                                        className={styles.mapImage}
                                        draggable="false"
                                        alt="Mapa da loja"
                                    />

                                    {prateleiras
                                        .filter((shelf) => shelf.pinned)
                                        .map((shelf) => (
                                            <button
                                                key={shelf.id}
                                                type="button"
                                                onMouseDown={(event) => startShelfDrag(event, shelf.id)}
                                                className={`${styles.pinElement} ${draggingShelfId === shelf.id ? styles.pinDragging : ''}`}
                                                style={{
                                                    left: `${shelf.posX}%`,
                                                    top: `${shelf.posY}%`,
                                                }}
                                                title={`Prateleira ${shelf.name}`}
                                            >
                                                <span className={styles.pinMarker} />
                                                <span className={styles.pinLabel}>{shelf.name}</span>
                                            </button>
                                        ))}
                                </div>
                            ) : (
                                <div className={styles.mapPlaceholder}>
                                    <h3>Sem mapa anexado</h3>
                                    <p>
                                        Crie corredores e prateleiras normalmente. Quando anexar o mapa, selecione uma
                                        prateleira existente para colocar cada pin.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'produtos' ? (
                        <div className={styles.contentPanel}>
                            <div className={styles.selectionBar}>
                                <label className={styles.selectionToggle}>
                                    <input
                                        type="checkbox"
                                        checked={allProductsSelected}
                                        onChange={toggleSelectAllProducts}
                                    />
                                    Selecionar todos
                                </label>

                                <div className={styles.bulkActions}>
                                    <span className={styles.bulkLabel}>{selectedProductCount} selecionado(s)</span>
                                    <select
                                        className={styles.bulkSelect}
                                        value={bulkShelfId}
                                        onChange={(event) => setBulkShelfId(event.target.value)}
                                    >
                                        <option value="">Mover para prateleira...</option>
                                        {prateleiras.map((shelf) => (
                                            <option key={shelf.id} value={shelf.id}>
                                                {shelf.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button type="button" className="btnPrimary" onClick={handleBulkMove}>
                                        Mover Selecionados
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.secondaryBtn}
                                        onClick={() => setSelectedProducts({})}
                                    >
                                        Limpar
                                    </button>
                                </div>
                            </div>

                            <div className={styles.listBlock}>
                                {produtos.map((produto) => {
                                    const shelf = produto.idPrateleira ? prateleirasIndex[produto.idPrateleira] : null;
                                    const checked = Boolean(selectedProducts[String(produto.id)]);

                                    return (
                                        <div key={produto.id} className={styles.cardItem}>
                                            <div className={styles.productRow}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleProductSelection(produto.id)}
                                                />
                                                <div>
                                                    <strong>{produto.nome}</strong>
                                                    <div className={styles.productMeta}>
                                                        {produto.preco} EUR • Stock {produto.stock} • {produto.categoria || 'Sem categoria'}
                                                    </div>
                                                    <div className={styles.productMeta}>
                                                        {shelf ? `Prateleira ${shelf.name}` : 'Sem prateleira'} • {produto.nomeCorredor || 'Sem corredor'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete('prod', produto.id)}
                                                className={styles.linkDanger}
                                            >
                                                Apagar
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {produtos.length === 0 && <p className={styles.emptyState}>Nenhum produto registado.</p>}
                        </div>
                    ) : (
                        <div className={styles.contentPanel}>
                            <h2 className={styles.sectionHeading}>Corredores</h2>
                            <div className={styles.listBlock}>
                                {corredores.map((corredor) => (
                                    <div key={corredor.id} className={styles.cardItem}>
                                        <div>
                                            <strong>{corredor.name}</strong>
                                            <div className={styles.productMeta}>Versao {corredor.version}</div>
                                        </div>
                                        <button
                                            type="button"
                                            className={styles.linkDanger}
                                            onClick={() => handleDelete('corr', corredor.id)}
                                        >
                                            Apagar
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {corredores.length === 0 && <p className={styles.emptyState}>Nenhum corredor criado.</p>}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Lojista;
