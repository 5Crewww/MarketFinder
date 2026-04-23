import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiService, getStoreLogoUrl } from '../Services/api';
import styles from './Lojista.module.css';

const PRODUCTS_PAGE_SIZE = 200;

const initialStoreForm = {
    name: '',
    location: '',
    description: '',
    version: null,
};

const initialShelfForm = {
    name: '',
    corredorId: '',
};

const initialProductForm = {
    nome: '',
    descricao: '',
    categoria: '',
    preco: '',
    stock: '0',
    idPrateleira: '',
};

const tabItems = [
    { id: 'dashboard', label: 'Dashboard', description: 'Resumo, corredores e produtos' },
    { id: 'store', label: 'Loja', description: 'Configuracao global da loja' },
    { id: 'shelves', label: 'Prateleiras', description: 'CRUD e organizacao de dados' },
    { id: 'map', label: 'Mapa e Layout', description: 'Pins, tooltip e layout visual' },
];

const updateStoredCurrentUserStoreName = (storeName) => {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
        return;
    }

    try {
        const parsedUser = JSON.parse(savedUser);
        localStorage.setItem('currentUser', JSON.stringify({
            ...parsedUser,
            storeName,
        }));
    } catch (error) {
        console.error('Nao foi possivel sincronizar o nome da loja no armazenamento local:', error);
    }
};

const sortByLabel = (left, right, accessor) =>
    accessor(left).localeCompare(accessor(right), 'pt', { sensitivity: 'base' });

const clampPercent = (value) => Math.max(0, Math.min(100, value));

const toAlphaCode = (index) => {
    const normalizedIndex = Number(index);
    if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0) {
        return 'S';
    }

    let current = normalizedIndex;
    let output = '';

    do {
        output = String.fromCharCode(65 + (current % 26)) + output;
        current = Math.floor(current / 26) - 1;
    } while (current >= 0);

    return output;
};

const buildShelfCode = (shelf, corredorCodeMap) => {
    if (!shelf) {
        return 'S0';
    }

    const corridorCode = corredorCodeMap[shelf.corredorId] || 'S';
    return `${corridorCode}${shelf.id}`;
};

const formatCoordinates = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '0.0';
    }

    return value.toFixed(1);
};

