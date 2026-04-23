const API_URL = 'http://localhost:8080';
const PRODUCTS_API_URL = `${API_URL}/produtos`;
const STORE_NAME_API_URL = `${API_URL}/stores`;

// Utilitário exportado para construir o URL do logótipo de uma loja.
// Usado como src de <img> — funciona sem token porque o endpoint é público.
export const getStoreLogoUrl = (storeId, cacheBust = 0) =>
    `${API_URL}/stores/${storeId}/logo${cacheBust ? `?t=${cacheBust}` : ''}`;

const getSessionToken = () => {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
        return null;
    }

    try {
        return JSON.parse(savedUser)?.sessionToken || null;
    } catch (error) {
        return null;
    }
};

const withAuthHeaders = (headers = {}) => {
    const sessionToken = getSessionToken();
    return sessionToken
        ? { ...headers, Authorization: `Bearer ${sessionToken}` }
        : headers;
};

const withoutContentType = (headers = {}) => {
    if (headers instanceof Headers) {
        headers.delete('Content-Type');
        headers.delete('content-type');
        return headers;
    }

    const nextHeaders = { ...headers };
    Object.keys(nextHeaders).forEach((headerName) => {
        if (headerName.toLowerCase() === 'content-type') {
            delete nextHeaders[headerName];
        }
    });
    return nextHeaders;
};

const SESSION_EXPIRED_MESSAGE =
    'A sua sessao expirou por seguranca. Por favor, faca login novamente.';
const SESSION_INVALID_MESSAGE =
    'A sua sessao e invalida. Por favor, faca login novamente.';

const clearSessionAndNotify = (message) => {
    localStorage.removeItem('currentUser');
    // Dispara um evento customizado para que os componentes React possam reagir
    // sem acoplamento direto entre api.js e o estado da aplicacao.
    window.dispatchEvent(new CustomEvent('session:expired', { detail: { message } }));
};

const handleResponse = (response) => {
    return response.text().then((text) => {
        let data = null;

        if (text) {
            try {
                data = JSON.parse(text);
            } catch (error) {
                data = text;
            }
        }

        if (!response.ok) {
            // Intercecao de 401: sessao expirada ou invalida
            if (response.status === 401) {
                const serverMessage = (typeof data?.message === 'string'
                    ? data.message
                    : ''
                ).toLowerCase();

                const isExpired = serverMessage.includes('expir');
                const notifyMessage = isExpired
                    ? SESSION_EXPIRED_MESSAGE
                    : SESSION_INVALID_MESSAGE;

                clearSessionAndNotify(notifyMessage);
                return Promise.reject(notifyMessage);
            }

            const details = Array.isArray(data?.details) && data.details.length > 0
                ? ` ${data.details.join(' ')}`
                : '';
            const error = data?.message
                ? `${data.message}${details}`
                : data || response.statusText;
            return Promise.reject(error);
        }

        return data;
    });
};

const toQueryString = (params = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }
        search.set(key, value);
    });

    const query = search.toString();
    return query ? `?${query}` : '';
};

const parseIntegerField = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    if (normalizedValue === '') {
        return null;
    }

    const parsedValue = Number.parseInt(normalizedValue, 10);
    return Number.isInteger(parsedValue) ? parsedValue : null;
};

const parseDecimalField = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const normalizedValue = typeof value === 'string'
        ? value.trim().replace(',', '.')
        : value;

    if (normalizedValue === '') {
        return null;
    }

    const parsedValue = typeof normalizedValue === 'number'
        ? normalizedValue
        : Number.parseFloat(normalizedValue);

    if (!Number.isFinite(parsedValue)) {
        return null;
    }

    return Number(parsedValue.toFixed(2));
};

const buildProductPayload = (data) => {
    return {
        productId: parseIntegerField(data.productId),
        nome: typeof data.nome === 'string' ? data.nome.trim() : data.nome,
        descricao: typeof data.descricao === 'string' ? data.descricao.trim() : data.descricao,
        categoria: typeof data.categoria === 'string' ? data.categoria.trim() : data.categoria,
        preco: parseDecimalField(data.preco),
        stock: parseIntegerField(data.stock),
        idPrateleira: parseIntegerField(data.shelfId ?? data.idPrateleira),
        storeId: parseIntegerField(data.storeId),
        version: parseIntegerField(data.version),
    };
};

