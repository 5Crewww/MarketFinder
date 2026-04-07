import React, { useEffect, useState } from 'react';
import { apiService } from '../Services/api';
import styles from './User.module.css';
import ClientStoreSelector from './ClientStoreSelector';
import { useStoreSelection } from '../context/StoreSelectionContext';

const PAGE_SIZE = 12;
const initialFilters = {
    categoria: '',
    precoMin: '',
    precoMax: '',
    inStock: true,
};

const initialPagination = {
    page: 0,
    totalPages: 0,
    hasNext: false,
    totalElements: 0,
};

const preloadImage = (imageUrl) =>
    new Promise((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Falha ao carregar imagem.'));
        image.src = imageUrl;
    });

const User = ({ user, onLogout }) => {
    const { selectedStore, selectedStoreId, selectStore, clearStoreSelection } = useStoreSelection();
    const [produtos, setProdutos] = useState([]);
    const [stores, setStores] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [selectedStoreDetails, setSelectedStoreDetails] = useState(null);
    const [termoPesquisa, setTermoPesquisa] = useState('');
    const [filtros, setFiltros] = useState({ ...initialFilters });
    const [pagination, setPagination] = useState({ ...initialPagination });
    const [mapaProduto, setMapaProduto] = useState(null);
    const [storesLoading, setStoresLoading] = useState(true);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [storesError, setStoresError] = useState('');
    const [erro, setErro] = useState('');
    const [mapaStatus, setMapaStatus] = useState({
        ready: false,
        loading: false,
        message: '',
    });

    useEffect(() => {
        void carregarStores();
    }, []);

    useEffect(() => {
        if (!selectedStoreId) {
            setSelectedStoreDetails(null);
            setCategorias([]);
            setProdutos([]);
            setPagination({ ...initialPagination });
            setErro('');
            setMapaStatus({
                ready: false,
                loading: false,
                message: '',
            });
            return;
        }

        void carregarContextoDaLoja(selectedStoreId);
    }, [selectedStoreId]);

    const carregarStores = async () => {
        setStoresLoading(true);
        setStoresError('');
        try {
            const data = await apiService.getPublicStores();
            const lista = Array.isArray(data) ? data : [];
            setStores(lista);

            if (selectedStoreId && !lista.some((store) => String(store.id) === String(selectedStoreId))) {
                clearStoreSelection();
                setSelectedStoreDetails(null);
                setCategorias([]);
                setProdutos([]);
                setPagination({ ...initialPagination });
            }
        } catch (err) {
            setStoresError('Erro ao carregar lojas disponíveis.');
        } finally {
            setStoresLoading(false);
        }
    };

    const carregarContextoDaLoja = async (storeId) => {
        setCatalogLoading(true);
        setErro('');
        try {
            const [storeData, categoryData, productsData] = await Promise.all([
                apiService.getPublicStore(storeId),
                apiService.getPublicProductCategories(storeId),
                apiService.getPublicProducts({
                    storeId,
                    nome: termoPesquisa.trim() || undefined,
                    categoria: filtros.categoria || undefined,
                    precoMin: filtros.precoMin || undefined,
                    precoMax: filtros.precoMax || undefined,
                    inStock: filtros.inStock ? true : undefined,
                    page: 0,
                    size: PAGE_SIZE,
                }),
            ]);
            setSelectedStoreDetails(storeData || null);
            setCategorias(Array.isArray(categoryData) ? categoryData : []);
            applyProductsResponse(productsData);
            if (storeData) {
                selectStore(storeData);
            }

            if (!storeData?.layoutImageUrl) {
                setMapaStatus({
                    ready: false,
                    loading: false,
                    message: 'O mapa desta loja ainda nao foi configurado pelo lojista.',
                });
                return;
            }

            setMapaStatus({
                ready: false,
                loading: true,
                message: '',
            });
            await preloadImage(storeData.layoutImageUrl);
            setMapaStatus({
                ready: true,
                loading: false,
                message: '',
            });

        } catch (err) {
            setMapaStatus({
                ready: false,
                loading: false,
                message: 'Nao foi possivel carregar o mapa da loja selecionada.',
            });
            setErro('Erro ao carregar os dados da loja selecionada.');
        } finally {
            setCatalogLoading(false);
        }
    };

    const applyProductsResponse = (response) => {
        setProdutos(Array.isArray(response?.content) ? response.content : []);
        setPagination({
            page: response?.page || 0,
            totalPages: response?.totalPages || 0,
            hasNext: Boolean(response?.hasNext),
            totalElements: response?.totalElements || 0,
        });
    };

    const buscarProdutos = async (page = 0, storeOverride = selectedStoreId, overrides = {}) => {
        if (!storeOverride) {
            setProdutos([]);
            return;
        }
        setCatalogLoading(true);
        setErro('');

        try {
            const response = await apiService.getPublicProducts({
                storeId: storeOverride,
                nome: overrides.termoPesquisa ?? (termoPesquisa.trim() || undefined),
                categoria: overrides.categoria ?? (filtros.categoria || undefined),
                precoMin: overrides.precoMin ?? (filtros.precoMin || undefined),
                precoMax: overrides.precoMax ?? (filtros.precoMax || undefined),
                inStock: overrides.inStock ?? (filtros.inStock ? true : undefined),
                page,
                size: PAGE_SIZE,
            });

            applyProductsResponse(response);
        } catch (err) {
            setErro('Erro ao buscar produtos.');
        } finally {
            setCatalogLoading(false);
        }
    };

    const handleSubmitPesquisa = (e) => {
        e.preventDefault();
        buscarProdutos(0);
    };

    const limparFiltros = () => {
        const filtrosLimpos = { ...initialFilters };
        setTermoPesquisa('');
        setFiltros(filtrosLimpos);
        buscarProdutos(0, selectedStoreId, {
            termoPesquisa: undefined,
            ...filtrosLimpos,
        });
    };

    const handleSelectStore = (store) => {
        setTermoPesquisa('');
        setFiltros({ ...initialFilters });
        setPagination({ ...initialPagination });
        setMapaProduto(null);
        setErro('');
        setMapaStatus({
            ready: false,
            loading: false,
            message: '',
        });
        selectStore(store);
    };

    const handleChangeStore = () => {
        setTermoPesquisa('');
        setFiltros({ ...initialFilters });
        setPagination({ ...initialPagination });
        setMapaProduto(null);
        setErro('');
        setMapaStatus({
            ready: false,
            loading: false,
            message: '',
        });
        clearStoreSelection();
    };

    if (!selectedStoreId) {
        return (
            <ClientStoreSelector
                stores={stores}
                loading={storesLoading}
                error={storesError}
                onSelectStore={handleSelectStore}
                onRetry={() => void carregarStores()}
                onLogout={onLogout}
            />
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <h1>Ola, {user.nome}!</h1>
                    <p>Pesquise produtos, visualize o mapa e trabalhe sempre com a loja escolhida.</p>
                </div>
                <div className={styles.headerActions}>
                    <button type="button" onClick={handleChangeStore} className={styles.secondaryAction}>
                        Trocar loja
                    </button>
                    <button onClick={onLogout} className="btnPrimary" style={{ background: 'var(--danger)', width: 'auto' }}>
                        Sair
                    </button>
                </div>
            </header>

            <section className={styles.searchSection}>
                <div className={styles.activeStoreCard}>
                    <div>
                        <p className={styles.activeStoreLabel}>Loja selecionada</p>
                        <strong>{selectedStoreDetails?.name || selectedStore?.name}</strong>
                    </div>
                    <span className={styles.activeStoreMeta}>
                        {mapaStatus.loading
                            ? 'A validar mapa'
                            : mapaStatus.ready
                                ? 'Mapa configurado'
                                : 'Mapa pendente'}
                    </span>
                </div>

                <div className={styles.filterGrid}>
                    <select
                        className={styles.searchInput}
                        value={filtros.categoria}
                        onChange={(e) => setFiltros((prev) => ({ ...prev, categoria: e.target.value }))}
                        disabled={!selectedStoreId}
                    >
                        <option value="">Todas as categorias</option>
                        {categorias.map((categoria) => (
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
                        value={filtros.precoMin}
                        onChange={(e) => setFiltros((prev) => ({ ...prev, precoMin: e.target.value }))}
                    />

                    <input
                        className={styles.searchInput}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Preco maximo"
                        value={filtros.precoMax}
                        onChange={(e) => setFiltros((prev) => ({ ...prev, precoMax: e.target.value }))}
                    />
                </div>

                <form onSubmit={handleSubmitPesquisa} className={styles.searchForm}>
                    <input
                        className={styles.searchInput}
                        type="text"
                        placeholder="O que procura hoje? Ex: arroz"
                        value={termoPesquisa}
                        onChange={(e) => setTermoPesquisa(e.target.value)}
                    />
                    <label className={styles.stockToggle}>
                        <input
                            type="checkbox"
                            checked={filtros.inStock}
                            onChange={(e) => setFiltros((prev) => ({ ...prev, inStock: e.target.checked }))}
                        />
                        Apenas em stock
                    </label>
                    <button
                        type="submit"
                        className={`btnPrimary ${styles.btnSearch}`}
                        disabled={!selectedStoreId || mapaStatus.loading}
                    >
                        Buscar
                    </button>
                    <button type="button" className={styles.linkButton} onClick={limparFiltros}>
                        Limpar
                    </button>
                </form>

                {(selectedStoreDetails || selectedStore) && (
                    <>
                        <p className={styles.storeInfo}>
                            Loja ativa: <strong>{selectedStoreDetails?.name || selectedStore?.name}</strong> • {pagination.totalElements} resultados
                        </p>
                        {!mapaStatus.ready && mapaStatus.message && (
                            <p className={styles.storeInfo}>{mapaStatus.message}</p>
                        )}
                    </>
                )}
            </section>

            {catalogLoading ? (
                <p className={styles.empty}>A carregar catalogo...</p>
            ) : erro ? (
                <p className={styles.empty}>{erro}</p>
            ) : produtos.length === 0 ? (
                <div className={styles.empty}>
                    <p>Nenhum produto encontrado para os filtros aplicados.</p>
                </div>
            ) : (
                <>
                    <div className={styles.grid}>
                        {produtos.map((prod) => (
                            <div key={prod.id} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.productName}>{prod.nome}</h3>
                                    <span className={styles.priceTag}>{prod.preco} €</span>
                                </div>
                                <p className={styles.productDesc}>
                                    {prod.descricao || 'Sem descricao disponivel.'}
                                </p>
                                <div className={styles.metaList}>
                                    <span>{prod.categoria || 'Sem categoria'}</span>
                                    <span>Stock: {prod.stock}</span>
                                    <span>{prod.nomeCorredor} • {prod.nomePrateleira}</span>
                                </div>
                                <div className={styles.cardFooter}>
                                    <button className={styles.locationButton} onClick={() => setMapaProduto(prod)}>
                                        Ver no mapa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.pagination}>
                        <button
                            type="button"
                            className={styles.pageButton}
                            disabled={pagination.page === 0}
                            onClick={() => buscarProdutos(pagination.page - 1)}
                        >
                            Anterior
                        </button>
                        <span>
                            Pagina {pagination.page + 1} de {Math.max(pagination.totalPages, 1)}
                        </span>
                        <button
                            type="button"
                            className={styles.pageButton}
                            disabled={!pagination.hasNext}
                            onClick={() => buscarProdutos(pagination.page + 1)}
                        >
                            Proxima
                        </button>
                    </div>
                </>
            )}

            {mapaProduto && (
                <div className={styles.modalBackdrop} onClick={() => setMapaProduto(null)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h3>{mapaProduto.nome}</h3>
                                <p>{mapaProduto.nomeCorredor} • {mapaProduto.nomePrateleira}</p>
                            </div>
                            <button type="button" className={styles.closeButton} onClick={() => setMapaProduto(null)}>
                                ×
                            </button>
                        </div>

                        <div className={styles.mapCanvas}>
                            {selectedStoreDetails?.layoutImageUrl && mapaStatus.ready ? (
                                <>
                                    <img
                                        src={selectedStoreDetails.layoutImageUrl}
                                        alt={`Mapa de ${selectedStoreDetails.name}`}
                                        className={styles.mapImage}
                                    />
                                    {mapaProduto.posXPrateleira != null && mapaProduto.posYPrateleira != null && (
                                        <div
                                            className={styles.mapPin}
                                            style={{
                                                left: `${mapaProduto.posXPrateleira}%`,
                                                top: `${mapaProduto.posYPrateleira}%`,
                                            }}
                                        >
                                            <span>📍</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className={styles.mapFallback}>
                                    {mapaStatus.message || 'O mapa desta loja ainda nao foi configurado pelo lojista.'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default User;