const Lojista = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [store, setStore] = useState(null);
    const [storeForm, setStoreForm] = useState({ ...initialStoreForm });
    const [storeSaving, setStoreSaving] = useState(false);
    const [corredores, setCorredores] = useState([]);
    const [prateleiras, setPrateleiras] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [selectedShelfForPinId, setSelectedShelfForPinId] = useState('');
    const [activePinShelfId, setActivePinShelfId] = useState(null);
    const [draggingShelfId, setDraggingShelfId] = useState(null);
    const [novoCorredor, setNovoCorredor] = useState('');
    const [novaPrateleira, setNovaPrateleira] = useState(initialShelfForm);
    const [editingShelfId, setEditingShelfId] = useState(null);
    const [editingShelfForm, setEditingShelfForm] = useState(initialShelfForm);
    const [novoProduto, setNovoProduto] = useState(initialProductForm);
    const [selectedProducts, setSelectedProducts] = useState({});
    const [bulkShelfId, setBulkShelfId] = useState('');
    const [csvFile, setCsvFile] = useState(null);
    const [csvImporting, setCsvImporting] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoTimestamp, setLogoTimestamp] = useState(0);
    const [notification, setNotification] = useState(null);
    const [loading, setLoading] = useState(true);

    const mapRef = useRef(null);
    const csvInputRef = useRef(null);
    const logoInputRef = useRef(null);
    const productsRef = useRef([]);
    const notificationTimeoutRef = useRef(null);
    const dragStateRef = useRef({ shelfId: null, posX: null, posY: null });
    const shelfIndexRef = useRef({});

    const prateleirasIndex = useMemo(
        () =>
            prateleiras.reduce((acc, shelf) => {
                acc[shelf.id] = shelf;
                return acc;
            }, {}),
        [prateleiras]
    );

    const shelfProductCounts = useMemo(
        () =>
            produtos.reduce((acc, produto) => {
                if (produto.idPrateleira) {
                    acc[produto.idPrateleira] = (acc[produto.idPrateleira] || 0) + 1;
                }
                return acc;
            }, {}),
        [produtos]
    );

    const corredorCodeMap = useMemo(
        () =>
            corredores.reduce((acc, corredor, index) => {
                acc[corredor.id] = toAlphaCode(index);
                return acc;
            }, {}),
        [corredores]
    );

    const unpinnedShelves = useMemo(
        () => prateleiras.filter((shelf) => !shelf.pinned),
        [prateleiras]
    );

    const dashboardMetrics = useMemo(
        () => [
            { label: 'Corredores', value: corredores.length, detail: 'Estrutura fisica cadastrada' },
            { label: 'Prateleiras', value: prateleiras.length, detail: `${unpinnedShelves.length} sem pin` },
            { label: 'Produtos', value: produtos.length, detail: 'Inventario sincronizado' },
            { label: 'Pins ativos', value: prateleiras.length - unpinnedShelves.length, detail: 'Layout visual disponivel' },
        ],
        [corredores.length, prateleiras.length, produtos.length, unpinnedShelves.length]
    );

    useEffect(() => {
        productsRef.current = produtos;
    }, [produtos]);

    useEffect(() => {
        shelfIndexRef.current = prateleirasIndex;
    }, [prateleirasIndex]);

    useEffect(() => {
        setStoreForm({
            name: store?.name || user.storeName || '',
            location: store?.location || '',
            description: store?.description || '',
            version: store?.version ?? null,
        });
    }, [store?.name, store?.location, store?.description, store?.version, user.storeName]);

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
        console.error('Lojista API error:', error);
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
    };

    const removeShelfLocally = (shelfId) => {
        setPrateleiras((prev) => prev.filter((item) => item.id !== shelfId));
        setSelectedShelfForPinId((prev) => (String(shelfId) === prev ? '' : prev));
        setActivePinShelfId((prev) => (prev === shelfId ? null : prev));
        setBulkShelfId((prev) => (String(shelfId) === prev ? '' : prev));
        setEditingShelfId((prev) => (prev === shelfId ? null : prev));
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

            setStore(storeData || null);
            setCorredores((Array.isArray(corredoresData) ? corredoresData : []).sort((left, right) =>
                sortByLabel(left, right, (item) => item.name)
            ));
            setPrateleiras((Array.isArray(prateleirasData) ? prateleirasData : []).sort((left, right) =>
                sortByLabel(left, right, (item) => item.name)
            ));
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
        setActivePinShelfId(shelfId);
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
            showNotify('success', 'Posicao da prateleira atualizada no mapa.');
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
            setActivePinShelfId(updatedShelf.id);
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

    const handleStoreFormSubmit = async (event) => {
        event.preventDefault();

        if (!storeForm.name.trim()) {
            showNotify('error', 'O nome da loja nao pode ficar vazio.');
            return;
        }

        setStoreSaving(true);
        try {
            const updatedStore = await apiService.updateStoreDetails(user.storeId, storeForm);
            setStore(updatedStore);
            updateStoredCurrentUserStoreName(updatedStore?.name || storeForm.name.trim());
            showNotify('success', 'Dados da loja atualizados.');
        } catch (error) {
            handleApiError(error, 'Nao foi possivel atualizar os dados da loja.');
        } finally {
            setStoreSaving(false);
        }
    };

    const handleLogoFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLogoUploading(true);
        try {
            const updatedStore = await apiService.uploadStoreLogo(user.storeId, file);
            setStore(updatedStore);
            setLogoTimestamp(Date.now());
            showNotify('success', 'Logótipo atualizado com sucesso.');
        } catch (error) {
            handleApiError(error, 'Não foi possível fazer upload do logótipo.');
        } finally {
            setLogoUploading(false);
            if (logoInputRef.current) {
                logoInputRef.current.value = '';
            }
        }
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
                name: novaPrateleira.name,
                corredorId: Number.parseInt(novaPrateleira.corredorId, 10),
                storeId: user.storeId,
            });
            syncShelf(createdShelf);
            setNovaPrateleira(initialShelfForm);
            showNotify('success', 'Prateleira criada.');
        } catch (error) {
            handleApiError(error, 'Falha ao criar prateleira.');
        }
    };

    const handleEditShelf = (shelf) => {
        setEditingShelfId(shelf.id);
        setEditingShelfForm({
            name: shelf.name || '',
            corredorId: String(shelf.corredorId || ''),
            version: shelf.version ?? null,
        });
    };

    const handleSaveShelf = async (shelfId) => {
        try {
            const updatedShelf = await apiService.updatePrateleira(shelfId, {
                storeId: user.storeId,
                name: editingShelfForm.name,
                corredorId: Number.parseInt(editingShelfForm.corredorId, 10),
                version: editingShelfForm.version,
            });
            syncShelf(updatedShelf);
            setEditingShelfId(null);
            setEditingShelfForm(initialShelfForm);
            showNotify('success', 'Prateleira atualizada.');
        } catch (error) {
            handleApiError(error, 'Nao foi possivel atualizar a prateleira.');
        }
    };

    const cancelShelfEdition = () => {
        setEditingShelfId(null);
        setEditingShelfForm(initialShelfForm);
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

    const clearCsvSelection = () => {
        setCsvFile(null);
        if (csvInputRef.current) {
            csvInputRef.current.value = '';
        }
    };

    const handleCsvSelection = (event) => {
        const file = event.target.files?.[0] ?? null;
        setCsvFile(file);
    };

    const handleImportProductsCsv = async () => {
        if (!csvFile) {
            showNotify('error', 'Selecione um ficheiro CSV antes de importar.');
            return;
        }

        setCsvImporting(true);
        try {
            const importedProducts = await apiService.uploadProductsCsv(user.storeId, csvFile);
            await syncProductsFromServer();
            clearCsvSelection();
            const importedCount = Array.isArray(importedProducts) ? importedProducts.length : 0;
            showNotify(
                'success',
                importedCount > 0
                    ? `${importedCount} produto(s) importado(s) com sucesso.`
                    : 'Importacao CSV concluida com sucesso.'
            );
        } catch (error) {
            handleApiError(error, 'Falha ao importar o ficheiro CSV.');
        } finally {
            setCsvImporting(false);
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

    const jumpToMapForShelf = (shelfId) => {
        setActiveTab('map');
        setSelectedShelfForPinId(String(shelfId));
        setActivePinShelfId(shelfId);
        showNotify('success', 'Prateleira preparada para ser posicionada no mapa.');
    };

    const selectedProductCount = Object.keys(selectedProducts).length;
    const allProductsSelected =
        produtos.length > 0 && produtos.every((produto) => selectedProducts[String(produto.id)]);

    const renderDashboardTab = () => (
        <div className={styles.scrollPanel}>
            <section className={styles.metricGrid}>
                {dashboardMetrics.map((metric) => (
                    <article key={metric.label} className={styles.metricCard}>
                        <span className={styles.metricLabel}>{metric.label}</span>
                        <strong className={styles.metricValue}>{metric.value}</strong>
                        <span className={styles.metricDetail}>{metric.detail}</span>
                    </article>
                ))}
            </section>

            <section className={styles.panelGrid}>
                <article className={styles.panelSection}>
                    <h3 className={styles.sectionTitle}>Corredores</h3>
                    <form onSubmit={handleAddCorredor} className={styles.formStack}>
                        <input
                            className="inputGlobal"
                            placeholder="Nome do corredor"
                            value={novoCorredor}
                            onChange={(event) => setNovoCorredor(event.target.value)}
                            required
                        />
                        <button className={`btnPrimary ${styles.fullWidthButton}`}>Criar Corredor</button>
                    </form>

                    <div className={styles.listBlock}>
                        {corredores?.map((corredor, index) => (
                            <div key={corredor.id} className={styles.miniRow}>
                                <div>
                                    <strong>{corredor.name}</strong>
                                    <div className={styles.mutedText}>
                                        Codigo {toAlphaCode(index)} • versao {corredor.version}
                                    </div>
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
                </article>

                <article className={styles.panelSection}>
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
                        <div className={styles.formSplit}>
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
                        </div>
                        <select
                            className="inputGlobal"
                            value={novoProduto.idPrateleira}
                            onChange={(event) => setNovoProduto({ ...novoProduto, idPrateleira: event.target.value })}
                            required
                        >
                            <option value="">Prateleira...</option>
                            {prateleiras?.map((shelf) => (
                                <option key={shelf.id} value={shelf.id}>
                                    {buildShelfCode(shelf, corredorCodeMap)} • {shelf.name}
                                </option>
                            ))}
                        </select>
                        <button className={`btnPrimary ${styles.fullWidthButton}`}>Guardar Produto</button>
                    </form>
                </article>
            </section>

            <section className={styles.panelGrid}>
                <article className={styles.panelSection}>
                    <h3 className={styles.sectionTitle}>Importacao CSV</h3>
                    <label className={styles.uploadLabel}>
                        Selecionar ficheiro CSV
                        <input
                            ref={csvInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className={styles.hiddenInput}
                            onChange={handleCsvSelection}
                        />
                    </label>
                    <p className={styles.fileMeta}>
                        {csvFile?.name || 'Nenhum ficheiro selecionado.'}
                    </p>
                    <div className={styles.inlineActions}>
                        <button
                            type="button"
                            className={`btnPrimary ${styles.inlinePrimaryButton}`}
                            onClick={handleImportProductsCsv}
                            disabled={csvImporting || !csvFile}
                        >
                            {csvImporting ? 'A importar...' : 'Importar CSV'}
                        </button>
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={clearCsvSelection}
                            disabled={csvImporting || !csvFile}
                        >
                            Limpar ficheiro
                        </button>
                    </div>
                    <p className={styles.mutedText}>
                        Formato esperado: Nome, Descricao, Categoria, Marca, Preco, IdPrateleira.
                    </p>
                </article>

                <article className={styles.panelSection}>
                    <h3 className={styles.sectionTitle}>Estado do Layout</h3>
                    <div className={styles.infoStack}>
                        <div className={styles.infoCard}>
                            <strong>Mapa</strong>
                            <span>{store?.layoutImageUrl ? 'Configurado e pronto' : 'Ainda nao carregado'}</span>
                        </div>
                        <div className={styles.infoCard}>
                            <strong>Prateleiras sem pin</strong>
                            <span>{unpinnedShelves.length}</span>
                        </div>
                        <div className={styles.infoCard}>
                            <strong>Loja</strong>
                            <span>{store?.name || user.storeName || 'Loja do lojista'}</span>
                        </div>
                    </div>
                </article>
            </section>

            <section className={styles.contentPanel}>
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
                            {prateleiras?.map((shelf) => (
                                <option key={shelf.id} value={shelf.id}>
                                    {buildShelfCode(shelf, corredorCodeMap)} • {shelf.name}
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
                    {produtos?.map((produto) => {
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
                                            {shelf
                                                ? `${buildShelfCode(shelf, corredorCodeMap)} • ${shelf.name}`
                                                : 'Sem prateleira'}
                                            {' • '}
                                            {produto.nomeCorredor || 'Sem corredor'}
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
            </section>
        </div>
    );

    const renderStoreTab = () => (
        <div className={styles.storeLayout}>
            <section className={styles.panelSection}>
                <h2 className={styles.sectionHeading}>Configuracoes da Loja</h2>
                <p className={styles.sectionLead}>
                    Edite a identidade da loja sem misturar esta informacao com operacoes de prateleiras ou mapa.
                </p>

                <form onSubmit={handleStoreFormSubmit} className={styles.formStack}>
                    <input
                        className="inputGlobal"
                        placeholder="Nome da loja"
                        value={storeForm.name}
                        onChange={(event) => setStoreForm((prev) => ({ ...prev, name: event.target.value }))}
                        maxLength={160}
                        required
                    />
                    <input
                        className="inputGlobal"
                        placeholder="Localizacao"
                        value={storeForm.location}
                        onChange={(event) => setStoreForm((prev) => ({ ...prev, location: event.target.value }))}
                        maxLength={255}
                    />
                    <textarea
                        className={styles.textarea}
                        placeholder="Descricao da loja"
                        value={storeForm.description}
                        onChange={(event) => setStoreForm((prev) => ({ ...prev, description: event.target.value }))}
                        maxLength={1000}
                        rows={6}
                    />
                    <button className={`btnPrimary ${styles.fullWidthButton}`} disabled={storeSaving}>
                        {storeSaving ? 'A guardar...' : 'Guardar detalhes da loja'}
                    </button>
                </form>
            </section>

            <aside className={styles.panelSection}>
                <h3 className={styles.sectionTitle}>Logotipo da Loja</h3>
                <div className={styles.logoSection}>
                    {store?.hasLogo ? (
                        <img
                            src={getStoreLogoUrl(store.id, logoTimestamp)}
                            alt="Logotipo da loja"
                            className={styles.logoPreview}
                        />
                    ) : (
                        <div className={styles.logoPlaceholderBox}>
                            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.logoPlaceholderSvg}>
                                <rect width="64" height="64" rx="16" fill="currentColor" opacity="0.07"/>
                                <path d="M18 46L26 34l7 8 5-7 8 11H18z" fill="currentColor" opacity="0.35"/>
                                <circle cx="40" cy="26" r="6" fill="currentColor" opacity="0.35"/>
                            </svg>
                            <span className={styles.logoPlaceholderText}>Sem logotipo</span>
                        </div>
                    )}
                    <label className={`${styles.uploadLabel} ${logoUploading ? styles.uploadLabelDisabled : ''}`}>
                        {logoUploading ? 'A fazer upload...' : 'Carregar logotipo (JPEG ou PNG, max. 5 MB)'}
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/jpeg,image/png"
                            className={styles.hiddenInput}
                            onChange={handleLogoFileChange}
                            disabled={logoUploading}
                        />
                    </label>
                    <p className={styles.mutedText}>
                        O logotipo e exibido publicamente no ecra de selecao de loja.
                    </p>
                </div>

                <h3 className={styles.sectionTitle} style={{ marginTop: '24px' }}>Resumo atual</h3>
                <div className={styles.storeSummary}>
                    <div className={styles.summaryRow}>
                        <span>Nome</span>
                        <strong>{store?.name || 'Loja do lojista'}</strong>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Localizacao</span>
                        <strong>{store?.location || 'Nao definida'}</strong>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Descricao</span>
                        <strong>{store?.description || 'Sem descricao'}</strong>
                    </div>
                    <div className={styles.summaryRow}>
                        <span>Membros</span>
                        <strong>{store?.memberCount ?? 1}</strong>
                    </div>
                </div>
            </aside>
        </div>
    );

    const renderShelvesTab = () => (
        <div className={styles.scrollPanel}>
            <section className={styles.panelGrid}>
                <article className={styles.panelSection}>
                    <h2 className={styles.sectionHeading}>Criar Prateleira</h2>
                    <form onSubmit={handleAddShelf} className={styles.formStack}>
                        <input
                            className="inputGlobal"
                            placeholder="Nome da prateleira"
                            value={novaPrateleira.name}
                            onChange={(event) => setNovaPrateleira({ ...novaPrateleira, name: event.target.value })}
                            required
                        />
                        <select
                            className="inputGlobal"
                            value={novaPrateleira.corredorId}
                            onChange={(event) => setNovaPrateleira({ ...novaPrateleira, corredorId: event.target.value })}
                            required
                        >
                            <option value="">Corredor...</option>
                            {corredores?.map((corredor) => (
                                <option key={corredor.id} value={corredor.id}>
                                    {corredorCodeMap[corredor.id]} • {corredor.name}
                                </option>
                            ))}
                        </select>
                        <button className={`btnPrimary ${styles.fullWidthButton}`}>Criar Prateleira</button>
                    </form>
                </article>

                <article className={styles.panelSection}>
                    <h3 className={styles.sectionTitle}>Diretriz operacional</h3>
                    <p className={styles.mutedText}>
                        Esta aba trata apenas de dados: nome, corredor, codigo e estado de mapeamento.
                        O posicionamento visual dos pins fica exclusivamente em “Mapa e Layout”.
                    </p>
                </article>
            </section>

            <section className={styles.tablePanel}>
                <div className={styles.tableHeader}>
                    <div>
                        <h2 className={styles.sectionHeading}>Prateleiras da Loja</h2>
                        <p className={styles.sectionLead}>
                            Edite e apague prateleiras num fluxo tipo CRUD, sem poluicao visual do mapa.
                        </p>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Codigo</th>
                                <th>Nome</th>
                                <th>Corredor</th>
                                <th>Produtos</th>
                                <th>Pin</th>
                                <th>Acoes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prateleiras?.map((shelf) => {
                                const isEditing = editingShelfId === shelf.id;
                                return (
                                    <tr key={shelf.id}>
                                        <td>{shelf.id}</td>
                                        <td>{buildShelfCode(shelf, corredorCodeMap)}</td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className={styles.tableInput}
                                                    value={editingShelfForm.name}
                                                    onChange={(event) =>
                                                        setEditingShelfForm((prev) => ({ ...prev, name: event.target.value }))
                                                    }
                                                />
                                            ) : (
                                                shelf.name
                                            )}
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <select
                                                    className={styles.tableInput}
                                                    value={editingShelfForm.corredorId}
                                                    onChange={(event) =>
                                                        setEditingShelfForm((prev) => ({ ...prev, corredorId: event.target.value }))
                                                    }
                                                >
                                                    {corredores?.map((corredor) => (
                                                        <option key={corredor.id} value={corredor.id}>
                                                            {corredorCodeMap[corredor.id]} • {corredor.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                shelf.corredorName
                                            )}
                                        </td>
                                        <td>{shelfProductCounts[shelf.id] || 0}</td>
                                        <td>
                                            <span className={styles.tableBadge}>
                                                {shelf.pinned ? 'Posicionado' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.tableActions}>
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className={styles.tableActionPrimary}
                                                            onClick={() => void handleSaveShelf(shelf.id)}
                                                        >
                                                            Guardar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={styles.tableAction}
                                                            onClick={cancelShelfEdition}
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className={styles.tableActionPrimary}
                                                            onClick={() => handleEditShelf(shelf)}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={styles.tableAction}
                                                            onClick={() => jumpToMapForShelf(shelf.id)}
                                                        >
                                                            Mapear
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={styles.tableActionDanger}
                                                            onClick={() => handleDelete('prat', shelf.id)}
                                                        >
                                                            Apagar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );

    const renderMapTab = () => (
        <div className={styles.mapLayout}>
            <section className={styles.mapSidebar}>
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
                        O layout visual desta aba serve apenas para posicionar e rever pins das prateleiras existentes.
                    </p>
                </div>

                <div className={styles.panelSection}>
                    <h3 className={styles.sectionTitle}>Associar ou reposicionar pin</h3>
                    <select
                        className="inputGlobal"
                        value={selectedShelfForPinId}
                        onChange={(event) => setSelectedShelfForPinId(event.target.value)}
                    >
                        <option value="">Selecione uma prateleira...</option>
                        {prateleiras?.map((shelf) => (
                            <option key={shelf.id} value={shelf.id}>
                                {buildShelfCode(shelf, corredorCodeMap)} • {shelf.name}
                            </option>
                        ))}
                    </select>
                    <p className={styles.mutedText}>
                        Clique no mapa para criar o pin. Depois arraste o codigo curto para ajustar a posicao.
                    </p>
                </div>

                <div className={styles.panelSection}>
                    <h3 className={styles.sectionTitle}>Prateleiras sem pin</h3>
                    <div className={styles.listBlock}>
                        {unpinnedShelves.length === 0 ? (
                            <p className={styles.emptyState}>Todas as prateleiras ja estao posicionadas.</p>
                        ) : (
                            unpinnedShelves.map((shelf) => (
                                <button
                                    key={shelf.id}
                                    type="button"
                                    className={styles.mapShelfButton}
                                    onClick={() => jumpToMapForShelf(shelf.id)}
                                >
                                    <span className={styles.mapShelfCode}>{buildShelfCode(shelf, corredorCodeMap)}</span>
                                    <span className={styles.mapShelfLabel}>{shelf.name}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </section>

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
                            .map((shelf) => {
                                const pinCode = buildShelfCode(shelf, corredorCodeMap);
                                const isActivePin = activePinShelfId === shelf.id;

                                return (
                                    <button
                                        key={shelf.id}
                                        type="button"
                                        onMouseDown={(event) => startShelfDrag(event, shelf.id)}
                                        onMouseEnter={() => setActivePinShelfId(shelf.id)}
                                        onMouseLeave={() => !draggingShelfId && setActivePinShelfId((prev) => (prev === shelf.id ? null : prev))}
                                        onFocus={() => setActivePinShelfId(shelf.id)}
                                        onBlur={() => !draggingShelfId && setActivePinShelfId((prev) => (prev === shelf.id ? null : prev))}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setActivePinShelfId((prev) => (prev === shelf.id ? null : shelf.id));
                                        }}
                                        className={`${styles.pinElement} ${draggingShelfId === shelf.id ? styles.pinDragging : ''}`}
                                        style={{
                                            left: `${shelf.posX}%`,
                                            top: `${shelf.posY}%`,
                                        }}
                                        title={shelf.name}
                                    >
                                        <span className={styles.pinCode}>{pinCode}</span>
                                        {isActivePin && (
                                            <div className={styles.pinTooltip}>
                                                <strong>{shelf.name}</strong>
                                                <span>{shelf.corredorName || 'Sem corredor'}</span>
                                                <span>{shelfProductCounts[shelf.id] || 0} produto(s) associados</span>
                                                <span>
                                                    X {formatCoordinates(shelf.posX)}% • Y {formatCoordinates(shelf.posY)}%
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                    </div>
                ) : (
                    <div className={styles.mapPlaceholder}>
                        <h3>Sem mapa anexado</h3>
                        <p>
                            Carregue o layout da loja para visualizar pins. As prateleiras continuam
                            disponiveis na aba de CRUD enquanto o mapa nao estiver pronto.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'store':
                return renderStoreTab();
            case 'shelves':
                return renderShelvesTab();
            case 'map':
                return renderMapTab();
            case 'dashboard':
            default:
                return renderDashboardTab();
        }
    };

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
        return (
            <div className={styles.wrapper}>
                <div className={styles.emptyPanel}>A carregar painel...</div>
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            {notification && (
                <div className={`${styles.notification} ${notification.type === 'error' ? styles.notificationError : styles.notificationSuccess}`}>
                    {notification.text}
                </div>
            )}

            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <span className={styles.eyebrow}>Dashboard do Lojista</span>
                    <h1 className={styles.pageTitle}>Gestao de Loja</h1>
                    <div className={styles.storeSummaryBar}>
                        <strong>{store?.name || user.storeName || 'Loja do lojista'}</strong>
                        <span className={styles.pageSubtitle}>
                            {store?.location || 'Localizacao nao definida'} • membros {store?.memberCount ?? 1}
                        </span>
                    </div>
                </div>
                <button onClick={onLogout} className={styles.logoutBtn}>Sair</button>
            </header>

            <div className={styles.body}>
                <aside className={styles.sidebar}>
                    <div className={styles.tabs}>
                        {tabItems.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`${styles.tabBtn} ${activeTab === tab.id ? styles.activeTab : ''}`}
                            >
                                <span>{tab.label}</span>
                                <small className={styles.tabDescription}>{tab.description}</small>
                            </button>
                        ))}
                    </div>

                    <div className={styles.sidebarHint}>
                        <strong>Estado partilhado</strong>
                        <p>
                            Corredores, prateleiras, loja e produtos sao carregados uma vez no nivel superior
                            e reutilizados nas diferentes abas sem novos fetches desnecessarios.
                        </p>
                    </div>
                </aside>

                <main className={styles.main}>{renderActiveTab()}</main>
            </div>
        </div>
    );
};

export default Lojista;