const validateCreateProductPayload = (payload) => {
    if (!payload.storeId) {
        throw new Error('A loja do produto e obrigatoria.');
    }

    if (!payload.idPrateleira) {
        throw new Error('A prateleira do produto e obrigatoria.');
    }

    if (!payload.productId && (!payload.nome || !payload.nome.trim())) {
        throw new Error('O nome do produto e obrigatorio.');
    }

    return payload;
};

export const apiService = {
    login: async (identificador, senha) => {
        const response = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: (identificador ?? '').trim(),
                senha,
            }),
        });
        return handleResponse(response);
    },

    logout: () =>
        fetch(`${API_URL}/users/logout`, {
            method: 'POST',
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getUserByName: (nome) =>
        fetch(`${API_URL}/users/by-name?nome=${encodeURIComponent(nome)}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    register: (userData) =>
        fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(userData),
        }).then(handleResponse),

    getAllUsers: () =>
        fetch(`${API_URL}/users`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    deleteUser: (id) =>
        fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getStores: () =>
        fetch(`${API_URL}/stores`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getPublicStores: () =>
        fetch(`${API_URL}/stores/public`).then(handleResponse),

    getStore: (id) =>
        fetch(`${API_URL}/stores/${id}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getPublicStore: (id) =>
        fetch(`${API_URL}/stores/public/${id}`).then(handleResponse),

    updateStoreLayout: (id, layoutImageUrl, version) =>
        fetch(`${API_URL}/stores/${id}/layout`, {
            method: 'PUT',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ layoutImageUrl, version }),
        }).then(handleResponse),

    updateStoreDetails: (storeId, data = {}) =>
        fetch(`${STORE_NAME_API_URL}/${storeId}`, {
            method: 'PUT',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
                name: typeof data.name === 'string' ? data.name.trim() : data.name,
                location: typeof data.location === 'string' ? data.location.trim() : data.location,
                description: typeof data.description === 'string' ? data.description.trim() : data.description,
                version: parseIntegerField(data.version),
            }),
        }).then(handleResponse),

    updateStoreName: (storeId, newName, version) =>
        apiService.updateStoreDetails(storeId, { name: newName, version }),

    getCorredores: (params = {}) =>
        fetch(`${API_URL}/corredores${toQueryString(params)}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getCorredoresByStore: (storeId) =>
        fetch(`${API_URL}/corredores/store/${storeId}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    createCorredor: (data) =>
        fetch(`${API_URL}/corredores`, {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        }).then(handleResponse),

    deleteCorredor: (id, storeId) =>
        fetch(`${API_URL}/corredores/${id}${toQueryString({ storeId })}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getPrateleiras: (params = {}) =>
        fetch(`${API_URL}/prateleiras${toQueryString(params)}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    createPrateleira: (data) =>
        fetch(`${API_URL}/prateleiras`, {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        }).then(handleResponse),

    deletePrateleira: (id, storeId) =>
        fetch(`${API_URL}/prateleiras/${id}${toQueryString({ storeId })}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        }).then(handleResponse),

    updatePrateleira: (id, dados) =>
        fetch(`${API_URL}/prateleiras/${id}`, {
            method: 'PUT',
            headers: withAuthHeaders({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify(dados),
        }).then(handleResponse),

  getProducts: (params = {}) => {
        const requestParams = typeof params === 'string' ? { nome: params } : params;
        // CORRIGIDO: Adicionado /ProdGet
        return fetch(`${PRODUCTS_API_URL}/ProdGet${toQueryString(requestParams)}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse);
    },

    getPublicProducts: (params = {}) => {
        const requestParams = typeof params === 'string' ? { nome: params } : params;
        return fetch(`${PRODUCTS_API_URL}/public${toQueryString(requestParams)}`).then(handleResponse);
    },

    getProductCategories: (storeId) =>
        // CORRIGIDO: Alterado para /Categorias (Maiúscula, exatamente como no Java)
        fetch(`${PRODUCTS_API_URL}/Categorias${toQueryString({ storeId })}`, {
            headers: withAuthHeaders(),
        }).then(handleResponse),

    getPublicProductCategories: (storeId) =>
        fetch(`${PRODUCTS_API_URL}/public/categorias${toQueryString({ storeId })}`).then(handleResponse),

    /**
     * Envia a lista global de termos para o endpoint match-list.
     * Uma unica chamada independente do numero de itens na lista.
     *
     * @param {number} storeId - ID da loja onde procurar
     * @param {string[]} termos - Array de strings ex: ['arroz', 'leite']
     * @returns {Promise<ProdutosResponse[]>} - Array de produtos encontrados
     */
    matchList: (storeId, termos) => {
        const normalizedStoreId = parseIntegerField(storeId);
        if (!normalizedStoreId) {
            return Promise.reject(new Error('A loja e obrigatoria para o match-list.'));
        }
        if (!Array.isArray(termos) || termos.length === 0) {
            return Promise.resolve([]);
        }

        const termosParam = termos
            .map((t) => String(t).trim())
            .filter((t) => t.length > 0)
            .slice(0, 30)
            .join(',');

        if (!termosParam) return Promise.resolve([]);

        return fetch(
            `${API_URL}/produtos/loja/${normalizedStoreId}/match-list?termos=${encodeURIComponent(termosParam)}`
        ).then(handleResponse);
    },

    createProduct: (data) => {
        const payload = validateCreateProductPayload(buildProductPayload(data));

        // CORRIGIDO: Adicionado /ProdPost
        return fetch(`${PRODUCTS_API_URL}/ProdPost`, {
            method: 'POST',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        }).then(handleResponse);
    },

    deleteProduct: (id, storeId) =>
        // CORRIGIDO: O id passou para dentro da Query String (toQueryString), porque o teu Java usa @RequestParam
        fetch(`${PRODUCTS_API_URL}/ProdDelete${toQueryString({ id, storeId })}`, {
            method: 'DELETE',
            headers: withAuthHeaders(),
        }).then(handleResponse),

    updateProduct: (id, data) => {
        const payload = {
            ...buildProductPayload(data),
            id: parseIntegerField(id),
        };
        // CORRIGIDO: Adicionado /AlterProd/
        return fetch(`${PRODUCTS_API_URL}/AlterProd/${id}`, {
            method: 'PUT',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(payload),
        }).then(handleResponse);
    },

    moveProductsBatch: (data) =>
        // CORRIGIDO: Alterado para /MoveBatch
        fetch(`${PRODUCTS_API_URL}/MoveBatch`, {
            method: 'PUT',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        }).then(handleResponse),

    uploadProductsCsv: (storeId, file) => {
        const normalizedStoreId = parseIntegerField(storeId);
        if (!normalizedStoreId) {
            return Promise.reject(new Error('A loja do lojista e obrigatoria para importar CSV.'));
        }

        if (!(file instanceof File)) {
            return Promise.reject(new Error('Selecione um ficheiro CSV valido antes de importar.'));
        }

        const formData = new FormData();
        formData.append('file', file);

        return fetch(`${PRODUCTS_API_URL}/csv${toQueryString({ storeId: normalizedStoreId })}`, {
            method: 'POST',
            headers: withoutContentType(withAuthHeaders()),
            body: formData,
        }).then(handleResponse);
    },
        
    updateCorredor: (id, data) =>
        fetch(`${API_URL}/corredores/${id}`, {
            method: 'PUT',
            headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(data),
        }).then(handleResponse),

    uploadStoreLogo: (storeId, file) => {
        const normalizedStoreId = parseIntegerField(storeId);
        if (!normalizedStoreId) {
            return Promise.reject(new Error('A loja é obrigatória para fazer upload do logótipo.'));
        }
        if (!(file instanceof File)) {
            return Promise.reject(new Error('Selecione um ficheiro de imagem válido.'));
        }

        const formData = new FormData();
        formData.append('logo', file);

        // Seguir o padrão do uploadProductsCsv:
        // apagar explicitamente o Content-Type para o browser definir o boundary do multipart.
        return fetch(`${API_URL}/stores/${normalizedStoreId}/logo`, {
            method: 'POST',
            headers: withoutContentType(withAuthHeaders()),
            body: formData,
        }).then(handleResponse);
    },
};
